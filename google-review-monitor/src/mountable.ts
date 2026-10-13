// Entry point for embedding this app into another process (the Zawadie Hub,
// see hub-server/apps-bridge.js) instead of running it standalone. Does the
// same one-time setup as index.ts (db migrate, cron schedule) but returns
// the dashboard's Express app instead of also calling .listen() on it, since
// the embedding process owns the single port Hostinger assigns.
import cron from "node-cron";
import { config } from "./config";
import { migrate } from "./db/db";
import { logger } from "./logger";
import { runCycle } from "./monitor/cycle";
import { buildDashboardApp } from "./server/start";
import { buildDeps } from "./wiring";

export async function createMountedApp() {
  const { db, repo, deps } = buildDeps();
  await migrate(db);

  if (!cron.validate(config.scheduleCron)) throw new Error(`Invalid SCHEDULE_CRON: ${config.scheduleCron}`);
  cron.schedule(config.scheduleCron, () => void runCycle(deps).catch((e) => logger.error({ err: e.message }, "cycle crashed")), {
    timezone: config.timezone,
  });
  logger.info({ schedule: config.scheduleCron, timezone: config.timezone }, "review monitor scheduled");

  return buildDashboardApp(repo);
}
