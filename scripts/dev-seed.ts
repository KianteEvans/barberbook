import postgres from "postgres";
import bcrypt from "bcryptjs";

/**
 * Re-runnable dev seed: admin login, one barber, weekly hours, three services,
 * one membership plan, and shop settings. Uses ON CONFLICT / existence checks
 * so it can run against a fresh dev:db boot every time.
 *
 *   admin login:  admin@barberbook.local / admin1234
 *   client login: client@barberbook.local / client1234
 */

const CONN =
  process.env.DATABASE_URL ??
  "postgres://postgres:password@localhost:54331/barberbook";

async function main(): Promise<void> {
  const sql = postgres(CONN, { max: 1, onnotice: () => {} });
  try {
    await sql`
      INSERT INTO shop_settings (id, shop_name, timezone, cancellation_window_hours,
                                 deposit_mode, deposit_value, no_show_fee_cents,
                                 slot_granularity_min, buffer_min)
      VALUES (1, 'Fade Factory', 'America/New_York', 24, 'fixed', 1000, 1500, 15, 5)
      ON CONFLICT (id) DO NOTHING
    `;

    const adminHash = await bcrypt.hash("admin1234", 10);
    const clientHash = await bcrypt.hash("client1234", 10);
    await sql`
      INSERT INTO users (email, password_hash, name, role)
      VALUES ('admin@barberbook.local', ${adminHash}, 'Shop Owner', 'admin')
      ON CONFLICT (email) DO NOTHING
    `;
    await sql`
      INSERT INTO users (email, password_hash, name, phone, role)
      VALUES ('client@barberbook.local', ${clientHash}, 'Sample Client', '555-010-0100', 'client')
      ON CONFLICT (email) DO NOTHING
    `;

    const [{ count: barberCount }] = await sql<[{ count: string }]>`
      SELECT count(*)::text AS count FROM barbers
    `;
    if (Number(barberCount) === 0) {
      const [admin] = await sql<[{ id: string }]>`
        SELECT id FROM users WHERE email = 'admin@barberbook.local'
      `;
      const [barber] = await sql<[{ id: string }]>`
        INSERT INTO barbers (user_id, display_name) VALUES (${admin!.id}, 'Marco')
        RETURNING id
      `;
      // Tue-Sat 9:00-18:00 (weekday 0 = Sunday).
      for (const weekday of [2, 3, 4, 5, 6]) {
        await sql`
          INSERT INTO availability_rules (barber_id, weekday, start_min, end_min)
          VALUES (${barber!.id}, ${weekday}, 540, 1080)
        `;
      }
    }

    const [{ count: serviceCount }] = await sql<[{ count: string }]>`
      SELECT count(*)::text AS count FROM services
    `;
    if (Number(serviceCount) === 0) {
      await sql`
        INSERT INTO services (name, description, duration_min, price_cents, deposit_cents)
        VALUES
          ('Classic Cut', 'Scissor or clipper cut with hot towel finish.', 30, 3500, 1000),
          ('Cut + Beard', 'Full cut plus beard shape-up and line work.', 45, 5000, 1500),
          ('The Works', 'Cut, beard, hot lather shave, and styling.', 60, 7500, 2500)
      `;
    }

    const [{ count: planCount }] = await sql<[{ count: string }]>`
      SELECT count(*)::text AS count FROM membership_plans
    `;
    if (Number(planCount) === 0) {
      await sql`
        INSERT INTO membership_plans (name, description, credits_per_period, price_cents)
        VALUES ('Fresh Club', 'Two cuts every month, priority booking.', 2, 6000)
      `;
    }

    console.log("[seed] done.");
    console.log("[seed] admin:  admin@barberbook.local / admin1234");
    console.log("[seed] client: client@barberbook.local / client1234");
  } finally {
    await sql.end({ timeout: 5 });
  }
}

main().catch((err: unknown) => {
  console.error("[seed] failed:", err);
  process.exit(1);
});
