CREATE TABLE IF NOT EXISTS reviews (
  id BIGSERIAL PRIMARY KEY,
  asana_task_id TEXT NOT NULL UNIQUE,
  asana_task_name TEXT NOT NULL,
  asana_task_url TEXT NOT NULL,
  location TEXT,
  month TEXT,
  reviewer_name TEXT,
  rating INTEGER,
  review_text TEXT,
  google_review_url TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'UNKNOWN',
  first_seen_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_checked_at TIMESTAMPTZ,
  removed_at TIMESTAMPTZ,
  notification_sent BOOLEAN NOT NULL DEFAULT false,
  notification_sent_at TIMESTAMPTZ,
  notification_attempts INTEGER NOT NULL DEFAULT 0,
  last_notification_error TEXT,
  last_error TEXT,
  monitoring_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS review_check_history (
  id BIGSERIAL PRIMARY KEY,
  review_id BIGINT NOT NULL REFERENCES reviews(id),
  checked_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  result TEXT NOT NULL,
  reason TEXT
);

ALTER TABLE reviews ADD COLUMN IF NOT EXISTS review_text TEXT;
