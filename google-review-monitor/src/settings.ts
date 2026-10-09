import { config } from "./config";

/**
 * Settings that can be changed while the app is running, from the dashboard's Configure page.
 * They start from .env; a value saved from the dashboard (app_settings table) overrides it.
 * Credentials are not here on purpose: those stay in .env.
 */
export interface RuntimeSettings {
  /** Which service checks reviews. */
  reviewChecker: string;
  /** Asked only when the first service fails outright; "" = none. */
  reviewCheckerFallback: string;
  /** Newest reviews listed per place by DataForSEO (0 = its limit). */
  dataforseoMaxReviews: number;
  /** Use DataForSEO's priority queue for full runs too. */
  dataforseoPriority: boolean;
  /** Newest reviews scraped per place by Apify (0 = all). */
  apifyMaxReviews: number;
  /** Whether the scheduler runs the automatic daily check. */
  dailyCheckEnabled: boolean;
}

export const SOURCES = ["dataforseo", "apify", "places", "business-profile"] as const;
export const SOURCE_LABELS: Record<string, string> = {
  dataforseo: "DataForSEO",
  apify: "Apify",
  places: "Google Places API",
  "business-profile": "Google Business Profile API",
};

export const DATAFORSEO_LIMIT = 4490;
const APIFY_LIMIT = 20000;

const LABELS: Record<keyof RuntimeSettings, string> = {
  reviewChecker: "Review source",
  reviewCheckerFallback: "Fallback source",
  dataforseoMaxReviews: "DataForSEO reviews per location",
  dataforseoPriority: "DataForSEO fast queue for full runs",
  apifyMaxReviews: "Apify reviews per location",
  dailyCheckEnabled: "Automatic daily check",
};

export function envDefaults(): RuntimeSettings {
  return {
    reviewChecker: config.reviewChecker,
    reviewCheckerFallback: config.reviewCheckerFallback ?? "",
    dataforseoMaxReviews: config.dataforseoMaxReviews,
    dataforseoPriority: config.dataforseoPriority,
    apifyMaxReviews: config.apifyMaxReviews,
    dailyCheckEnabled: true,
  };
}

/** The live values. Read this wherever a setting is used, so a change applies to the next check. */
export const settings: RuntimeSettings = envDefaults();

const isSource = (v: string) => (SOURCES as readonly string[]).includes(v);

function wholeNumber(v: unknown, label: string, max: number): number {
  const n = typeof v === "string" && v.trim() !== "" ? Number(v) : v;
  if (typeof n !== "number" || !Number.isInteger(n) || n < 0 || n > max) throw new Error(`${label} must be a whole number from 0 to ${max.toLocaleString("en-US")}`);
  return n;
}

function onOff(v: unknown, label: string): boolean {
  if (v === true || v === "true") return true;
  if (v === false || v === "false") return false;
  throw new Error(`${label} must be on or off`);
}

/**
 * Checks a set of values (from the dashboard or the database) and returns the valid ones as
 * typed settings. Unknown keys are ignored; a bad value throws with a message fit to show.
 */
export function parseSettings(input: Record<string, unknown>): Partial<RuntimeSettings> {
  const out: Partial<RuntimeSettings> = {};
  if (input.reviewChecker !== undefined) {
    if (typeof input.reviewChecker !== "string" || !isSource(input.reviewChecker)) throw new Error("Review source is not one of the supported services");
    out.reviewChecker = input.reviewChecker;
  }
  if (input.reviewCheckerFallback !== undefined) {
    const v = input.reviewCheckerFallback;
    if (typeof v !== "string" || (v !== "" && !isSource(v))) throw new Error("Fallback source is not one of the supported services");
    out.reviewCheckerFallback = v;
  }
  if (input.dataforseoMaxReviews !== undefined) out.dataforseoMaxReviews = wholeNumber(input.dataforseoMaxReviews, LABELS.dataforseoMaxReviews, DATAFORSEO_LIMIT);
  if (input.dataforseoPriority !== undefined) out.dataforseoPriority = onOff(input.dataforseoPriority, LABELS.dataforseoPriority);
  if (input.apifyMaxReviews !== undefined) out.apifyMaxReviews = wholeNumber(input.apifyMaxReviews, LABELS.apifyMaxReviews, APIFY_LIMIT);
  if (input.dailyCheckEnabled !== undefined) out.dailyCheckEnabled = onOff(input.dailyCheckEnabled, LABELS.dailyCheckEnabled);
  return out;
}

/** Resets to .env, then applies what was saved from the dashboard. A stored value that is no longer valid is skipped. */
export function applyStored(stored: Record<string, string>): void {
  Object.assign(settings, envDefaults());
  for (const [key, value] of Object.entries(stored)) {
    try {
      Object.assign(settings, parseSettings({ [key]: value }));
    } catch {
      // left at its .env value
    }
  }
}

function show(key: keyof RuntimeSettings, v: RuntimeSettings[keyof RuntimeSettings]): string {
  if (typeof v === "boolean") return v ? "on" : "off";
  if (key === "reviewChecker" || key === "reviewCheckerFallback") return v === "" ? "none" : (SOURCE_LABELS[v as string] ?? String(v));
  if (v === 0) return "no limit";
  return typeof v === "number" ? v.toLocaleString("en-US") : String(v);
}

/** One plain sentence per setting that actually changes, for the audit log. */
export function describeChanges(from: RuntimeSettings, patch: Partial<RuntimeSettings>): string[] {
  return (Object.keys(patch) as (keyof RuntimeSettings)[])
    .filter((k) => patch[k] !== undefined && patch[k] !== from[k])
    .map((k) => `${LABELS[k]} changed from ${show(k, from[k])} to ${show(k, patch[k] as RuntimeSettings[typeof k])}`);
}
