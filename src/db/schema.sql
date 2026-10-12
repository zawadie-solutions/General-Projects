CREATE TABLE IF NOT EXISTS reviews (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  asana_task_id VARCHAR(64) NOT NULL UNIQUE,
  asana_task_name TEXT NOT NULL,
  asana_task_url TEXT NOT NULL,
  -- The Asana project (month) a review came from. `month` is just a display label (the
  -- container task's name, which doesn't match the project's own name) — this is the real key.
  asana_project_gid VARCHAR(64),
  location VARCHAR(255),
  month VARCHAR(255),
  reviewer_name VARCHAR(255),
  rating INTEGER,
  review_text TEXT,
  google_review_url TEXT NOT NULL,
  status VARCHAR(50) NOT NULL DEFAULT 'UNKNOWN',
  first_seen_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  last_checked_at TIMESTAMP NULL,
  removed_at TIMESTAMP NULL,
  notification_sent BOOLEAN NOT NULL DEFAULT false,
  notification_sent_at TIMESTAMP NULL,
  notification_attempts INTEGER NOT NULL DEFAULT 0,
  last_notification_error TEXT,
  last_error TEXT,
  monitoring_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS review_check_history (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  review_id BIGINT NOT NULL,
  checked_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  result VARCHAR(50) NOT NULL,
  reason TEXT,
  FOREIGN KEY (review_id) REFERENCES reviews(id)
);

-- Tracks every "<Month> Managed Disputes <Year>" Asana project found, so the dashboard can
-- list all of them (synced or not) and know whether a run is currently in progress.
CREATE TABLE IF NOT EXISTS asana_month_projects (
  project_gid VARCHAR(64) PRIMARY KEY,
  display_name VARCHAR(255) NOT NULL,
  last_synced_at TIMESTAMP NULL,
  last_review_count INTEGER,
  run_status VARCHAR(50) NOT NULL DEFAULT 'idle',
  last_run_error TEXT,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);
