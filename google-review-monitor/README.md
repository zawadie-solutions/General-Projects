# Google Review Monitor

A daily job (07:00 CAT) that reads Google review links from Asana, checks whether each review still exists, and **emails Vanessa once** when a review has disappeared. A small read-only dashboard (white/green/red, Basic auth, needs `DASHBOARD_PASSWORD`) shows the results: `npm start` runs scheduler + dashboard, `npm run dashboard` runs the dashboard alone, `npm run preview` shows it with fake data on http://localhost:3100 (demo / demo).

```
Asana -> Google URL -> checkReview() -> EXISTS: silent | UNKNOWN: log, retry tomorrow | REMOVED: email once
```

## Setup
1. `npm install`, create a PostgreSQL database, copy `.env.example` to `.env` and fill it in (never commit `.env`). URL-encode special characters in the DB password (`#` -> `%23`) and quote the value.
2. `npm run migrate` creates the tables.
3. `npm run discover` prints the Asana project tree and what it extracts. Adjust `ASANA_MONTH_INDEX` / `ASANA_LOCATION_INDEX` / `ASANA_MAX_DEPTH` until month and location are right. Any task whose description holds a Google Maps/review link is a review task; `Reviewer: Name` and `Rating: N` lines in the description are used when present.
4. Copy `config/locations.example.json` to `config/locations.json` (Asana location name -> Business Profile `accounts/…/locations/…`).
5. `npm run poc -- --url <url> --location "Location A" --reviewer "John Smith"` on one live and one removed review before trusting it.
6. `npm run run-once` does one full cycle (exit code 1 if any stage failed). `npm start` keeps a process running that does it daily at 07:00 `Africa/Maputo` (CAT, UTC+2, no DST). Alternatively schedule `npm run run-once` with Windows Task Scheduler.

## Rules that prevent false alerts
- `REVIEW_REMOVED` only if Google's review listing for the location is complete **and** the reviewer is absent **and** a second check a minute later agrees. Anything else (HTTP error, rate limit, auth, timeout, incomplete listing, bad URL, unmapped location, missing reviewer name) is `UNKNOWN`: logged, no email, retried next run.
- One digest email for newly removed reviews only. `notification_sent` is set only after the email succeeds; a failed send is retried next run. A review is emailed once, then no longer checked (`KEEP_CHECKING_REMOVED=true` to keep checking; a reappearing review resets its state).
- The Asana sync reads everything before writing, so an Asana failure leaves existing records untouched.

## Limits
Uses the Google Business Profile API, which only works for locations the authorised Google account manages, and matches by reviewer display name (Asana has no review ID). A renamed reviewer could look removed. Not yet verified against live Google/Asana — only mocked tests (`npm test`). Pilot against manual checks first. Run a single instance. If an email is sent but the DB write then fails, a duplicate is possible.

## Layout
`src/asana` sync · `src/google` checker (swap behind `ReviewChecker`) · `src/notify` email · `src/monitor/cycle.ts` the daily job · `src/db` schema + repo · `src/index.ts` scheduler
