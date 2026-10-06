// Asana sync only: fills the DB with review tasks. No Google check, no email.
import { AsanaClient } from "../asana/client";
import { syncAsana } from "../asana/sync";
import { config } from "../config";
import { createDb, migrate } from "../db/db";
import { ReviewRepo } from "../db/repo";

const a = config.asana();
const db = createDb();
await migrate(db);
console.log(await syncAsana(new AsanaClient(a.token), new ReviewRepo(db), a));
await db.end();
