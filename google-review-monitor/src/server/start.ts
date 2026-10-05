import { config } from "../config";
import type { ReviewRepo } from "../db/repo";
import { logger } from "../logger";
import { createApp } from "./app";

export function startDashboard(repo: ReviewRepo) {
  createApp({ repo, user: config.dashboardUser, password: config.dashboardPassword }).listen(config.port, () =>
    logger.info({ port: config.port }, "dashboard listening"),
  );
}
