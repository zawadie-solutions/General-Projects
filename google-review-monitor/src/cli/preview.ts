// Dashboard preview with fake data in an in-memory database. Does not touch the real DB or any API.
import { newDb } from "pg-mem";
import type { Db } from "../db/db";
import { migrate } from "../db/db";
import { ReviewRepo } from "../db/repo";
import { createApp } from "../server/app";

const { Pool } = newDb().adapters.createPg();
const db = new Pool() as unknown as Db;
await migrate(db);
const repo = new ReviewRepo(db);

const people = ["John Smith", "Mary Jones", "Robert Lee", "Amina Yusuf", "Peter Kamau", "Sarah Wilson", "David Otieno", "Grace Wanjiru"];
const texts = [
  "Terrible service, waited over an hour and nobody apologised. Would not recommend.",
  "Rude staff and the place was dirty.",
  "Overcharged me and refused a refund.",
  "Not what was advertised.",
  "Never again.",
  "Slow and disorganised.",
  "Manager was dismissive when I raised a problem.",
  "Food arrived cold.",
];
const locations = ["Location A", "Location B", "Location C"];
const months = ["September", "October"];
const projectGids = ["demo-sep-project", "demo-oct-project"];

for (const [i, name] of people.entries()) {
  await repo.upsertDiscovered({
    asanaTaskId: String(1000 + i),
    asanaTaskName: `Review by ${name}`,
    asanaTaskUrl: `https://app.asana.com/0/1/${1000 + i}`,
    asanaProjectGid: projectGids[i % 2],
    location: locations[i % 3],
    month: months[i % 2],
    reviewerName: name,
    rating: (i % 5) + 1,
    reviewText: texts[i],
    googleReviewUrl: `https://www.google.com/maps/reviews/data=!4m8!${i}`,
  });
}

const all = await repo.listToCheck();
for (const [i, r] of all.entries()) {
  await repo.recordCheck(r, { status: "REVIEW_EXISTS" });
  if (i < 2) await repo.recordCheck(r, { status: "REVIEW_REMOVED" });
  if (i === 2) await repo.recordCheck(r, { status: "UNKNOWN", reason: "Google rate limited (HTTP 429)" });
}
await repo.markNotified([all[0].id], true); // first removal notified, second still pending

// Spread history rows over a few days so "Recent activity" has more than just today in the demo.
const { rows: historyRows } = await db.query<{ id: number }>("SELECT id FROM review_check_history ORDER BY id");
for (const [i, row] of historyRows.entries()) {
  const daysAgo = i % 3;
  if (daysAgo > 0) await db.query(`UPDATE review_check_history SET checked_at = now() - INTERVAL '${daysAgo} days' WHERE id = $1`, [row.id]);
}

createApp({ repo, user: "demo", password: "demo", scheduleCron: "0 7 * * *", timezone: "Africa/Maputo" }).listen(3100, () =>
  console.log("Preview at http://localhost:3100  (login: demo / demo)"),
);
