import postgres from "postgres";

/** Dev-only: quick state dump of appointments + credits for verification. */

const CONN =
  process.env.DATABASE_URL ??
  "postgres://postgres:password@localhost:54332/barberbook";

async function main(): Promise<void> {
  const sql = postgres(CONN, { max: 1, onnotice: () => {} });
  try {
    const appts = await sql`
      SELECT a.id, a.status, a.start_at, a.deposit_cents, a.credit_id IS NOT NULL AS credit_used, u.email
      FROM appointments a JOIN users u ON u.id = a.client_id
      ORDER BY a.created_at DESC LIMIT 5
    `;
    const credits = await sql`
      SELECT id, granted, consumed FROM membership_credits ORDER BY period_start DESC LIMIT 3
    `;
    console.log(JSON.stringify({ appts, credits }, null, 2));
  } finally {
    await sql.end({ timeout: 5 });
  }
}

main().catch((err: unknown) => {
  console.error(err);
  process.exit(1);
});
