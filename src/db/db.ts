import { readFileSync } from "node:fs";
import mysql from "mysql2/promise";
import { config } from "../config";

/** Minimal surface used by the repo, so tests can swap in an in-memory mock. */
export interface Db {
  query<T = any>(text: string, params?: unknown[]): Promise<{ rows: T[]; rowCount: number | null }>;
  end(): Promise<void>;
}

export function createDb(): Db {
  const pool = mysql.createPool(config.databaseUrl());
  return {
    async query<T = any>(text: string, params: unknown[] = []) {
      const [result] = await pool.query(text, params);
      // SELECT returns an array of rows; INSERT/UPDATE/DELETE return a ResultSetHeader instead.
      if (Array.isArray(result)) return { rows: result as T[], rowCount: result.length };
      return { rows: [] as T[], rowCount: (result as mysql.ResultSetHeader).affectedRows ?? null };
    },
    async end() {
      await pool.end();
    },
  };
}

export async function migrate(db: Db): Promise<void> {
  const sql = readFileSync(new URL("./schema.sql", import.meta.url), "utf8");
  for (const stmt of sql.split(";").map((s) => s.trim()).filter(Boolean)) {
    await db.query(stmt);
  }
}
