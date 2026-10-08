import { migrate } from "../db/db";
import { runCycle } from "../monitor/cycle";
import { buildDeps } from "../wiring";

const { db, deps } = buildDeps();
await migrate(db);
const r = await runCycle(deps);
await db.end();
process.exit(r.ok ? 0 : 1);
