import { timingSafeEqual } from "node:crypto";
import { fileURLToPath } from "node:url";
import express from "express";
import type { AsanaClient } from "../asana/client";
import type { AsanaSettings } from "../asana/sync";
import type { ReviewRepo } from "../db/repo";
import type { AccountStatus } from "../google/accounts";
import type { PlaceReviews } from "../google/placesChecker";
import { logger } from "../logger";
import { checkWithConfirmation, prepareChecker } from "../monitor/cycle";
import { runMonthCheck, type RunProgress } from "../monitor/runMonth";
import type { RuntimeSettings } from "../settings";
import type { Notifier, ReviewChecker } from "../types";
import { dashboardHtml } from "./dashboard";
import { nextScheduledRun } from "./schedule";

const asset = (name: string) => fileURLToPath(new URL(`./assets/${name}`, import.meta.url));
const logoPath = asset("logo.png");
/** Logos shown on the links out to Google Maps and Asana. */
const linkLogos: Record<string, string> = { "google-maps.png": asset("google-maps.png"), "asana.png": asset("asana.png") };

/** Stored as the run's error so the dashboard can say "cancelled" instead of "failed". */
const CANCELLED = "cancelled";

function safeEqual(a: string, b: string): boolean {
  const x = Buffer.from(a);
  const y = Buffer.from(b);
  return x.length === y.length && timingSafeEqual(x, y);
}

/** Enables the month picker + "Run now" button. Omit to run dashboard-only (e.g. the demo preview). */
export interface MonthRunnerOpts {
  client: AsanaClient;
  asanaSettings: AsanaSettings;
  /** Throws if Google credentials aren't configured — caught and treated as "sync only". */
  buildChecker: (opts?: { fast?: boolean }) => ReviewChecker;
  /** Throws if no notifier is configured — caught and treated as "don't notify". */
  buildNotifier: () => Notifier;
  checkDelayMs: number;
  removalRecheckDelayMs: number;
}

/** What the Configure page shows. */
export interface ConfigView {
  settings: RuntimeSettings;
  overridden: boolean;
  sources: { id: string; label: string; configured: boolean }[];
  schedule: { cron: string; timezone: string; nextCheckAt: string | null };
  connections: { label: string; ok: boolean; detail: string }[];
}

/** Backs the Configure page. Omit to serve a dashboard without it (e.g. the demo preview). */
export interface ConfigStore {
  view(): Promise<ConfigView>;
  /** Validates and saves; throws an Error whose message can be shown to the user. */
  update(input: Record<string, unknown>, actor: string): Promise<{ changes: string[] }>;
  reset(actor: string): Promise<void>;
  accounts(): Promise<AccountStatus[]>;
  dailyCheckEnabled(): boolean;
}

/** Audit page filters -> the action prefixes they cover. */
const AUDIT_FILTERS: Record<string, string[]> = {
  checks: ["run.", "location.", "daily.", "google."],
  settings: ["settings."],
  system: ["system."],
};

const plural = (n: number, word: string) => `${n.toLocaleString("en-US")} ${word}${n === 1 ? "" : "s"}`;

