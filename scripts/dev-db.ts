import { rm } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import EmbeddedPostgres from "embedded-postgres";
import { runMigrations } from "../src/db/migrate.js";

/**
 * Dev-only: boot a REAL Postgres (downloaded binary, no Docker) on a fixed
 * port, apply migrations, and stay alive so `next dev` can connect over TCP.
 * Kill the process to stop Postgres. Port 54331 avoids PartnerOS's 54329.
 */
const PORT = Number(process.env.DEV_DB_PORT ?? 54331);
const CONN = `postgres://postgres:password@localhost:${PORT}/barberbook`;

async function main(): Promise<void> {
  // Windows gotcha: a crashed run can leave orphaned postgres children whose
  // shared-memory block (keyed by data-dir path) blocks the next boot. Point
  // DEV_DB_DIR at a fresh directory to sidestep it without killing anything.
  const dir = process.env.DEV_DB_DIR ?? join(tmpdir(), `barberbook-dev-pg-${PORT}`);
  await rm(dir, { recursive: true, force: true });

  const pg = new EmbeddedPostgres({
    databaseDir: dir,
    port: PORT,
    user: "postgres",
    password: "password",
    authMethod: "password",
    persistent: false,
    onLog: () => {},
    onError: () => {},
  });

  await pg.initialise();
  await pg.start();
  await pg.createDatabase("barberbook");
  const applied = await runMigrations(CONN);
  console.log(`[dev-db] ready on ${CONN}`);
  console.log(`[dev-db] migrations: ${applied.length ? applied.join(", ") : "none pending"}`);

  const stop = async (): Promise<void> => {
    await pg.stop().catch(() => {});
    process.exit(0);
  };
  process.on("SIGINT", stop);
  process.on("SIGTERM", stop);
  // Keep the process (and Postgres) alive.
  setInterval(() => {}, 1 << 30);
}

main().catch((err: unknown) => {
  console.error("[dev-db] failed:", err);
  process.exit(1);
});
