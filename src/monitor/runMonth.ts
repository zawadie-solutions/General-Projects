import type { AsanaClient } from "../asana/client";
import type { AsanaSettings } from "../asana/sync";
import { syncAsana } from "../asana/sync";
import type { ReviewRepo } from "../db/repo";
import { buildRemovalMessage } from "../notify/message";
import type { Notifier, ReviewChecker, ReviewRow } from "../types";
import { checkWithConfirmation } from "./cycle";

const sleep = (ms: number) => (ms > 0 ? new Promise((r) => setTimeout(r, ms)) : Promise.resolve());

export interface RunMonthResult {
  tasksScanned: number;
  reviewsFound: number;
  checked: number;
  removed: number;
  unknown: number;
  /** False when Google credentials weren't configured — the sync ran but nothing was checked. */
  checkedGoogle: boolean;
  notified: boolean;
}

/**
 * Syncs one Asana project (one month) and checks each of its reviews against Google (if a
 * checker is given) — shared by the `check-month` CLI and the dashboard's "Run now" button,
 * so both behave identically. Pass `notifier: null` to skip notifying on removals (e.g. a
 * quiet historical look-back); pass a real notifier to behave like the live daily job.
 *
 * `retireAfterRun: true` takes every review this run touched out of the daily automated
 * cycle afterward — for a historical month that isn't meant to be checked again tomorrow.
 * Pass `false` for the current month (e.g. running today's check early): those reviews
 * should stay monitored, not get silently dropped from the next 07:00 run.
 */
export async function runMonthCheck(opts: {
  projectGid: string;
  client: AsanaClient;
  asanaSettings: AsanaSettings;
  repo: ReviewRepo;
  checker: ReviewChecker | null;
  notifier: Notifier | null;
  checkDelayMs: number;
  removalRecheckDelayMs: number;
  retireAfterRun: boolean;
  onProgress?: (msg: string) => void;
}): Promise<RunMonthResult> {
  const log = opts.onProgress ?? (() => {});
  log("Syncing...");
  const sync = await syncAsana(opts.client, opts.repo, { ...opts.asanaSettings, projectGid: opts.projectGid });
  log(`Synced ${sync.reviewsFound} review tasks (${sync.created} new).`);

  const rows = await opts.repo.listByAsanaTaskIds(sync.taskIds);
  const touchedIds = rows.map((r) => r.id);

  if (!opts.checker) {
    if (opts.retireAfterRun) await opts.repo.setMonitoringActive(touchedIds, false);
    return { tasksScanned: sync.tasksScanned, reviewsFound: sync.reviewsFound, checked: 0, removed: 0, unknown: 0, checkedGoogle: false, notified: false };
  }

  log(`Checking ${rows.length} reviews against Google...`);
  const removed: ReviewRow[] = [];
  let unknown = 0;
  for (const [i, row] of rows.entries()) {
    const result = await checkWithConfirmation({ checker: opts.checker, removalRecheckDelayMs: opts.removalRecheckDelayMs }, row);
    await opts.repo.recordCheck(row, result);
    if (result.status === "REVIEW_REMOVED") removed.push(row);
    if (result.status === "UNKNOWN") unknown++;
    if ((i + 1) % 50 === 0) log(`...${i + 1}/${rows.length}`);
    await sleep(opts.checkDelayMs);
  }

  if (opts.retireAfterRun) await opts.repo.setMonitoringActive(touchedIds, false);

  let notified = false;
  if (removed.length && opts.notifier) {
    await opts.notifier.send(buildRemovalMessage(removed));
    notified = true;
  }

  return {
    tasksScanned: sync.tasksScanned,
    reviewsFound: sync.reviewsFound,
    checked: rows.length,
    removed: removed.length,
    unknown,
    checkedGoogle: true,
    notified,
  };
}
