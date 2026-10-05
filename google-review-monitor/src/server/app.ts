import { timingSafeEqual } from "node:crypto";
import express from "express";
import type { ReviewRepo } from "../db/repo";
import { logger } from "../logger";
import { dashboardHtml } from "./dashboard";

function safeEqual(a: string, b: string): boolean {
  const x = Buffer.from(a);
  const y = Buffer.from(b);
  return x.length === y.length && timingSafeEqual(x, y);
}

/** Read-only dashboard behind HTTP Basic auth. */
export function createApp(opts: { repo: ReviewRepo; user: string; password: string }) {
  if (!opts.password) throw new Error("DASHBOARD_PASSWORD must be set; refusing to serve an open dashboard");
  const app = express();

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

  app.get("/", (_req, res) => res.type("html").send(dashboardHtml));
  app.get("/api/summary", api(() => opts.repo.summary()));
  app.get("/api/filters", api(() => opts.repo.filterOptions()));
  app.get(
    "/api/reviews",
    api((req) => {
      const q = req.query as Record<string, string | undefined>;
      return opts.repo.list({
        status: q.status || undefined,
        location: q.location || undefined,
        month: q.month || undefined,
        from: q.from || undefined,
        to: q.to ? `${q.to}T23:59:59Z` : undefined,
      });
    }),
  );
  app.get(
    "/api/reviews/:id/history",
    api((req) => {
      const id = Number(req.params.id);
      if (!Number.isInteger(id)) throw new Error("bad id");
      return opts.repo.history(id);
    }),
  );
  return app;
}
