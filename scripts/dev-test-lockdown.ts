import { sql } from "../src/db/client.js";
import { createBookingOp } from "../src/domain/booking/operations.js";
import { consumeCreditOp } from "../src/domain/memberships/operations.js";

/**
 * Dev integration check for the lockdown tiers. Books a non-member (no credit)
 * and a member (credit) appointment via the real op and asserts status/tier/
 * grace/confirmation-deadline. Also plants a past-deadline reserved row so the
 * tick release pass can be exercised by curl afterwards.
 */
async function main(): Promise<void> {
  const [client] = await sql`SELECT id FROM users WHERE email = 'client@barberbook.local'`;
  const barbers = await sql`SELECT id FROM barbers WHERE active = true ORDER BY created_at`;
  const [service] = await sql`SELECT id FROM services WHERE active = true ORDER BY price_cents LIMIT 1`;

  // Clean prior test bookings far in the future used by this script.
  await sql`
    DELETE FROM appointments
    WHERE client_id = ${client.id} AND start_at > now() + interval '20 hours'
  `;

  const base = Date.now() + 24 * 3600_000; // ~tomorrow, distinct barbers avoid overlap
  const slot = (h: number) => new Date(base + h * 3600_000);

  // 1. Non-member, no credit -> reserved / unconfirmed.
  const nonMember = await createBookingOp({
    clientId: client.id as string,
    barberId: barbers[0].id as string,
    serviceId: service.id as string,
    startAt: slot(0),
  });
  console.log("NON_MEMBER", { status: nonMember.status, tier: nonMember.tier });

  // 2. Member, credit -> confirmed / member.
  const creditId = await consumeCreditOp(client.id as string);
  const member = await createBookingOp({
    clientId: client.id as string,
    barberId: barbers[1].id as string,
    serviceId: service.id as string,
    startAt: slot(2),
    creditId,
  });
  console.log("MEMBER", { status: member.status, tier: member.tier });

  const [nm] = await sql`
    SELECT status, hold_tier, grace_minutes, confirmation_deadline IS NOT NULL AS has_deadline
    FROM appointments WHERE id = ${nonMember.id}`;
  const [mm] = await sql`
    SELECT status, hold_tier, grace_minutes, confirmation_deadline IS NOT NULL AS has_deadline
    FROM appointments WHERE id = ${member.id}`;
  console.log("NON_MEMBER_ROW", JSON.stringify(nm));
  console.log("MEMBER_ROW", JSON.stringify(mm));

  // 3. Plant a reserved row whose confirmation deadline is already past, for a
  //    far-future start (so it stays reserved until the tick releases it).
  const [planted] = await sql`
    INSERT INTO appointments (client_id, barber_id, service_id, start_at, end_at,
                              status, hold_tier, grace_minutes, confirmation_deadline)
    VALUES (${client.id}, ${barbers[2].id}, ${service.id},
            now() + interval '40 hours', now() + interval '41 hours',
            'reserved', 'unconfirmed', 10, now() - interval '1 minute')
    RETURNING id`;
  console.log("PLANTED_RESERVED", planted.id);

  await sql.end({ timeout: 5 });
}

main().catch((err: unknown) => {
  console.error(err);
  process.exit(1);
});
