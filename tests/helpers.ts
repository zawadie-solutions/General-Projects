import { newDb } from "pg-mem";
import { vi } from "vitest";
import type { AsanaSettings, AsanaSource } from "../src/asana/sync";
import type { Db } from "../src/db/db";
import { migrate } from "../src/db/db";
import { ReviewRepo } from "../src/db/repo";
import type { CycleDeps } from "../src/monitor/cycle";
import type { CheckResult, DiscoveredReview, Notifier, ReviewChecker } from "../src/types";

export async function makeRepo() {
  const { Pool } = newDb().adapters.createPg();
  const db = new Pool() as unknown as Db;
  await migrate(db);
  return { db, repo: new ReviewRepo(db) };
}

export const review = (over: Partial<DiscoveredReview> = {}): DiscoveredReview => ({
  asanaTaskId: "100",
  asanaTaskName: "Review by John Smith",
  asanaTaskUrl: "https://app.asana.com/0/1/100",
  asanaProjectGid: "p1",
  location: "Location A",
  month: "October",
  reviewerName: "John Smith",
  rating: 1,
  reviewText: "Terrible service, would not recommend.",
  googleReviewUrl: "https://www.google.com/maps/reviews/data=!4m8!14m7!1m6",
  ...over,
});

export function fakeChecker(...results: CheckResult[]): ReviewChecker & { calls: number } {
  const c = {
    calls: 0,
    async checkReview() {
      const r = results[Math.min(c.calls, results.length - 1)];
      c.calls++;
      return r;
    },
  };
  return c;
}

export function fakeNotifier(failTimes = 0) {
  const send = vi.fn(async () => {
    if (send.mock.calls.length <= failTimes) throw new Error("smtp down");
  });
  return { send } as Notifier & { send: typeof send };
}

export function deps(repo: ReviewRepo, checker: ReviewChecker, notifier: Notifier, sync = async () => ({})): CycleDeps {
  return {
    repo,
    checker,
    notifier,
    sync,
    removalRecheckDelayMs: 0,
    checkDelayMs: 0,
    keepCheckingRemoved: false,
  };
}

export const settings: AsanaSettings = {
  projectGid: "p1",
  monthIndex: 0,
  locationIndex: 1,
  maxDepth: 3,
  includeCompleted: true,
  reviewerFromTitle: false,
};

export function fakeAsana(tree: { month: string; location: string; reviews: { gid: string; name: string; notes: string }[] }[]): AsanaSource {
  return {
    sections: async () => tree.map((t, i) => ({ gid: `s${i}`, name: t.month })),
    sectionTasks: async (sid) => {
      const t = tree[Number(sid.slice(1))];
      return [{ gid: `loc-${sid}`, name: t.location, num_subtasks: t.reviews.length }];
    },
    subtasks: async (gid) => {
      const t = tree[Number(gid.replace("loc-s", ""))];
      return t.reviews.map((r) => ({ ...r, permalink_url: `https://app.asana.com/0/1/${r.gid}` }));
    },
  };
}
