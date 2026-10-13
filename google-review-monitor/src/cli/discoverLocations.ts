// One-off helper: lists every Google Business Profile location the authorised
// account manages, matches it against the distinct Asana location names in the
// DB, and writes a report instead of config/locations.json directly — a wrong
// auto-match would point the monitor at the wrong business's reviews.
import { writeFileSync } from "node:fs";
import { config } from "../config";
import { createDb } from "../db/db";
import { norm, OAuthRefreshTokenProvider } from "../google/businessProfileChecker";

interface GbpAccount {
  name: string; // "accounts/{id}"
  accountName?: string;
  type?: string;
}

interface GbpLocation {
  name: string; // "locations/{id}"
  title?: string;
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function listAccounts(auth: OAuthRefreshTokenProvider): Promise<GbpAccount[]> {
  const out: GbpAccount[] = [];
  let pageToken: string | undefined;
  do {
    const url = new URL("https://mybusinessaccountmanagement.googleapis.com/v1/accounts");
    url.searchParams.set("pageSize", "20");
    if (pageToken) url.searchParams.set("pageToken", pageToken);
    const res = await fetch(url, { headers: { Authorization: `Bearer ${await auth.getAccessToken()}` } });
    if (!res.ok) throw new Error(`accounts.list failed: HTTP ${res.status} ${await res.text()}`);
    const j = (await res.json()) as { accounts?: GbpAccount[]; nextPageToken?: string };
    out.push(...(j.accounts ?? []));
    pageToken = j.nextPageToken;
  } while (pageToken);
  return out;
}

async function listLocations(auth: OAuthRefreshTokenProvider, account: GbpAccount): Promise<GbpLocation[]> {
  const out: GbpLocation[] = [];
  let pageToken: string | undefined;
  do {
    const url = new URL(`https://mybusinessbusinessinformation.googleapis.com/v1/${account.name}/locations`);
    url.searchParams.set("readMask", "name,title");
    url.searchParams.set("pageSize", "100");
    if (pageToken) url.searchParams.set("pageToken", pageToken);
    const res = await fetch(url, { headers: { Authorization: `Bearer ${await auth.getAccessToken()}` } });
    if (!res.ok) throw new Error(`locations.list(${account.name}) failed: HTTP ${res.status} ${await res.text()}`);
    const j = (await res.json()) as { locations?: GbpLocation[]; nextPageToken?: string };
    out.push(...(j.locations ?? []));
    pageToken = j.nextPageToken;
    if (pageToken) await sleep(300);
  } while (pageToken);
  return out;
}

async function main() {
  const g = config.google();
  const auth = new OAuthRefreshTokenProvider(g);

  console.log("Fetching Business Profile accounts...");
  const accounts = await listAccounts(auth);
  console.log(`Found ${accounts.length} account(s).`);

  const googleLocations: { resource: string; title: string; normTitle: string }[] = [];
  for (const account of accounts) {
    console.log(`Listing locations for ${account.name} (${account.accountName ?? "?"})...`);
    const locs = await listLocations(auth, account);
    for (const loc of locs) {
      if (!loc.title) continue;
      googleLocations.push({ resource: `${account.name}/${loc.name}`, title: loc.title, normTitle: norm(loc.title) });
    }
    await sleep(300);
  }
  console.log(`Found ${googleLocations.length} location(s) with a title across all accounts.`);

  const db = createDb();
  const r = await db.query<{ location: string | null }>(
    "SELECT DISTINCT location FROM reviews WHERE location IS NOT NULL ORDER BY location",
  );
  await db.end();
  const asanaLocations = r.rows.map((x) => x.location!);
  console.log(`Found ${asanaLocations.length} distinct Asana location name(s).`);

  const matched: Record<string, string> = {};
  const ambiguous: { asanaLocation: string; candidates: string[] }[] = [];
  const unmatched: string[] = [];

  for (const asanaLoc of asanaLocations) {
    const n = norm(asanaLoc);
    const candidates = googleLocations.filter((g) => n === g.normTitle || n.startsWith(g.normTitle + " ") || n.startsWith(g.normTitle));
    if (candidates.length === 0) {
      unmatched.push(asanaLoc);
    } else if (candidates.length === 1) {
      matched[asanaLoc] = candidates[0].resource;
    } else {
      // Prefer the longest matching title (most specific) if it's unambiguously longer than the rest.
      const sorted = [...candidates].sort((a, b) => b.normTitle.length - a.normTitle.length);
      if (sorted[0].normTitle.length > sorted[1].normTitle.length) {
        matched[asanaLoc] = sorted[0].resource;
      } else {
        ambiguous.push({ asanaLocation: asanaLoc, candidates: candidates.map((c) => `${c.title} -> ${c.resource}`) });
      }
    }
  }

  const reportPath = "config/locations.discovery-report.json";
  writeFileSync(
    reportPath,
    JSON.stringify(
      {
        summary: {
          googleLocationsFound: googleLocations.length,
          asanaLocationsFound: asanaLocations.length,
          matched: Object.keys(matched).length,
          ambiguous: ambiguous.length,
          unmatched: unmatched.length,
        },
        matched,
        ambiguous,
        unmatched,
      },
      null,
      2,
    ),
  );
  console.log(
    `\nDone. ${Object.keys(matched).length} confident match(es), ${ambiguous.length} ambiguous, ${unmatched.length} unmatched.`,
  );
  console.log(`Full report written to ${reportPath}. config/locations.json was NOT modified.`);
}

await main();
