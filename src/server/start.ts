import { AsanaClient } from "../asana/client";
import { config } from "../config";
import type { ReviewRepo } from "../db/repo";
import { PlacesChecker } from "../google/placesChecker";
import { logger } from "../logger";
import { buildChecker, buildNotifier } from "../wiring";
import { createApp, type MonthRunnerOpts } from "./app";

/** Asana is needed for the month picker / "Run now" button; Google/Slack creds are optional
 *  and only checked when a run actually happens (see MonthRunnerOpts in app.ts). */
function buildMonthRunner(): MonthRunnerOpts | undefined {
  try {
    const a = config.asana();
    return {
      client: new AsanaClient(a.token),
      asanaSettings: a,
      buildChecker,
      buildNotifier,
      checkDelayMs: config.checkDelayMs,
      removalRecheckDelayMs: config.removalRecheckDelayMs,
    };
  } catch (e) {
    logger.warn({ err: (e as Error).message }, "Asana not configured; dashboard will run without the month picker / Run now button");
    return undefined;
  }
}

function buildPlaceReviewsLoader() {
  try {
    const places = new PlacesChecker(config.places());
    return (location: string, reviewUrls: string[]) => places.placeReviews(location, reviewUrls);
  } catch {
    return undefined; // no Places API key: the dashboard says so when the button is used
  }
}

export async function startDashboard(repo: ReviewRepo) {
  const cleared = await repo.clearInterruptedRuns();
  if (cleared) logger.warn({ cleared }, "cleared runs left marked as running by a previous shutdown");
  createApp({
    repo,
    user: config.dashboardUser,
    password: config.dashboardPassword,
    scheduleCron: config.scheduleCron,
    timezone: config.timezone,
    monthRunner: buildMonthRunner(),
    loadPlaceReviews: buildPlaceReviewsLoader(),
  }).listen(config.port, () => logger.info({ port: config.port }, "dashboard listening"));
}
