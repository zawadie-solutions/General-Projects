import cron from "node-cron";
import { config } from "./config";
import { migrate } from "./db/db";
import { logger } from "./logger";
import { runCycle } from "./monitor/cycle";
import { startDashboard } from "./server/start";
import { buildDeps } from "./wiring";

const { db, repo, deps } = buildDeps();
await migrate(db);

if (!cron.validate(config.scheduleCron)) throw new Error(`Invalid SCHEDULE_CRON: ${config.scheduleCron}`);
cron.schedule(config.scheduleCron, () => void runCycle(deps).catch((e) => logger.error({ err: e.message }, "cycle crashed")), {
  timezone: config.timezone,
});
logger.info({ schedule: config.scheduleCron, timezone: config.timezone }, "review monitor scheduled");

startDashboard(repo);
