import { join } from "node:path";
import { mkdir, writeFile } from "node:fs/promises";
import { randomUUID } from "node:crypto";
import { deflateSync } from "node:zlib";
import postgres from "postgres";
import bcrypt from "bcryptjs";
import { addDays, format } from "date-fns";
import { fromZonedTime, toZonedTime } from "date-fns-tz";

/**
 * Lived-in demo seed. Layers on top of the base `npm run seed`: six weeks of
 * appointment history, today's activity, a busy upcoming week, and data in
 * every feature (tips, reviews, notes, loyalty, promos, memberships, series,
 * waitlist, walk-ins, gallery photos, notifications). Re-runnable: wipes and
 * rebuilds only demo-owned rows (@demo.local clients + all activity tables).
 *
 * Run AFTER the base seed:  npm run seed && npm run seed:demo
 */

const CONN =
  process.env.DATABASE_URL ??
  "postgres://postgres:password@localhost:54331/barberbook";
const TZ = "America/New_York";
const UPLOADS_DIR = process.env.UPLOADS_DIR ?? join(process.cwd(), "uploads");

// Deterministic PRNG so reruns produce the same believable shop.
function mulberry32(seed: number): () => number {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const rnd = mulberry32(1337);
const pick = <T>(arr: readonly T[]): T => arr[Math.floor(rnd() * arr.length)]!;
const chance = (p: number): boolean => rnd() < p;
const between = (lo: number, hi: number): number =>
  lo + Math.floor(rnd() * (hi - lo + 1));

/** Instant for a shop-local date (YYYY-MM-DD) + minutes from midnight. */
function at(date: string, minutes: number): Date {
  const base = fromZonedTime(`${date} 00:00:00`, TZ);
  return new Date(base.getTime() + minutes * 60_000);
}
const dateStr = (d: Date): string => format(toZonedTime(d, TZ), "yyyy-MM-dd");

// ---------------------------------------------------------------------------
// Tiny PNG writer (truecolor, no deps) for gallery placeholder shots.
// ---------------------------------------------------------------------------
function crc32(buf: Buffer): number {
  let c: number;
  const table: number[] = [];
  for (let n = 0; n < 256; n++) {
    c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    table[n] = c >>> 0;
  }
  let crc = 0xffffffff;
  for (const b of buf) crc = table[(crc ^ b) & 0xff]! ^ (crc >>> 8);
  return (crc ^ 0xffffffff) >>> 0;
}
function chunk(type: string, data: Buffer): Buffer {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const body = Buffer.concat([Buffer.from(type, "ascii"), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body));
  return Buffer.concat([len, body, crc]);
}
type Rgb = [number, number, number];
function gradientPng(size: number, from: Rgb, to: Rgb, accent: Rgb): Buffer {
  const raw = Buffer.alloc(size * (1 + size * 3));
  for (let y = 0; y < size; y++) {
    const row = y * (1 + size * 3);
    raw[row] = 0; // filter: none
    for (let x = 0; x < size; x++) {
      const t = (x + y) / (2 * size);
      // A diagonal "clipper stripe" band in the accent color.
      const band = Math.abs(x - y) < size * 0.06;
      const px: Rgb = band
        ? accent
        : [
            Math.round(from[0] + (to[0] - from[0]) * t),
            Math.round(from[1] + (to[1] - from[1]) * t),
            Math.round(from[2] + (to[2] - from[2]) * t),
          ];
      const o = row + 1 + x * 3;
      raw[o] = px[0];
      raw[o + 1] = px[1];
      raw[o + 2] = px[2];
    }
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 2; // truecolor
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk("IHDR", ihdr),
    chunk("IDAT", deflateSync(raw)),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

// ---------------------------------------------------------------------------

interface BarberRow {
  id: string;
  display_name: string;
  user_id: string | null;
}
interface ServiceRow {
  id: string;
  name: string;
  duration_min: number;
  price_cents: number;
}

const FIRST = ["Malik","Devon","Luis","Jamal","Chris","Hector","Terrell","Angel","Darnell","Moe","Isaiah","Rafael","Quincy","Andre","Jayden","Omar","Vince","Trey","Marcus","Julio","Damian","Reggie","Elias","Kareem"];
const LAST = ["Rivera","Johnson","Santos","Brooks","Washington","Cruz","Bailey","Mendez","Carter","Diallo","Freeman","Ortiz","Grant","Peralta","Simmons","Vargas","Holloway","Nunez","Boyd","Acosta","Marsh","Delgado","Pryce","Osei"];

const REVIEW_COMMENTS = [
  "Best fade in the Bronx, period. Walked out feeling brand new.",
  "Quick, clean, and the line-up was laser sharp.",
  "My barber knows exactly what I want before I sit down. That's why I keep coming back.",
  "Great with my son - patient and the cut came out perfect.",
  "The hot towel at the end is worth it every time.",
  "Waited a little past my slot but the cut made up for it.",
  "Beard work is unmatched. Shaped it better than I asked for.",
  "Been coming every two weeks for months. Never a bad cut.",
  "Booked online, walked in, straight to the chair. Smooth every time.",
  "Curls finally look right. He even showed me how to keep them up.",
  "Solid cut, fair price. The shop has a real neighborhood feel.",
  "Freestyle design came out crazy. Everybody at school asked where I got it.",
];

const NOTE_POOL = [
  "Likes a #2 on the sides, scissor work on top. No razor on the neck.",
  "Always running 5-10 min late - keep the slot anyway, good tipper.",
  "Sensitive skin - use the guard, no hot towel on the face.",
  "Talkative, Knicks fan. Ask about his kids.",
  "Prefers quiet cuts, brings headphones. Don't take it personal.",
  "Growing the beard out - shape only, do NOT take length.",
  "Kid gets nervous with clippers, start with scissors.",
  "Wants the same cut as his IG saved photo - he'll show you.",
];

async function main(): Promise<void> {
  const sql = postgres(CONN, { max: 1, onnotice: () => {} });
  const t0 = Date.now();
  try {
    const barbers = await sql<BarberRow[]>`
      SELECT id, display_name, user_id FROM barbers WHERE active = true ORDER BY display_name`;
    const services = await sql<ServiceRow[]>`
      SELECT id, name, duration_min, price_cents FROM services WHERE active = true`;
    const rules = await sql<{ barber_id: string; weekday: number; start_min: number; end_min: number }[]>`
      SELECT barber_id, weekday, start_min, end_min FROM availability_rules`;
    const offerings = await sql<{ barber_id: string; service_id: string; price_cents: number | null }[]>`
      SELECT barber_id, service_id, price_cents FROM barber_services`;
    const [admin] = await sql<{ id: string }[]>`SELECT id FROM users WHERE role = 'admin' LIMIT 1`;
    const [sampleClient] = await sql<{ id: string }[]>`
      SELECT id FROM users WHERE email = 'client@barberbook.local'`;
    const [plan] = await sql<{ id: string }[]>`SELECT id FROM membership_plans LIMIT 1`;
    if (barbers.length === 0 || services.length === 0 || !admin || !plan) {
      throw new Error("Run `npm run seed` first - base data missing.");
    }

    const ruleFor = (barberId: string, weekday: number) =>
      rules.find((r) => r.barber_id === barberId && r.weekday === weekday);
    const priceFor = (barberId: string, svc: ServiceRow): number =>
      offerings.find((o) => o.barber_id === barberId && o.service_id === svc.id)
        ?.price_cents ?? svc.price_cents;
    const offeredServices = (barberId: string): ServiceRow[] =>
      services.filter((s) =>
        offerings.some((o) => o.barber_id === barberId && o.service_id === s.id),
      );

    // --- Wipe previous demo-owned rows (order matters for FKs) ---
    console.log("[demo] wiping previous demo data...");
    await sql`DELETE FROM reviews`;
    await sql`DELETE FROM reminder_log`;
    await sql`DELETE FROM notifications`;
    await sql`DELETE FROM payments`;
    await sql`DELETE FROM series_occurrences`;
    await sql`DELETE FROM recurring_series`;
    await sql`DELETE FROM waitlist_entries`;
    await sql`DELETE FROM walk_ins`;
    await sql`DELETE FROM client_notes`;
    await sql`DELETE FROM client_nudges`;
    await sql`DELETE FROM loyalty`;
    await sql`UPDATE appointments SET credit_id = NULL`;
    await sql`DELETE FROM membership_credits`;
    await sql`DELETE FROM memberships`;
    await sql`DELETE FROM appointments`;
    await sql`DELETE FROM discount_codes`;
    await sql`DELETE FROM barber_photos`;
    await sql`DELETE FROM users WHERE email LIKE '%@demo.local' OR email LIKE 'walkin-%@guest.local'`;

    // --- Shop policy: loyalty + nudges on ---
    await sql`
      UPDATE shop_settings
      SET loyalty_every_n = 5, rebook_after_days = 28, winback_after_days = 90
      WHERE id = 1`;

    // --- Clients ---
    console.log("[demo] creating clients...");
    const clientHash = await bcrypt.hash("client1234", 10);
    const clients: { id: string; name: string; phone: string }[] = [];
    const now = new Date();
    for (let i = 0; i < 22; i++) {
      const name = `${FIRST[i]!} ${LAST[i]!}`;
      const email = `${FIRST[i]!.toLowerCase()}.${LAST[i]!.toLowerCase()}@demo.local`;
      const phone = `917-555-0${String(100 + i)}`;
      const createdAt = new Date(now.getTime() - between(30, 200) * 86_400_000);
      const emailOptOut = i === 3 || i === 11;
      const smsOptOut = i === 7;
      const [row] = await sql<{ id: string }[]>`
        INSERT INTO users (email, password_hash, name, phone, role, email_opt_out, sms_opt_out, created_at)
        VALUES (${email}, ${clientHash}, ${name}, ${phone}, 'client', ${emailOptOut}, ${smsOptOut}, ${createdAt})
        RETURNING id`;
      clients.push({ id: row!.id, name, phone });
    }
    if (sampleClient) clients.push({ id: sampleClient.id, name: "Sample Client", phone: "555-010-0100" });

    // Regulars book most of the visits; the tail is occasional.
    const regulars = clients.slice(0, 8);
    const weightedClient = (): { id: string; name: string; phone: string } =>
      chance(0.55) ? pick(regulars) : pick(clients);

    // --- Discount codes ---
    await sql`
      INSERT INTO discount_codes (code, kind, amount, active, max_uses, used_count, expires_at)
      VALUES
        ('WELCOME15', 'percent', 15, true, NULL, 14, NULL),
        ('FADEFRIDAY', 'fixed', 1000, true, 50, 9, ${addDays(now, 45)}),
        ('OPENING25', 'percent', 25, false, 100, 41, ${addDays(now, -30)})`;

    // --- Appointment history (past 42 days) + upcoming week ---
    console.log("[demo] booking six weeks of history + the upcoming week...");
    interface Appt {
      id: string;
      client: { id: string; name: string };
      barberId: string;
      service: ServiceRow;
      startAt: Date;
      endAt: Date;
      status: string;
      priceCents: number;
      discountCode: string | null;
      discountCents: number;
    }
    const appts: Appt[] = [];
    const today = dateStr(now);
    const nowLocalMin = (() => {
      const z = toZonedTime(now, TZ);
      return z.getHours() * 60 + z.getMinutes();
    })();

    const insertAppt = async (a: {
      client: { id: string; name: string };
      barberId: string;
      service: ServiceRow;
      startAt: Date;
      status: string;
      discount?: { code: string; cents: number };
      reserved?: boolean;
    }): Promise<Appt> => {
      const priceCents = priceFor(a.barberId, a.service);
      const discountCents = a.discount?.cents ?? 0;
      const endAt = new Date(a.startAt.getTime() + a.service.duration_min * 60_000);
      const tier = a.reserved ? "unconfirmed" : chance(0.2) ? "member" : "unconfirmed";
      const confirmedAt =
        a.status === "confirmed" && !a.reserved
          ? new Date(a.startAt.getTime() - between(2, 40) * 3_600_000)
          : null;
      const deadline = a.reserved
        ? new Date(a.startAt.getTime() - 15 * 60_000)
        : null;
      const canceled = a.status === "canceled";
      const createdAt = new Date(a.startAt.getTime() - between(1, 12) * 86_400_000);
      const [row] = await sql<{ id: string }[]>`
        INSERT INTO appointments
          (client_id, barber_id, service_id, start_at, end_at, status,
           deposit_cents, remainder_cents, discount_code, discount_cents,
           hold_tier, grace_minutes, attendance_confirmed_at, confirmation_deadline,
           cancel_reason, canceled_at, created_at)
        VALUES
          (${a.client.id}, ${a.barberId}, ${a.service.id}, ${a.startAt}, ${endAt},
           ${a.status === "reserved" ? "reserved" : a.status},
           0, ${priceCents - discountCents}, ${a.discount?.code ?? null}, ${discountCents},
           ${tier}, ${tier === "member" ? 15 : 10}, ${confirmedAt},
           ${deadline}, ${canceled ? (chance(0.8) ? "client" : "admin") : null},
           ${canceled ? new Date(a.startAt.getTime() - between(3, 48) * 3_600_000) : null},
           ${createdAt})
        RETURNING id`;
      const appt: Appt = {
        id: row!.id,
        client: a.client,
        barberId: a.barberId,
        service: a.service,
        startAt: a.startAt,
        endAt,
        status: a.status,
        priceCents,
        discountCode: a.discount?.code ?? null,
        discountCents,
      };
      appts.push(appt);
      return appt;
    };

    // One pass per barber per day, walking non-overlapping slots forward.
    for (let dayOffset = -42; dayOffset <= 7; dayOffset++) {
      const d = dateStr(addDays(now, dayOffset));
      const weekday = new Date(`${d}T12:00:00Z`).getDay();
      for (const b of barbers) {
        const rule = ruleFor(b.id, weekday);
        if (!rule) continue;
        const menu = offeredServices(b.id);
        if (menu.length === 0) continue;
        const target = dayOffset < 0 ? between(2, 5) : dayOffset === 0 ? between(3, 4) : between(2, 4);
        let cursor = rule.start_min + pick([0, 15, 30, 45, 60]);
        for (let k = 0; k < target; k++) {
          const service = pick(menu);
          if (cursor + service.duration_min > rule.end_min) break;
          // Snap to the 15-min grid.
          cursor = Math.ceil(cursor / 15) * 15;
          const startAt = at(d, cursor);
          const isPast = startAt.getTime() < now.getTime();

          let status: string;
          let reserved = false;
          if (isPast) {
            const roll = rnd();
            status = roll < 0.88 ? "completed" : roll < 0.93 ? "no_show" : "canceled";
          } else {
            reserved = chance(0.15);
            status = reserved ? "reserved" : "confirmed";
          }
          // Today: keep the shop honest - mornings resolved, afternoon live.
          if (dayOffset === 0 && cursor < nowLocalMin) {
            status = chance(0.9) ? "completed" : "no_show";
            reserved = false;
          }

          const discount =
            status === "completed" && chance(0.1)
              ? { code: "WELCOME15", cents: Math.round(priceFor(b.id, service) * 0.15) }
              : undefined;

          await insertAppt({
            client: weightedClient(),
            barberId: b.id,
            service,
            startAt,
            status,
            discount,
            reserved,
          });
          cursor += service.duration_min + 5 + pick([10, 25, 40, 55, 85]);
        }
      }
    }

    const completed = appts.filter((a) => a.status === "completed");
    console.log(`[demo] ${appts.length} appointments (${completed.length} completed)`);

    // --- Tips on ~35% of completed visits ---
    console.log("[demo] recording tips...");
    let tips = 0;
    for (const a of completed) {
      if (!chance(0.35)) continue;
      const pct = pick([0.15, 0.18, 0.2, 0.25]);
      const amount = Math.round((a.priceCents * pct) / 100) * 100;
      await sql`
        INSERT INTO payments (appointment_id, client_id, type, amount_cents, status, created_at)
        VALUES (${a.id}, ${a.client.id}, 'tip', ${amount}, 'succeeded', ${a.endAt})`;
      tips++;
    }

    // --- Reviews: mostly approved history + a small pending queue ---
    console.log("[demo] writing reviews...");
    const reviewed = [...completed]
      .filter((a) => a.startAt.getTime() < now.getTime() - 86_400_000)
      .sort(() => rnd() - 0.5)
      .slice(0, 26);
    let ri = 0;
    for (const a of reviewed) {
      const rating = chance(0.62) ? 5 : chance(0.75) ? 4 : 3;
      const status = ri < 23 ? "approved" : "pending";
      await sql`
        INSERT INTO reviews (appointment_id, client_id, barber_id, rating, comment, status, created_at)
        VALUES (${a.id}, ${a.client.id}, ${a.barberId}, ${rating},
                ${chance(0.85) ? pick(REVIEW_COMMENTS) : null}, ${status},
                ${new Date(a.endAt.getTime() + between(2, 30) * 3_600_000)})`;
      ri++;
    }

    // --- Memberships: four Fresh Club regulars ---
    console.log("[demo] activating memberships...");
    for (const c of regulars.slice(0, 4)) {
      const [m] = await sql<{ id: string }[]>`
        INSERT INTO memberships (client_id, plan_id, status, current_period_end, created_at)
        VALUES (${c.id}, ${plan.id}, 'active', ${addDays(now, between(8, 24))},
                ${new Date(now.getTime() - between(40, 120) * 86_400_000)})
        RETURNING id`;
      await sql`
        INSERT INTO membership_credits (membership_id, granted, consumed, period_start, period_end)
        VALUES (${m!.id}, 2, ${pick([0, 1, 1, 2])}, ${addDays(now, -between(5, 20))}, ${addDays(now, between(8, 24))})`;
    }

    // --- Loyalty punch-cards from real completed counts ---
    const perClient = new Map<string, number>();
    for (const a of completed) {
      perClient.set(a.client.id, (perClient.get(a.client.id) ?? 0) + 1);
    }
    for (const [clientId, n] of perClient) {
      await sql`
        INSERT INTO loyalty (client_id, completed_count, free_credits)
        VALUES (${clientId}, ${n}, ${n >= 10 ? 1 : 0})
        ON CONFLICT (client_id) DO NOTHING`;
    }

    // --- Client notes from the chairs ---
    console.log("[demo] jotting client notes...");
    for (let i = 0; i < NOTE_POOL.length; i++) {
      const c = clients[i * 2]!;
      const author = chance(0.7) ? pick(barbers).user_id : admin.id;
      await sql`
        INSERT INTO client_notes (client_id, author_id, body, created_at)
        VALUES (${c.id}, ${author}, ${NOTE_POOL[i]!}, ${new Date(now.getTime() - between(2, 40) * 86_400_000)})`;
    }

    // --- Recurring series for two die-hard regulars ---
    console.log("[demo] setting up standing appointments...");
    let seriesMade = 0;
    for (const b of barbers.slice(0, 2)) {
      const c = regulars[seriesMade]!;
      const menu = offeredServices(b.id);
      const svc = menu[0]!;
      const wd = rules.find((r) => r.barber_id === b.id)!.weekday;
      const rule = ruleFor(b.id, wd)!;
      const timeMin = rule.end_min - 90;
      // Next occurrence of that weekday at least 8 days out (clear of the
      // random upcoming bookings above).
      let occ = addDays(now, 8);
      while (new Date(`${dateStr(occ)}T12:00:00Z`).getDay() !== wd) occ = addDays(occ, 1);
      const occDate = dateStr(occ);
      const anchor = dateStr(addDays(occ, -28));
      const [s] = await sql<{ id: string }[]>`
        INSERT INTO recurring_series (client_id, barber_id, service_id, cadence_weeks, weekday, time_min, status, anchor_date, next_horizon_date, created_at)
        VALUES (${c.id}, ${b.id}, ${svc.id}, 2, ${wd}, ${timeMin}, 'active', ${anchor}, ${dateStr(addDays(now, 28))}, ${addDays(now, -35)})
        RETURNING id`;
      const appt = await insertAppt({
        client: c,
        barberId: b.id,
        service: svc,
        startAt: at(occDate, timeMin),
        status: "confirmed",
      });
      await sql`
        INSERT INTO series_occurrences (series_id, appointment_id, scheduled_date, status)
        VALUES (${s!.id}, ${appt.id}, ${occDate}, 'booked')`;
      seriesMade++;
    }

    // --- Waitlist: exact-slot lines on busy upcoming slots + flexible days ---
    console.log("[demo] filling the waitlist...");
    const upcomingLive = appts.filter(
      (a) => a.startAt.getTime() > now.getTime() && (a.status === "confirmed" || a.status === "reserved"),
    );
    const lined = upcomingLive.slice(0, 3);
    for (const a of lined) {
      const waiter = pick(clients.filter((c) => c.id !== a.client.id));
      await sql`
        INSERT INTO waitlist_entries (client_id, barber_id, service_id, desired_start_at, created_at)
        VALUES (${waiter.id}, ${a.barberId}, ${a.service.id}, ${a.startAt}, ${new Date(now.getTime() - between(4, 48) * 3_600_000)})
        ON CONFLICT DO NOTHING`;
    }
    for (const dOff of [1, 2]) {
      const d = dateStr(addDays(now, dOff));
      const b = pick(barbers);
      const menu = offeredServices(b.id);
      if (menu.length === 0) continue;
      const dayEnd = fromZonedTime(`${dateStr(addDays(now, dOff + 1))} 00:00:00`, TZ);
      const waiter = pick(clients);
      await sql`
        INSERT INTO waitlist_entries (client_id, barber_id, service_id, desired_start_at, flexible, desired_date, last_notified_at)
        VALUES (${waiter.id}, ${b.id}, ${menu[0]!.id}, ${dayEnd}, true, ${d},
                ${dOff === 1 ? new Date(now.getTime() - 2 * 3_600_000) : null})
        ON CONFLICT DO NOTHING`;
    }

    // --- Walk-in queue: a live shop floor right now ---
    console.log("[demo] lining up walk-ins...");
    const [wSvc] = services;
    const wb = barbers[0]!;
    await sql`
      INSERT INTO walk_ins (barber_id, name, phone, service_id, status, created_at, called_at, done_at)
      VALUES
        (${wb.id}, 'Papi',  NULL, ${wSvc!.id}, 'serving', ${new Date(now.getTime() - 55 * 60_000)}, ${new Date(now.getTime() - 12 * 60_000)}, NULL),
        (NULL, 'Jordan', '917-555-0250', ${wSvc!.id}, 'waiting', ${new Date(now.getTime() - 25 * 60_000)}, NULL, NULL),
        (${barbers[1]!.id}, 'Smiley', NULL, NULL, 'waiting', ${new Date(now.getTime() - 14 * 60_000)}, NULL, NULL),
        (NULL, 'Big Rob', '917-555-0251', NULL, 'waiting', ${new Date(now.getTime() - 6 * 60_000)}, NULL, NULL),
        (${wb.id}, 'Nestor', NULL, ${wSvc!.id}, 'done', ${new Date(now.getTime() - 3 * 3_600_000)}, ${new Date(now.getTime() - 170 * 60_000)}, ${new Date(now.getTime() - 140 * 60_000)}),
        (${barbers[2]!.id}, 'DJ', NULL, NULL, 'done', ${new Date(now.getTime() - 4 * 3_600_000)}, ${new Date(now.getTime() - 230 * 60_000)}, ${new Date(now.getTime() - 200 * 60_000)})`;

    // --- Nudge bookkeeping: one rebook already sent ---
    const lapsed = clients[15]!;
    await sql`
      INSERT INTO client_nudges (client_id, kind, last_sent_at)
      VALUES (${lapsed.id}, 'rebook', ${addDays(now, -3)})
      ON CONFLICT DO NOTHING`;

    // --- Notifications: a believable bell for admin + sample client ---
    console.log("[demo] ringing the bell...");
    if (sampleClient) {
      const mine = appts.filter((a) => a.client.id === sampleClient.id);
      const nextMine = mine.find((a) => a.startAt.getTime() > now.getTime());
      const rows: Array<[string, string, string, string | null, Date, Date | null]> = [
        ["reminder", "Appointment in 24 hours", "Your cut is tomorrow - see your appointments for the time.", nextMine?.id ?? null, new Date(now.getTime() - 26 * 3_600_000), new Date(now.getTime() - 20 * 3_600_000)],
        ["open_slot", "A spot just opened", "Marco has an opening at 3:00 PM today - book it from the Book page before it goes.", null, new Date(now.getTime() - 5 * 3_600_000), null],
        ["review_request", "How was your cut?", "Leave a quick rating and review from your appointments page.", null, new Date(now.getTime() - 2 * 86_400_000), new Date(now.getTime() - 1.5 * 86_400_000)],
        ["loyalty", "You earned a free cut!", "That's 10 visits - your next cut is on us. Pick \"use a free cut\" at booking.", null, new Date(now.getTime() - 4 * 86_400_000), null],
        ["promoted", "You're in - slot booked", "A spot you were waiting for opened up and has been booked for you.", null, new Date(now.getTime() - 6 * 86_400_000), new Date(now.getTime() - 5 * 86_400_000)],
      ];
      for (const [kind, title, body, apptId, createdAt, readAt] of rows) {
        await sql`
          INSERT INTO notifications (user_id, kind, title, body, appointment_id, created_at, read_at)
          VALUES (${sampleClient.id}, ${kind}, ${title}, ${body}, ${apptId}, ${createdAt}, ${readAt})`;
      }
    }
    await sql`
      INSERT INTO notifications (user_id, kind, title, body, created_at, read_at)
      VALUES
        (${admin.id}, 'reminder', 'Marco: chair in 30 minutes', 'Classic Cut at the top of the hour.', ${new Date(now.getTime() - 40 * 60_000)}, NULL),
        (${admin.id}, 'reminder', 'Tony Ricci: chair in 24 hours', 'The Works tomorrow morning.', ${new Date(now.getTime() - 3 * 3_600_000)}, ${new Date(now.getTime() - 2 * 3_600_000)})`;

    // --- Gallery: three placeholder work shots per barber ---
    console.log("[demo] hanging gallery photos...");
    await mkdir(UPLOADS_DIR, { recursive: true });
    const palettes: Array<{ from: Rgb; to: Rgb; accent: Rgb }> = [
      { from: [82, 68, 46], to: [214, 164, 84], accent: [250, 224, 150] },
      { from: [56, 76, 104], to: [150, 180, 214], accent: [240, 231, 205] },
      { from: [96, 52, 78], to: [200, 120, 152], accent: [246, 198, 120] },
      { from: [52, 88, 68], to: [140, 194, 158], accent: [238, 228, 186] },
      { from: [100, 64, 44], to: [216, 150, 102], accent: [252, 216, 156] },
    ];
    const captions = [
      ["Mid skin fade, crispy line", "Beard sculpt + hot towel", "Waves on deck"],
      ["Burst fade Friday", "Line-up sharper than a tack", "Temple taper"],
      ["Classic pompadour", "Scissor-over-comb finish", "Straight razor shave"],
      ["Curly crop shaped up", "Twist setup day one", "Sponge coils"],
      ["Freestyle part design", "Kid's first cut - nailed it", "Editorial texture"],
    ];
    for (let bi = 0; bi < barbers.length; bi++) {
      const pal = palettes[bi % palettes.length]!;
      for (let p = 0; p < 3; p++) {
        const fileName = `${randomUUID()}.png`;
        const shade = (c: Rgb, f: number): Rgb => [
          Math.min(255, Math.round(c[0] * f)),
          Math.min(255, Math.round(c[1] * f)),
          Math.min(255, Math.round(c[2] * f)),
        ];
        const img = gradientPng(480, shade(pal.from, 1 + p * 0.15), shade(pal.to, 1 + p * 0.1), pal.accent);
        await writeFile(join(UPLOADS_DIR, fileName), img);
        await sql`
          INSERT INTO barber_photos (barber_id, file_name, caption, sort_order, created_at)
          VALUES (${barbers[bi]!.id}, ${fileName}, ${captions[bi % captions.length]![p]!}, ${p},
                  ${new Date(now.getTime() - between(1, 30) * 86_400_000)})`;
      }
    }

    const [counts] = await sql<[{ a: string; c: string; p: string; r: string }]>`
      SELECT (SELECT count(*) FROM appointments)::text AS a,
             (SELECT count(*) FROM users WHERE role='client')::text AS c,
             (SELECT count(*) FROM payments WHERE type='tip')::text AS p,
             (SELECT count(*) FROM reviews)::text AS r`;
    console.log(
      `[demo] done in ${((Date.now() - t0) / 1000).toFixed(1)}s: ${counts!.a} appointments, ` +
        `${counts!.c} clients, ${counts!.p} tips (${tips} new), ${counts!.r} reviews, ` +
        `walk-ins live, waitlist filled, gallery hung.`,
    );
    console.log("[demo] demo clients sign in as e.g. malik.rivera@demo.local / client1234");
  } finally {
    await sql.end({ timeout: 5 });
  }
}

main().catch((err: unknown) => {
  console.error("[demo] failed:", err);
  process.exit(1);
});
