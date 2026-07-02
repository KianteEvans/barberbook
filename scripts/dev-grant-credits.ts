import postgres from "postgres";

/**
 * Dev-only: give the seeded sample client an active membership with 2 credits
 * so the credit-booking path can be exercised without a live Stripe
 * subscription. Usage: npx tsx scripts/dev-grant-credits.ts
 */

const CONN =
  process.env.DATABASE_URL ??
  "postgres://postgres:password@localhost:54331/barberbook";

async function main(): Promise<void> {
  const sql = postgres(CONN, { max: 1, onnotice: () => {} });
  try {
    const [client] =
      await sql`SELECT id FROM users WHERE email = 'client@barberbook.local'`;
    const [plan] = await sql`SELECT id FROM membership_plans LIMIT 1`;
    if (!client || !plan) throw new Error("seed data missing - run npm run seed");
    const [m] = await sql`
      INSERT INTO memberships (client_id, plan_id, status, current_period_end)
      VALUES (${client.id}, ${plan.id}, 'active', now() + interval '30 days')
      RETURNING id
    `;
    await sql`
      INSERT INTO membership_credits (membership_id, granted, consumed, period_start, period_end)
      VALUES (${m!.id}, 2, 0, now() - interval '1 day', now() + interval '30 days')
    `;
    console.log("[dev] granted 2 credits, membership", m!.id);
  } finally {
    await sql.end({ timeout: 5 });
  }
}

main().catch((err: unknown) => {
  console.error(err);
  process.exit(1);
});
