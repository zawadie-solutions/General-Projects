import { timingSafeEqual } from "node:crypto";
import express from "express";
import type { AsanaClient } from "../asana/client";
import type { AsanaSettings } from "../asana/sync";
import type { ReviewRepo } from "../db/repo";
import { logger } from "../logger";
import { runMonthCheck } from "../monitor/runMonth";
import type { Notifier, ReviewChecker } from "../types";
import { dashboardHtml } from "./dashboard";
import { nextScheduledRun } from "./schedule";

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
  buildChecker: () => ReviewChecker;
  /** Throws if no notifier is configured — caught and treated as "don't notify". */
  buildNotifier: () => Notifier;
  checkDelayMs: number;
  removalRecheckDelayMs: number;
}

/** Read-only dashboard behind HTTP Basic auth, plus an optional on-demand "run a month now" trigger. */
export function createApp(opts: {
  repo: ReviewRepo;
  user: string;
  password: string;
  scheduleCron: string;
  timezone: string;
  monthRunner?: MonthRunnerOpts;
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

  const projectGidParam = (req: express.Request): string | undefined => {
    const p = req.query.project;
    return typeof p === "string" && p ? p : undefined;
  };

  app.get("/", (_req, res) => res.type("html").send(dashboardHtml));
  app.get(
    "/api/summary",
    api(async (req) => ({
      ...(await opts.repo.summary(projectGidParam(req))),
      nextCheckAt: nextScheduledRun(opts.scheduleCron, opts.timezone)?.toISOString() ?? null,
    })),
  );
  app.get("/api/months", api(() => opts.repo.distinctProjects()));
  app.get("/api/removed", api((req) => opts.repo.removedReviews({ projectGid: projectGidParam(req) })));
  app.get("/api/activity", api((req) => opts.repo.recentActivity({ projectGid: projectGidParam(req) })));

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
          });
          await opts.repo.finishAsanaRun(projectGid, { ok: true, reviewCount: result.reviewsFound });
        } catch (e) {
          logger.error({ err: (e as Error).message, projectGid }, "run-month failed");
          await opts.repo.finishAsanaRun(projectGid, { ok: false, error: (e as Error).message });
        }
      })();

      return { started: true };
    }),
  );

  return app;
}
