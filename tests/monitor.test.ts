import { describe, expect, it } from "vitest";
import { syncAsana } from "../src/asana/sync";
import { BusinessProfileChecker } from "../src/google/businessProfileChecker";
import { runCycle } from "../src/monitor/cycle";
import { deps, fakeAsana, fakeChecker, fakeNotifier, makeRepo, review, settings } from "./helpers";

const EXISTS = { status: "REVIEW_EXISTS" } as const;
const REMOVED = { status: "REVIEW_REMOVED" } as const;
const UNKNOWN = { status: "UNKNOWN", reason: "google down" } as const;

async function setup(checker: ReturnType<typeof fakeChecker>, notifier = fakeNotifier()) {
  const { repo } = await makeRepo();
  await repo.upsertDiscovered(review());
  return { repo, notifier, d: deps(repo, checker, notifier) };
}

describe("monitor cycle", () => {
  it("existing review -> REVIEW_EXISTS, no notification", async () => {
    const { repo, notifier, d } = await setup(fakeChecker(EXISTS));
    await runCycle(d);
    expect((await repo.all())[0].status).toBe("REVIEW_EXISTS");
    expect(notifier.send).not.toHaveBeenCalled();
  });

  it("removed review -> REVIEW_REMOVED, exactly one notification, then stops being checked", async () => {
    const { repo, notifier, d } = await setup(fakeChecker(REMOVED));
    await runCycle(d);
    const row = (await repo.all())[0];
    expect(row.status).toBe("REVIEW_REMOVED");
    expect(row.notification_sent).toBe(true);
    expect(row.removed_at).not.toBeNull();
    expect(row.monitoring_active).toBe(false);
    expect(notifier.send).toHaveBeenCalledTimes(1);
  });

  it("Google unavailable -> UNKNOWN, no notification", async () => {
    const { repo, notifier, d } = await setup(fakeChecker(UNKNOWN));
    await runCycle(d);
    const row = (await repo.all())[0];
    expect(row.status).toBe("UNKNOWN");
    expect(row.last_error).toBe("google down");
    expect(notifier.send).not.toHaveBeenCalled();
  });

  it("a checker that throws is treated as UNKNOWN", async () => {
    const { repo, notifier, d } = await setup(fakeChecker(EXISTS));
    d.checker = { checkReview: async () => { throw new Error("boom"); } };
    await runCycle(d);
    expect((await repo.all())[0].status).toBe("UNKNOWN");
    expect(notifier.send).not.toHaveBeenCalled();
  });

  it("removal that is not confirmed by the re-check is not accepted", async () => {
    const { repo, notifier, d } = await setup(fakeChecker(REMOVED, UNKNOWN));
    await runCycle(d);
    expect((await repo.all())[0].status).toBe("UNKNOWN");
    expect(notifier.send).not.toHaveBeenCalled();
  });

  it("running the same removed review repeatedly sends only one notification", async () => {
    const { notifier, d } = await setup(fakeChecker(REMOVED));
    d.keepCheckingRemoved = true; // even if still being checked
    await runCycle(d);
    await runCycle(d);
    await runCycle(d);
    expect(notifier.send).toHaveBeenCalledTimes(1);
  });

  it("notification failure keeps notification_sent=false and retries next run", async () => {
    const { repo, notifier, d } = await setup(fakeChecker(REMOVED), fakeNotifier(1));
    await runCycle(d);
    let row = (await repo.all())[0];
    expect(row.notification_sent).toBe(false);
    expect(row.last_notification_error).toBe("smtp down");
    await runCycle(d);
    row = (await repo.all())[0];
    expect(row.notification_sent).toBe(true);
    expect(notifier.send).toHaveBeenCalledTimes(2);
  });

  it("a reappearing review resets notification state so a later removal notifies again", async () => {
    const { repo, notifier, d } = await setup(fakeChecker(REMOVED, REMOVED, EXISTS, REMOVED, REMOVED));
    d.keepCheckingRemoved = true;
    await runCycle(d); // removed + notify
    await runCycle(d); // exists again
    expect((await repo.all())[0].notification_sent).toBe(false);
    await runCycle(d); // removed again
    expect(notifier.send).toHaveBeenCalledTimes(2);
  });

  it("records check history", async () => {
    const { repo, d } = await setup(fakeChecker(EXISTS));
    await runCycle(d);
    await runCycle(d);
    const id = (await repo.all())[0].id;
    expect(await repo.history(id)).toHaveLength(2);
  });
});

