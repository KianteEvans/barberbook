import postgres from "postgres";

/**
 * Dev-only: give the sample client a few near-future appointments so the
 * reminder / confirmation / waitlist flows are testable immediately. Each goes
 * to a DIFFERENT barber so the exclusion constraint never trips and so barber
 * reminders exercise both the linked-user and admin-fallback paths.
 *
 * Re-runnable: clears the sample client's future live appointments first.
 * Usage: DATABASE_URL=... npx tsx scripts/dev-seed-appointments.ts
 */

const CONN =
  process.env.DATABASE_URL ??
  "postgres://postgres:password@localhost:54335/barberbook";

async function main(): Promise<void> {
  const sql = postgres(CONN, { max: 1, onnotice: () => {} });
  try {
    const [client] = await sql<[{ id: string }]>`
      SELECT id FROM users WHERE email = 'client@barberbook.local'
    `;
    const [service] = await sql<[{ id: string; duration_min: number }]>`
      SELECT id, duration_min FROM services WHERE active = true ORDER BY price_cents LIMIT 1
    `;
    const barbers = await sql<Array<{ id: string; display_name: string }>>`
      SELECT id, display_name FROM barbers WHERE active = true ORDER BY created_at
    `;
    if (!client || !service || barbers.length === 0) {
      throw new Error("seed data missing - run npm run seed first");
    }

    // Clear prior future live appointments for a clean, re-runnable state.
    await sql`
      DELETE FROM appointments
      WHERE client_id = ${client.id}
        AND status IN ('pending_deposit','confirmed','reserved')
        AND start_at > now()
    `;

    // (offsetMinutes, status) - spread across barbers to avoid overlap.
    const plan: Array<{ offset: number; status: string }> = [
      { offset: 30, status: "confirmed" },
      { offset: 15, status: "confirmed" },
      { offset: 5, status: "confirmed" },
    ];

    for (let i = 0; i < plan.length; i++) {
      const p = plan[i]!;
      const barber = barbers[i % barbers.length]!;
      await sql`
        INSERT INTO appointments (client_id, barber_id, service_id, start_at, end_at, status)
        VALUES (
          ${client.id}, ${barber.id}, ${service.id},
          now() + (${p.offset} || ' minutes')::interval,
          now() + (${p.offset + service.duration_min} || ' minutes')::interval,
          ${p.status}
        )
      `;
      console.log(`[seed-appts] +${p.offset}m ${p.status} with ${barber.display_name}`);
    }
    console.log("[seed-appts] done.");
  } finally {
    await sql.end({ timeout: 5 });
  }
}

main().catch((err: unknown) => {
  console.error("[seed-appts] failed:", err);
  process.exit(1);
});