/** Dashboard behind HTTP Basic auth: monitoring views, on-demand checks, the audit log and settings. */
export function createApp(opts: {
  repo: ReviewRepo;
  user: string;
  password: string;
  scheduleCron: string;
  timezone: string;
  monthRunner?: MonthRunnerOpts;
  /** Enables the "Load Google reviews" button. Omit when no reviews source key is configured. */
  loadPlaceReviews?: (location: string, reviewUrls: string[]) => Promise<PlaceReviews | null>;
  config?: ConfigStore;
}) {
  if (!opts.password) throw new Error("DASHBOARD_PASSWORD must be set; refusing to serve an open dashboard");
  const app = express();
  app.use(express.json());

  app.use((req, res, next) => {
    const [scheme, token] = (req.headers.authorization ?? "").split(" ");
    if (scheme === "Basic" && token) {
      const [u, ...rest] = Buffer.from(token, "base64").toString().split(":");
      if (safeEqual(u, opts.user) && safeEqual(rest.join(":"), opts.password)) return next();
    }
    res.set("WWW-Authenticate", 'Basic realm="Google Review Monitor"').status(401).send("Authentication required");
  });

  const api =
    (fn: (req: express.Request) => Promise<unknown>): express.RequestHandler =>
    async (req, res) => {
      try {
        res.json(await fn(req));
      } catch (e) {
        logger.error({ err: (e as Error).message, path: req.path }, "request failed");
        res.status(500).json({ error: "internal error" });
      }
    };

  /** The signed-in dashboard user (the request already passed the auth check above). */
  const actorOf = (req: express.Request): string => {
    const token = (req.headers.authorization ?? "").split(" ")[1] ?? "";
    return Buffer.from(token, "base64").toString().split(":")[0] || "unknown";
  };
  /** Writes to the audit log; a failure here must never break the action being recorded. */
  const audit = (actor: string, action: string, summary: string) =>
    opts.repo.addAudit({ actor, action, summary }).catch((e) => logger.error({ err: (e as Error).message, action }, "audit write failed"));
  const monthName = async (projectGid: string) => (await opts.repo.listAsanaProjects()).find((p) => p.project_gid === projectGid)?.display_name.trim() ?? projectGid;

  const projectGidParam = (req: express.Request): string | undefined => {
    const p = req.query.project;
    return typeof p === "string" && p ? p : undefined;
  };

  app.get("/", (_req, res) => res.type("html").send(dashboardHtml));
  app.get("/logo.png", (_req, res) => res.sendFile(logoPath));
  app.get("/assets/:name", (req, res) => {
    const file = linkLogos[req.params.name];
    if (file) res.sendFile(file);
    else res.status(404).send("Not found");
  });
  app.get(
    "/api/summary",
    api(async (req) => ({
      ...(await opts.repo.summary(projectGidParam(req))),
      nextCheckAt: opts.config && !opts.config.dailyCheckEnabled() ? null : (nextScheduledRun(opts.scheduleCron, opts.timezone)?.toISOString() ?? null),
    })),
  );
  app.get("/api/months", api(() => opts.repo.distinctProjects()));
  app.get("/api/removed", api((req) => opts.repo.removedReviews({ projectGid: projectGidParam(req) })));
  app.get("/api/locations", api((req) => opts.repo.locations(projectGidParam(req))));
  app.get(
    "/api/reviews",
    api((req) => {
      const l = req.query.location;
      return opts.repo.reviewsByLocation({ projectGid: projectGidParam(req), location: typeof l === "string" ? l : null });
    }),
  );
  app.get("/api/activity",api((req) => opts.repo.recentActivity({ projectGid: projectGidParam(req) })));

  app.get(
    "/api/audit",
    api(async (req) => {
      const before = Number(req.query.before);
      const filter = typeof req.query.filter === "string" ? AUDIT_FILTERS[req.query.filter] : undefined;
      const limit = 50;
      const rows = await opts.repo.listAudit({ limit: limit + 1, beforeId: Number.isInteger(before) && before > 0 ? before : undefined, prefixes: filter });
      return { entries: rows.slice(0, limit), more: rows.length > limit };
    }),
  );

  app.get("/api/config", api(async () => (opts.config ? { available: true, ...(await opts.config.view()) } : { available: false })));
  app.get("/api/accounts", api(async () => (opts.config ? opts.config.accounts() : [])));
  app.put(
    "/api/config",
    api(async (req) => {
      if (!opts.config) return { ok: false, reason: "settings cannot be changed in this environment" };
      try {
        const { changes } = await opts.config.update((req.body ?? {}) as Record<string, unknown>, actorOf(req));
        return { ok: true, changes, ...(await opts.config.view()) };
      } catch (e) {
        return { ok: false, reason: (e as Error).message };
      }
    }),
  );
  app.post(
    "/api/config/reset",
    api(async (req) => {
      if (!opts.config) return { ok: false, reason: "settings cannot be changed in this environment" };
      await opts.config.reset(actorOf(req));
      return { ok: true, ...(await opts.config.view()) };
    }),
  );

  // Every "<Month> Managed Disputes <Year>" project Asana knows about, synced or not, with run status.
  let workspaceGid: string | undefined;
  app.get(
    "/api/available-months",
    api(async () => {
      if (!opts.monthRunner) return [];
      const { client, asanaSettings } = opts.monthRunner;
      workspaceGid ??= await client.projectWorkspace(asanaSettings.projectGid);
      const [found, known] = await Promise.all([client.searchProjects(workspaceGid, "Managed Disputes"), opts.repo.listAsanaProjects()]);
      const knownByGid = new Map(known.map((k) => [k.project_gid, k]));
      return found
        .filter((p) => !p.archived && !/template/i.test(p.name))
        .map((p) => {
          const k = knownByGid.get(p.gid);
          return {
            projectGid: p.gid,
            name: p.name,
            lastSyncedAt: k?.last_synced_at ?? null,
            lastReviewCount: k?.last_review_count ?? null,
            runStatus: k?.run_status ?? "idle",
            lastRunError: k?.last_run_error ?? null,
          };
        });
    }),
  );

  // Runs live in this process, so their progress and cancel flags do too (lost on restart,
  // which is also when start.ts clears the 'running' marks they leave behind).
  const liveRuns = new Map<string, { progress: RunProgress | null; cancelRequested: boolean }>();

  app.get(
    "/api/run-progress",
    api(async (req) => {
      const run = liveRuns.get(projectGidParam(req) ?? "");
      return run ? { running: true, cancelRequested: run.cancelRequested, ...run.progress } : { running: false };
    }),
  );

  // Asks the run to stop after the review it is on. A month marked running with no live run
  // behind it (left over from a restart) is simply released.
  app.post(
    "/api/cancel-run",
    api(async (req) => {
      const projectGid = (req.body as { projectGid?: string })?.projectGid;
      if (!projectGid) throw new Error("projectGid required");
      const run = liveRuns.get(projectGid);
      if (run) run.cancelRequested = true;
      else await opts.repo.finishAsanaRun(projectGid, { ok: false, error: CANCELLED });
      await audit(actorOf(req), "run.cancel_requested", `Asked to cancel the check of ${await monthName(projectGid)}`);
      return { ok: true };
    }),
  );

  // Runs in the background; the response just confirms it started. The dashboard polls
  // /api/available-months for status. Always notifies on anything found removed, the same
  // as the live daily job would — this is "do the 07:00 run early", not a quiet look-back.
  app.post(
    "/api/run-month",
    api(async (req) => {
      if (!opts.monthRunner) return { started: false, reason: "not configured in this environment" };
      const body = req.body as { projectGid?: string; name?: string };
      if (!body?.projectGid) throw new Error("projectGid required");
      const { projectGid } = body;
      const displayName = body.name ?? projectGid;

      const claimed = await opts.repo.tryStartAsanaRun(projectGid, displayName);
      if (!claimed) return { started: false, reason: "already running" };

      const runner = opts.monthRunner;
      const actor = actorOf(req);
      const month = displayName.trim();
      const live: { progress: RunProgress | null; cancelRequested: boolean } = { progress: null, cancelRequested: false };
      liveRuns.set(projectGid, live);
      await audit(actor, "run.started", `Started a check of ${month}`);
      void (async () => {
        let checker: ReviewChecker | null = null;
        try {
          checker = runner.buildChecker();
        } catch {
          // Google not configured: sync only.
        }
        let notifier: Notifier | null = null;
        try {
          notifier = runner.buildNotifier();
        } catch {
          // No notifier configured: don't notify.
        }
        try {
          const result = await runMonthCheck({
            projectGid,
            client: runner.client,
            asanaSettings: runner.asanaSettings,
            repo: opts.repo,
            checker,
            notifier,
            checkDelayMs: runner.checkDelayMs,
            removalRecheckDelayMs: runner.removalRecheckDelayMs,
            retireAfterRun: projectGid !== runner.asanaSettings.projectGid,
            onState: (p) => (live.progress = p),
            isCancelled: () => live.cancelRequested,
          });
          await opts.repo.finishAsanaRun(projectGid, result.cancelled ? { ok: false, error: CANCELLED } : { ok: true, reviewCount: result.reviewsFound });
          const counts = `${plural(result.checked, "review")} checked, ${result.removed.toLocaleString("en-US")} removed, ${result.unknown.toLocaleString("en-US")} could not be checked`;
          if (result.cancelled) await audit(actor, "run.cancelled", `Check of ${month} cancelled part-way: ${counts}`);
          else if (!result.checkedGoogle) await audit(actor, "run.finished", `Synced ${month} from Asana (${plural(result.reviewsFound, "review")}); no review source is set up, so nothing was checked`);
          else await audit(actor, "run.finished", `Check of ${month} finished: ${counts}${result.notified ? "; removal alert sent" : ""}`);
        } catch (e) {
          logger.error({ err: (e as Error).message, projectGid }, "run-month failed");
          await opts.repo.finishAsanaRun(projectGid, { ok: false, error: (e as Error).message }).catch(() => {});
          await audit(actor, "run.failed", `Check of ${month} failed: ${(e as Error).message}`);
        } finally {
          liveRuns.delete(projectGid);
        }
      })();

      return { started: true };
    }),
  );

  // Display only: the reviews Google currently shows for the selected location. Reads the
  // location's Asana links to identify the place; writes nothing.
  app.get(
    "/api/places-reviews",
    api(async (req) => {
      if (!opts.loadPlaceReviews) return { ok: false, reason: "no key is configured for the reviews source set in REVIEW_CHECKER" };
      const location = req.query.location;
      if (typeof location !== "string" || !location) return { ok: false, reason: "this location has no name to search for" };
      const rows = await opts.repo.reviewsByLocation({ projectGid: projectGidParam(req), location });
      try {
        const place = await opts.loadPlaceReviews(location, rows.map((r) => r.google_review_url));
        if (place) await audit(actorOf(req), "google.loaded", `Loaded the latest Google reviews for ${location}`);
        return place ? { ok: true, place } : { ok: false, reason: "could not find this business on Google" };
      } catch (e) {
        return { ok: false, reason: (e as Error).message };
      }
    }),
  );

  // Checks just one location's reviews for the selected month and answers when done. Does not
  // notify by itself: a removal it records is picked up by the next daily run like any other.
  const checkingLocations = new Set<string>();
  app.post(
    "/api/check-location",
    api(async (req) => {
      if (!opts.monthRunner) return { ok: false, reason: "not configured in this environment" };
      const body = req.body as { projectGid?: string; location?: string | null };
      const projectGid = typeof body?.projectGid === "string" && body.projectGid ? body.projectGid : undefined;
      const location = typeof body?.location === "string" ? body.location : null;

      const key = `${projectGid ?? ""}|${location ?? ""}`;
      if (checkingLocations.has(key)) return { ok: false, reason: "already running" };
      const runner = opts.monthRunner;
      let checker: ReviewChecker;
      try {
        checker = runner.buildChecker({ fast: true });
      } catch (e) {
        return { ok: false, reason: (e as Error).message };
      }

      checkingLocations.add(key);
      try {
        const s = { ok: true, checked: 0, exists: 0, removed: 0, unknown: 0 };
        const rows = await opts.repo.reviewsByLocation({ projectGid, location });
        await prepareChecker(checker, rows);
        for (const row of rows) {
          const result = await checkWithConfirmation({ checker, removalRecheckDelayMs: runner.removalRecheckDelayMs }, row);
          await opts.repo.recordCheck(row, result);
          s.checked++;
          if (result.status === "REVIEW_EXISTS") s.exists++;
          else if (result.status === "REVIEW_REMOVED") s.removed++;
          else s.unknown++;
        }
        await audit(
          actorOf(req),
          "location.checked",
          `Checked ${location ?? "reviews with no location"}: ${plural(s.checked, "review")} — ${s.exists} still available, ${s.removed} removed, ${s.unknown} could not be checked`,
        );
        return s;
      } finally {
        checkingLocations.delete(key);
      }
    }),
  );

  return app;
}
