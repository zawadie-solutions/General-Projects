import type { AsanaConfig } from "../config";
import type { ReviewRepo } from "../db/repo";
import { logger } from "../logger";
import type { DiscoveredReview } from "../types";
import type { AsanaClient, AsanaTask } from "./client";
import { parseRating, parseReviewerName, parseReviewText, pickGoogleReviewUrl } from "./extract";

export type AsanaSource = Pick<AsanaClient, "sections" | "sectionTasks" | "subtasks">;
export type AsanaSettings = Pick<
  AsanaConfig,
  "projectGid" | "monthIndex" | "locationIndex" | "maxDepth" | "includeCompleted" | "reviewerFromTitle"
>;

export interface WalkedTask {
  task: AsanaTask;
  /** Names from the root: [section, ancestor task, ..., this task] */
  path: string[];
}

/** Walk every task (and subtasks, to maxDepth) in the project, remembering the name path. */
export async function walkProject(client: AsanaSource, s: AsanaSettings): Promise<WalkedTask[]> {
  const out: WalkedTask[] = [];
  const visit = async (task: AsanaTask, path: string[], depth: number) => {
    out.push({ task, path });
    if (depth < s.maxDepth && (task.num_subtasks ?? 0) > 0) {
      for (const sub of await client.subtasks(task.gid)) await visit(sub, [...path, sub.name], depth + 1);
    }
  };
  for (const section of await client.sections(s.projectGid)) {
    for (const task of await client.sectionTasks(section.gid)) {
      await visit(task, [section.name, task.name], 1);
    }
  }
  return out;
}

/** Any task whose description holds a Google review link is a review task. */
export function toDiscovered(w: WalkedTask, s: AsanaSettings): DiscoveredReview | null {
  const { task, path } = w;
  if (!s.includeCompleted && task.completed) return null;
  const url = pickGoogleReviewUrl(task.notes, task.html_notes);
  if (!url) return null;
  const ancestors = path.slice(0, -1);
  return {
    asanaTaskId: task.gid,
    asanaTaskName: task.name,
    asanaTaskUrl: task.permalink_url ?? `https://app.asana.com/0/0/${task.gid}`,
    month: path[s.monthIndex] && s.monthIndex < path.length - 1 ? path[s.monthIndex] : (ancestors[0] ?? null),
    location:
      path[s.locationIndex] && s.locationIndex < path.length - 1
        ? path[s.locationIndex]
        : (ancestors[ancestors.length - 1] ?? null),
    reviewerName: parseReviewerName(task.notes) ?? (s.reviewerFromTitle ? task.name : null),
    rating: parseRating(task.notes),
    reviewText: parseReviewText(task.notes),
    googleReviewUrl: url,
  };
}

export interface SyncSummary {
  tasksScanned: number;
  reviewsFound: number;
  created: number;
}

/**
 * Read everything from Asana first, then write. If Asana fails midway, an exception
 * propagates before any DB write, so existing records stay exactly as they were.
 */
export async function syncAsana(client: AsanaSource, repo: ReviewRepo, s: AsanaSettings): Promise<SyncSummary> {
  const walked = await walkProject(client, s);
  const reviews = walked.map((w) => toDiscovered(w, s)).filter((r): r is DiscoveredReview => r !== null);
  let created = 0;
  for (const r of reviews) if (await repo.upsertDiscovered(r)) created++;
  logger.info({ tasksScanned: walked.length, reviewsFound: reviews.length, created }, "asana sync done");
  return { tasksScanned: walked.length, reviewsFound: reviews.length, created };
}
