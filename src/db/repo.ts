import type { Db } from "./db";
import type { CheckResult, DiscoveredReview, ReviewRow } from "../types";

export interface ReviewFilters {
  status?: string;
  location?: string;
  month?: string;
  from?: string;
  to?: string;
}

export class ReviewRepo {
  constructor(private db: Db) {}

  /** Insert a new review or refresh Asana metadata. Returns true if newly created. */
  async upsertDiscovered(d: DiscoveredReview): Promise<boolean> {
    const existing = await this.db.query<ReviewRow>("SELECT * FROM reviews WHERE asana_task_id = $1", [d.asanaTaskId]);
    const row = existing.rows[0];
    if (!row) {
      await this.db.query(
        `INSERT INTO reviews (asana_task_id, asana_task_name, asana_task_url, location, month,
           reviewer_name, rating, review_text, google_review_url)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
        [d.asanaTaskId, d.asanaTaskName, d.asanaTaskUrl, d.location, d.month, d.reviewerName, d.rating, d.reviewText, d.googleReviewUrl],
      );
      return true;
    }
    // If the link was replaced the old verdict no longer applies: start over.
    const urlChanged = row.google_review_url !== d.googleReviewUrl;
    await this.db.query(
      `UPDATE reviews SET asana_task_name=$2, asana_task_url=$3, location=$4, month=$5, reviewer_name=$6,
         rating=$7, google_review_url=$8, review_text=$9, updated_at=now()
         ${urlChanged ? ", status='UNKNOWN', removed_at=NULL, notification_sent=false, notification_sent_at=NULL, monitoring_active=true, last_error=NULL" : ""}
       WHERE id=$1`,
      [row.id, d.asanaTaskName, d.asanaTaskUrl, d.location, d.month, d.reviewerName, d.rating, d.googleReviewUrl, d.reviewText],
    );
    return false;
  }

  async listToCheck(): Promise<ReviewRow[]> {
    const r = await this.db.query<ReviewRow>("SELECT * FROM reviews WHERE monitoring_active = true ORDER BY id");
    return r.rows;
  }

  async all(): Promise<ReviewRow[]> {
    const r = await this.db.query<ReviewRow>("SELECT * FROM reviews ORDER BY id");
    return r.rows;
  }

  /** Dashboard list: removed first, then most recent activity. */
  async list(f: ReviewFilters = {}): Promise<ReviewRow[]> {
    const where: string[] = [];
    const p: unknown[] = [];
    const add = (sql: string, v: unknown) => {
      p.push(v);
      where.push(sql.replace("?", `$${p.length}`));
    };
    if (f.status) add("status = ?", f.status);
    if (f.location) add("location = ?", f.location);
    if (f.month) add("month = ?", f.month);
    if (f.from) add("COALESCE(removed_at, last_checked_at, first_seen_at) >= ?", f.from);
    if (f.to) add("COALESCE(removed_at, last_checked_at, first_seen_at) <= ?", f.to);
    const r = await this.db.query<ReviewRow>(
      `SELECT * FROM reviews ${where.length ? "WHERE " + where.join(" AND ") : ""}
       ORDER BY (status='REVIEW_REMOVED') DESC, COALESCE(removed_at, last_checked_at, first_seen_at) DESC LIMIT 2000`,
      p,
    );
    return r.rows;
  }

  async summary() {
    const r = await this.db.query<{ status: string; n: string }>("SELECT status, COUNT(*) AS n FROM reviews GROUP BY status");
    const by = Object.fromEntries(r.rows.map((x) => [x.status, Number(x.n)]));
    const m = await this.db.query<{ last_check: Date | null; last_notified: Date | null; failing: string | null }>(
      `SELECT MAX(last_checked_at) AS last_check, MAX(notification_sent_at) AS last_notified,
              SUM(CASE WHEN status='REVIEW_REMOVED' AND notification_sent=false AND last_notification_error IS NOT NULL THEN 1 ELSE 0 END) AS failing
       FROM reviews`,
    );
    return {
      monitored: Object.values(by).reduce((a, b) => a + b, 0),
      exists: by.REVIEW_EXISTS ?? 0,
      removed: by.REVIEW_REMOVED ?? 0,
      unknown: by.UNKNOWN ?? 0,
      lastCheckAt: m.rows[0]?.last_check ?? null,
      lastNotificationAt: m.rows[0]?.last_notified ?? null,
      notificationsFailing: Number(m.rows[0]?.failing ?? 0),
    };
  }

  async filterOptions() {
    const loc = await this.db.query<{ v: string }>("SELECT DISTINCT location AS v FROM reviews WHERE location IS NOT NULL ORDER BY 1");
    const mon = await this.db.query<{ v: string }>("SELECT DISTINCT month AS v FROM reviews WHERE month IS NOT NULL ORDER BY 1");
    return { locations: loc.rows.map((x) => x.v), months: mon.rows.map((x) => x.v) };
  }

  async history(reviewId: number) {
    const r = await this.db.query("SELECT checked_at, result, reason FROM review_check_history WHERE review_id=$1 ORDER BY id", [
      reviewId,
    ]);
    return r.rows;
  }

  /**
   * Persist a check outcome and its history row.
   * - UNKNOWN never overwrites a REMOVED verdict, and never touches notification state.
   * - EXISTS after REMOVED = review reappeared: clear removal so a later removal notifies again.
   */
  async recordCheck(review: ReviewRow, result: CheckResult): Promise<void> {
    const reason = result.status === "UNKNOWN" ? result.reason : null;
    await this.db.query("INSERT INTO review_check_history (review_id, result, reason) VALUES ($1,$2,$3)", [
      review.id,
      result.status,
      reason,
    ]);
    if (result.status === "REVIEW_EXISTS") {
      await this.db.query(
        `UPDATE reviews SET status='REVIEW_EXISTS', last_checked_at=now(), last_error=NULL, removed_at=NULL,
           notification_sent=false, notification_sent_at=NULL, monitoring_active=true, updated_at=now() WHERE id=$1`,
        [review.id],
      );
    } else if (result.status === "REVIEW_REMOVED") {
      await this.db.query(
        `UPDATE reviews SET status='REVIEW_REMOVED', last_checked_at=now(), last_error=NULL,
           removed_at=COALESCE(removed_at, now()), updated_at=now() WHERE id=$1`,
        [review.id],
      );
    } else if (review.status === "REVIEW_REMOVED") {
      await this.db.query("UPDATE reviews SET last_checked_at=now(), last_error=$2, updated_at=now() WHERE id=$1", [
        review.id,
        reason,
      ]);
    } else {
      await this.db.query(
        "UPDATE reviews SET status='UNKNOWN', last_checked_at=now(), last_error=$2, updated_at=now() WHERE id=$1",
        [review.id, reason],
      );
    }
  }

  async pendingNotifications(): Promise<ReviewRow[]> {
    const r = await this.db.query<ReviewRow>(
      "SELECT * FROM reviews WHERE status='REVIEW_REMOVED' AND notification_sent=false ORDER BY removed_at, id",
    );
    return r.rows;
  }

  /** Guarded by notification_sent=false so a repeated call can never double-mark. */
  async markNotified(ids: number[], stopChecking: boolean): Promise<void> {
    for (const id of ids) {
      await this.db.query(
        `UPDATE reviews SET notification_sent=true, notification_sent_at=now(), last_notification_error=NULL,
           monitoring_active=$2, updated_at=now() WHERE id=$1 AND notification_sent=false`,
        [id, !stopChecking],
      );
    }
  }

  async markNotificationFailed(ids: number[], error: string): Promise<void> {
    for (const id of ids) {
      await this.db.query(
        `UPDATE reviews SET notification_attempts=notification_attempts+1, last_notification_error=$2,
           updated_at=now() WHERE id=$1`,
        [id, error],
      );
    }
  }
}
