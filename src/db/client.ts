import postgres from "postgres";
import { drizzle, type PostgresJsDatabase } from "drizzle-orm/postgres-js";
import { env } from "@/env";
import * as schema from "./schema";

/**
 * Single shared connection pool + typed Drizzle handle. Next.js dev hot-reload
 * re-evaluates modules, so stash the pool on globalThis to avoid leaking
 * connections.
 */

type Db = PostgresJsDatabase<typeof schema>;

const globalForDb = globalThis as unknown as {
  __barberbookSql?: ReturnType<typeof postgres>;
};

const sql =
  globalForDb.__barberbookSql ??
  postgres(env.DATABASE_URL, { max: 10, onnotice: () => {} });

if (process.env.NODE_ENV !== "production") globalForDb.__barberbookSql = sql;

export const db: Db = drizzle(sql, { schema });

/** Raw driver access for FOR UPDATE row locks and error-code inspection. */
export { sql };

/** SQLSTATE for exclusion-constraint violation (the double-booking guard). */
export const EXCLUSION_VIOLATION = "23P01";

/** True when an unknown error is the appointments no_overlap rejection. */
export function isSlotTakenError(err: unknown): boolean {
  return (
    typeof err === "object" &&
    err !== null &&
    "code" in err &&
    (err as { code?: string }).code === EXCLUSION_VIOLATION
  );
}
