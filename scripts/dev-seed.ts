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
                                 slot_granularity_min, buffer_min, backdrop)
      VALUES (1, 'Fade Factory', 'America/New_York', 24, 'fixed', 1000, 1500, 15, 5, 'skyline')
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

    // Five mock barbers with distinct profiles, hours, and pricing. Offerings
    // use per-service overrides in cents; null = shop standard price.
    const [{ count: barberCount }] = await sql<[{ count: string }]>`
      SELECT count(*)::text AS count FROM barbers
    `;
    if (Number(barberCount) === 0) {
      const roster: Array<{
        name: string;
        tagline: string;
        bio: string;
        specialties: string;
        userId: string | null;
        weekdays: number[]; // 0 = Sunday
        hours: [number, number]; // minutes from midnight
        overrides: Record<string, number | null>; // service name -> cents
      }> = [
        {
          name: "Marco",
          tagline: "Fades, tapers, and razor work since 2012",
          bio: "Marco has been behind the chair for over a decade, specializing in skin fades, beard sculpting, and classic scissor work. Every cut ends with a hot towel and a straight-razor neck shave.",
          specialties: "Skin fade, Beard sculpt, Hot towel shave",
          userId: null,
          weekdays: [2, 3, 4, 5, 6],
          hours: [540, 1080], // 9:00-18:00
          overrides: { "Classic Cut": null, "Cut + Beard": 5500, "The Works": null },
        },
        {
          name: 'Andre "Dre" Bishop',
          tagline: "Precision fades and the sharpest lines in the city",
          bio: "Dre came up cutting heads out of his mom's kitchen and never lost the hunger. Burst fades, crispy line-ups, and wave maintenance are his bread and butter - bring a photo and he will out-do it.",
          specialties: "Burst fade, Line-up, Waves",
          userId: null,
          weekdays: [1, 2, 3, 4, 5],
          hours: [600, 1140], // 10:00-19:00
          overrides: { "Classic Cut": 3000, "Cut + Beard": null },
        },
        {
          name: "Tony Ricci",
          tagline: "Old-school scissor man, cutting since 1998",
          bio: "Tony learned the trade in his uncle's shop in Bensonhurst and still does everything the old way: scissor over comb, hot lather, and a straight razor finished on a leather strop. Ask for the pompadour.",
          specialties: "Scissor cut, Pompadour, Straight razor",
          userId: null,
          weekdays: [2, 3, 4, 5, 6],
          hours: [480, 960], // 8:00-16:00
          overrides: { "Classic Cut": 4000, "Cut + Beard": null, "The Works": 8500 },
        },
        {
          name: "Kofi Mensah",
          tagline: "Texture is the craft - curls, coils, and crops",
          bio: "Kofi is the shop's texture specialist. Curly crops, twist setups, and sponge work that holds its shape all week. He will teach you the routine to keep it right between visits.",
          specialties: "Curly crop, Twists, Sponge work",
          userId: null,
          weekdays: [3, 4, 5, 6, 0],
          hours: [660, 1200], // 11:00-20:00
          overrides: { "Classic Cut": null, "Cut + Beard": null, "The Works": null },
        },
        {
          name: "Luz Ortega",
          tagline: "Editorial cuts, freestyle designs, and the kids' chair",
          bio: "Luz spent five years assisting on fashion shoots before taking a chair here. Shear-only cuts, freehand designs, and the most patient hands in the shop for first haircuts and kids.",
          specialties: "Shear cut, Kids cuts, Freestyle designs",
          userId: null,
          weekdays: [1, 3, 5, 6],
          hours: [540, 1020], // 9:00-17:00
          overrides: { "Classic Cut": null, "The Works": 7000 },
        },
      ];

      const barberHash = await bcrypt.hash("barber1234", 10);
      let barberSeq = 0;
      for (const b of roster) {
        // Each barber gets a staff login (barberN@barberbook.local / barber1234).
        barberSeq += 1;
        const email = `barber${barberSeq}@barberbook.local`;
        await sql`
          INSERT INTO users (email, password_hash, name, role)
          VALUES (${email}, ${barberHash}, ${b.name}, 'barber')
          ON CONFLICT (email) DO NOTHING
        `;
        const [bu] = await sql<[{ id: string }]>`SELECT id FROM users WHERE email = ${email}`;
        const [row] = await sql<[{ id: string }]>`
          INSERT INTO barbers (user_id, display_name, tagline, bio, specialties)
          VALUES (${bu!.id}, ${b.name}, ${b.tagline}, ${b.bio}, ${b.specialties})
          RETURNING id
        `;
        for (const weekday of b.weekdays) {
          await sql`
            INSERT INTO availability_rules (barber_id, weekday, start_min, end_min)
            VALUES (${row!.id}, ${weekday}, ${b.hours[0]}, ${b.hours[1]})
          `;
        }
        for (const [serviceName, cents] of Object.entries(b.overrides)) {
          await sql`
            INSERT INTO barber_services (barber_id, service_id, price_cents)
            SELECT ${row!.id}, id, ${cents} FROM services WHERE name = ${serviceName}
          `;
        }
      }
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

    // Sample customer testimonials for the gallery page. Some attributed to a
    // barber by name (subquery), some general.
    const [{ count: testimonialCount }] = await sql<[{ count: string }]>`
      SELECT count(*)::text AS count FROM testimonials
    `;
    if (Number(testimonialCount) === 0) {
      const testimonials: Array<{
        author: string;
        quote: string;
        rating: number;
        barber: string | null;
        sort: number;
      }> = [
        {
          author: "Marcus T.",
          quote:
            "Cleanest fade I have had in years. Marco takes his time and the hot towel finish is unmatched. Booked my next three cuts before I left the chair.",
          rating: 5,
          barber: "Marco",
          sort: 1,
        },
        {
          author: "Dernst A.",
          quote:
            "Dre lined me up so sharp my barber back home asked who did it. The waves are on point too.",
          rating: 5,
          barber: 'Andre "Dre" Bishop',
          sort: 2,
        },
        {
          author: "Sal R.",
          quote:
            "Old-school scissor work like my grandfather used to get. Tony is a true craftsman - the pompadour holds all week.",
          rating: 5,
          barber: "Tony Ricci",
          sort: 3,
        },
        {
          author: "Yaw B.",
          quote:
            "Finally a barber who actually knows textured hair. Kofi set my twists right and showed me how to keep them fresh.",
          rating: 5,
          barber: "Kofi Mensah",
          sort: 4,
        },
        {
          author: "Priya & Sons",
          quote:
            "Luz was so patient with my son's first haircut. He walked out with a fresh cut and a huge smile. The whole shop has a great vibe.",
          rating: 5,
          barber: "Luz Ortega",
          sort: 5,
        },
        {
          author: "Andre W.",
          quote:
            "Booking online with the deposit made it easy and I have never waited past my time. The membership pays for itself.",
          rating: 5,
          barber: null,
          sort: 6,
        },
      ];
      for (const t of testimonials) {
        await sql`
          INSERT INTO testimonials (author_name, quote, rating, barber_id, sort_order)
          VALUES (
            ${t.author}, ${t.quote}, ${t.rating},
            ${t.barber ? sql`(SELECT id FROM barbers WHERE display_name = ${t.barber})` : null},
            ${t.sort}
          )
        `;
      }
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
