import { readFileSync } from "node:fs";
import pg from "pg";
import { config } from "../config";

/** Minimal surface used by the repo, so tests can swap in an in-memory Postgres. */
export interface Db {
  query<T = any>(text: string, params?: unknown[]): Promise<{ rows: T[]; rowCount: number | null }>;
  end(): Promise<void>;
}

export function createDb(): Db {
  return new pg.Pool({ connectionString: config.databaseUrl() }) as unknown as Db;
}

export async function migrate(db: Db): Promise<void> {
  const sql = readFileSync(new URL("./schema.sql", import.meta.url), "utf8");
  for (const stmt of sql.split(";").map((s) => s.trim()).filter(Boolean)) {
    await db.query(stmt);
  }
}
