import { AsanaClient } from "./asana/client";
import { syncAsana } from "./asana/sync";
import { config } from "./config";
import { createDb } from "./db/db";
import { ReviewRepo } from "./db/repo";
import { BusinessProfileChecker, loadLocationMap, OAuthRefreshTokenProvider } from "./google/businessProfileChecker";
import type { CycleDeps } from "./monitor/cycle";
import { EmailNotifier } from "./notify/email";
import { SlackDmNotifier } from "./notify/slack";
import type { Notifier } from "./types";

export function buildChecker() {
  const g = config.google();
  return new BusinessProfileChecker({
    auth: new OAuthRefreshTokenProvider(g),
    locationMap: loadLocationMap(g.locationsFile),
  });
}

export function buildNotifier(): Notifier {
  return config.slackEnabled ? new SlackDmNotifier(config.slack()) : new EmailNotifier(config.email());
}

export function buildDeps(): { db: ReturnType<typeof createDb>; repo: ReviewRepo; deps: CycleDeps } {
  const db = createDb();
  const repo = new ReviewRepo(db);
  const a = config.asana();
  const client = new AsanaClient(a.token);
  const deps: CycleDeps = {
    repo,
    checker: buildChecker(),
    notifier: buildNotifier(),
    sync: () => syncAsana(client, repo, a),
    removalRecheckDelayMs: config.removalRecheckDelayMs,
    checkDelayMs: config.checkDelayMs,
    keepCheckingRemoved: config.keepCheckingRemoved,
  };
  return { db, repo, deps };
}