describe("asana sync", () => {
  const notes = (u: string) => `Reviewer: Mary Jones\nRating: 2 stars\n${u}`;
  const url = "https://www.google.com/maps/reviews/data=!4m8";

  it("new Asana task is discovered and added to monitoring", async () => {
    const { repo } = await makeRepo();
    const tree = [{ month: "October", location: "Location A", reviews: [{ gid: "1", name: "r1", notes: notes(url) }] }];
    expect((await syncAsana(fakeAsana(tree), repo, settings)).created).toBe(1);
    tree[0].reviews.push({ gid: "2", name: "r2", notes: notes(url + "2") });
    tree[0].reviews.push({ gid: "3", name: "no link", notes: "nothing here" });
    expect((await syncAsana(fakeAsana(tree), repo, settings)).created).toBe(1);
    const rows = await repo.all();
    expect(rows).toHaveLength(2);
    expect(rows[0]).toMatchObject({ month: "October", location: "Location A", reviewer_name: "Mary Jones", rating: 2 });
  });

  it("Asana failure leaves existing records intact", async () => {
    const { repo } = await makeRepo();
    await repo.upsertDiscovered(review());
    const broken = { ...fakeAsana([]), sections: async () => { throw new Error("asana 500"); } };
    await expect(syncAsana(broken, repo, settings)).rejects.toThrow("asana 500");
    expect(await repo.all()).toHaveLength(1);

    // and the cycle survives it: check + notify still run
    const d = deps(repo, fakeChecker(EXISTS), fakeNotifier(), broken.sections as never);
    await runCycle(d);
    expect((await repo.all())[0].status).toBe("REVIEW_EXISTS");
  });
});

describe("BusinessProfileChecker", () => {
  const base = review();
  const input = { id: 1, googleReviewUrl: base.googleReviewUrl, location: "Location A", reviewerName: "John Smith", rating: 1 };
  const auth = { getAccessToken: async () => "t" };
  const locationMap = { "location a": "accounts/1/locations/2" };
  const listing = (names: string[], total = names.length) =>
    async () => new Response(JSON.stringify({ reviews: names.map((n) => ({ reviewer: { displayName: n } })), totalReviewCount: total }));
  const checker = (fetchImpl: typeof fetch) => new BusinessProfileChecker({ auth, locationMap, fetchImpl, cacheMs: 0 });

  it("reviewer present -> EXISTS", async () => {
    expect(await checker(listing(["Mary", "john  SMITH"]) as never).checkReview(input)).toEqual(EXISTS);
  });
  it("complete listing without reviewer -> REMOVED", async () => {
    expect(await checker(listing(["Mary"]) as never).checkReview(input)).toEqual(REMOVED);
  });
  it("HTTP error / rate limit -> UNKNOWN", async () => {
    for (const status of [401, 403, 429, 500]) {
      const r = await checker((async () => new Response("", { status })) as never).checkReview(input);
      expect(r.status).toBe("UNKNOWN");
    }
  });
  it("network failure -> UNKNOWN", async () => {
    const r = await checker((async () => { throw new Error("ETIMEDOUT"); }) as never).checkReview(input);
    expect(r.status).toBe("UNKNOWN");
  });
  it("incomplete listing -> UNKNOWN (never REMOVED)", async () => {
    expect((await checker(listing(["Mary"], 5) as never).checkReview(input)).status).toBe("UNKNOWN");
  });
  it("invalid URL, unknown location, missing reviewer -> UNKNOWN", async () => {
    const c = checker(listing([]) as never);
    expect((await c.checkReview({ ...input, googleReviewUrl: "not a url" })).status).toBe("UNKNOWN");
    expect((await c.checkReview({ ...input, googleReviewUrl: "https://evil.example/maps" })).status).toBe("UNKNOWN");
    expect((await c.checkReview({ ...input, location: "Nowhere" })).status).toBe("UNKNOWN");
    expect((await c.checkReview({ ...input, reviewerName: null })).status).toBe("UNKNOWN");
  });
});
