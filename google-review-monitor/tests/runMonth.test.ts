import { describe, expect, it } from "vitest";
import type { AsanaClient } from "../src/asana/client";
import { syncAsana } from "../src/asana/sync";
import { type RunProgress, runMonthCheck } from "../src/monitor/runMonth";
import { buildRemovalMessage } from "../src/notify/message";
import { workedOnBy } from "../src/types";
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

describe("who is working on a dispute (from Asana)", () => {
  const people = fakeAsana([
    {
      month: "October",
      location: "Location A",
      assignee: "Lena Fischer",
      reviews: [
        { gid: "a1", name: "a1", notes: link(1), assignee: "Priya Nair" },
        { gid: "a2", name: "a2", notes: link(2) },
      ],
    },
    { month: "October", location: "Location B", reviews: [{ gid: "b1", name: "b1", notes: link(3) }] },
  ]) as unknown as AsanaClient;

  it("sync stores the dispute's assignee and the location's assignee, and a re-sync picks up a change", async () => {
    const { repo } = await makeRepo();
    await syncAsana(people, repo, settings);
    const by = new Map((await repo.all()).map((r) => [r.asana_task_id, r]));
    expect([by.get("a1")?.assignee_name, by.get("a1")?.location_assignee_name]).toEqual(["Priya Nair", "Lena Fischer"]);
    expect([by.get("a2")?.assignee_name, by.get("a2")?.location_assignee_name]).toEqual([null, "Lena Fischer"]);
    expect([by.get("b1")?.assignee_name, by.get("b1")?.location_assignee_name]).toEqual([null, null]);
    expect([workedOnBy(by.get("a1")!), workedOnBy(by.get("a2")!), workedOnBy(by.get("b1")!)]).toEqual(["Priya Nair", "Lena Fischer", null]);

    const reassigned = fakeAsana([{ month: "October", location: "Location A", assignee: "Omar Haddad", reviews: [{ gid: "a2", name: "a2", notes: link(2) }] }]) as unknown as AsanaClient;
    await syncAsana(reassigned, repo, settings);
    expect((await repo.all()).find((r) => r.asana_task_id === "a2")?.location_assignee_name).toBe("Omar Haddad");
  });

  it("the removal alert names who is working on each dispute", async () => {
    const { repo } = await makeRepo();
    await syncAsana(people, repo, settings);
    const msg = buildRemovalMessage(await repo.all());
    expect(msg.text).toContain("Worked on by: Priya Nair");
    expect(msg.text).toContain("Worked on by: Lena Fischer");
    expect(msg.text).toContain("Worked on by: nobody assigned in Asana");
    expect(msg.html).toContain("<b>Worked on by:</b> Priya Nair");
  });
});
