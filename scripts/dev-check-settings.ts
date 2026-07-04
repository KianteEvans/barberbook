import postgres from "postgres";

/** Dev-only: dump the shop_settings row to confirm admin edits persisted. */
const CONN =
  process.env.DATABASE_URL ??
  "postgres://postgres:password@localhost:54334/barberbook";

async function main(): Promise<void> {
  const sql = postgres(CONN, { max: 1, onnotice: () => {} });
  try {
    const [row] = await sql`
      SELECT shop_name, timezone, slot_granularity_min, buffer_min, backdrop
      FROM shop_settings WHERE id = 1
    `;
    console.log("PERSISTED:", JSON.stringify(row));
  } finally {
    await sql.end({ timeout: 5 });
  }
}

main().catch((err: unknown) => {
  console.error(err);
  process.exit(1);
});
