import { cancelAppointmentOp } from "../src/domain/booking/operations.js";
import { refundCreditOp } from "../src/domain/memberships/operations.js";
import { sql } from "../src/db/client.js";

/**
 * Dev-only integration check: cancel the most recent credit-booked
 * appointment through the real operation and verify the credit returns.
 * Usage: DATABASE_URL=... npx tsx scripts/dev-test-cancel.ts
 */
async function main(): Promise<void> {
  const [appt] = await sql`
    SELECT id, client_id FROM appointments
    WHERE credit_id IS NOT NULL AND status = 'confirmed'
    ORDER BY created_at DESC LIMIT 1
  `;
  if (!appt) throw new Error("no credit-booked appointment found");

  const outcome = await cancelAppointmentOp({
    appointmentId: appt.id as string,
    clientId: appt.client_id as string,
  });
  console.log("cancel outcome:", outcome);
  if (outcome.creditId) {
    await refundCreditOp(outcome.creditId);
    console.log("credit refunded");
  }

  const [credit] = await sql`
    SELECT granted, consumed FROM membership_credits ORDER BY period_start DESC LIMIT 1
  `;
  const [after] = await sql`SELECT status FROM appointments WHERE id = ${appt.id}`;
  console.log("appointment:", after, "credits:", credit);
  await sql.end({ timeout: 5 });
}

main().catch((err: unknown) => {
  console.error(err);
  process.exit(1);
});
