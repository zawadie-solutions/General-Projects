import { describe, expect, it } from "vitest";
import type { AsanaClient } from "../src/asana/client";
import { type RunProgress, runMonthCheck } from "../src/monitor/runMonth";
import { fakeAsana, fakeChecker, fakeNotifier, makeRepo, settings } from "./helpers";

const EXISTS = { status: "REVIEW_EXISTS" } as const;
const REMOVED = { status: "REVIEW_REMOVED" } as const;
const link = (n: number) => `Reviewer: R${n}\nhttps://maps.app.goo.gl/abc${n}`;

/** Two locations, deliberately out of alphabetical order in Asana: B (2 reviews) then A (1 review). */
const tree = fakeAsana([
  { month: "October", location: "Location B", reviews: [{ gid: "b1", name: "b1", notes: link(1) }, { gid: "b2", name: "b2", notes: link(2) }] },
  { month: "October", location: "Location A", reviews: [{ gid: "a1", name: "a1", notes: link(3) }] },
]) as unknown as AsanaClient;

async function run(over: Partial<Parameters<typeof runMonthCheck>[0]> = {}) {
  const { repo } = await makeRepo();
  const notifier = fakeNotifier();
  const states: RunProgress[] = [];
  const result = await runMonthCheck({
    projectGid: "p1",
    client: tree,
    asanaSettings: settings,
    repo,
    checker: fakeChecker(EXISTS),
    notifier,
    checkDelayMs: 0,
    removalRecheckDelayMs: 0,
    retireAfterRun: true,
    onState: (p) => states.push(p),
    ...over,
  });
  return { repo, notifier, states, result };
}

describe("runMonthCheck progress and cancel", () => {
  it("reports syncing, then each location in alphabetical order with what is already done", async () => {
    const { states, result } = await run();
    expect(result).toMatchObject({ checked: 3, cancelled: false });
    expect(states[0]).toMatchObject({ phase: "syncing", location: null });
    const checking = states.filter((s) => s.phase === "checking");
    expect(checking.map((s) => [s.location, s.reviewsDone, s.doneLocations])).toEqual([
      ["Location A", 0, []],
      ["Location B", 1, ["Location A"]],
      ["Location B", 2, ["Location A"]],
    ]);
    expect(checking[0]).toMatchObject({ totalLocations: 2, reviewsTotal: 3 });
  });

  it("cancel stops before the next review, keeps what was checked, and neither retires nor notifies", async () => {
    let seen = 0;
    const { repo, notifier, result } = await run({
      checker: fakeChecker(REMOVED),
      isCancelled: () => seen++ >= 1, // allow one review, then cancel
    });
    expect(result).toMatchObject({ checked: 1, removed: 1, cancelled: true, notified: false });
    expect(notifier.send).not.toHaveBeenCalled();
    const rows = await repo.all();
    expect(rows.filter((r) => r.status === "REVIEW_REMOVED").length).toBe(1);
    expect(rows.every((r) => r.monitoring_active)).toBe(true);
  });

  it("without a cancel, a finished run still retires and notifies as before", async () => {
    const { repo, notifier, result } = await run({ checker: fakeChecker(REMOVED) });
    expect(result).toMatchObject({ checked: 3, removed: 3, cancelled: false, notified: true });
    expect(notifier.send).toHaveBeenCalledTimes(1);
    expect((await repo.all()).every((r) => !r.monitoring_active)).toBe(true);
  });
});
