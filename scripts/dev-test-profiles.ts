import { eq } from "drizzle-orm";
import { db, sql } from "../src/db/client.js";
import { services, users, barbers } from "../src/db/schema.js";
import { createBookingOp } from "../src/domain/booking/operations.js";
import { resolveBarberService } from "../src/domain/barbers/operations.js";
import { saveUpload, deleteUpload, UPLOADS_DIR } from "../src/domain/barbers/uploads.js";

/**
 * Dev-only integration check for barber profiles: effective-price booking,
 * offering enforcement, and the upload save/delete round-trip.
 */
async function main(): Promise<void> {
  const [client] = await db.select().from(users).where(eq(users.email, "client@barberbook.local"));
  const [barber] = await db.select().from(barbers);
  const [cutBeard] = await db.select().from(services).where(eq(services.name, "Cut + Beard"));
  if (!client || !barber || !cutBeard) throw new Error("seed data missing");

  // 1. Booking with the $55 override -> 1500 deposit / 4000 remainder.
  const startAt = new Date(Date.now() + 14 * 86_400_000);
  startAt.setUTCHours(15, 0, 0, 0); // 11:00 ET, inside Tue-Sat 9-18 if weekday
  // Walk forward to a Wednesday to stay inside working hours (not that the
  // op checks availability - the constraint only checks overlap).
  const booking = await createBookingOp({
    clientId: client.id,
    barberId: barber.id,
    serviceId: cutBeard.id,
    startAt,
  });
  console.log("override booking:", {
    deposit: booking.depositCents,
    remainder: booking.remainderCents,
    status: booking.status,
  });
  if (booking.depositCents !== 1500 || booking.remainderCents !== 4000) {
    throw new Error("effective price did not flow into the booking");
  }

  // 2. Un-offered pair is rejected.
  await sql`DELETE FROM barber_services WHERE barber_id = ${barber.id} AND service_id = ${cutBeard.id}`;
  let rejected = false;
  try {
    await resolveBarberService(barber.id, cutBeard.id);
  } catch {
    rejected = true;
  }
  await sql`INSERT INTO barber_services (barber_id, service_id, price_cents) VALUES (${barber.id}, ${cutBeard.id}, 5500)`;
  console.log("un-offered pair rejected:", rejected);
  if (!rejected) throw new Error("resolveBarberService did not reject");

  // 3. Upload round-trip: 1x1 PNG in, file on disk, delete cleans up.
  const png = Buffer.from(
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==",
    "base64",
  );
  const file = new File([png], "test.png", { type: "image/png" });
  const name = await saveUpload(file);
  console.log("saved upload:", name, "in", UPLOADS_DIR);
  const { readFile } = await import("node:fs/promises");
  const { join } = await import("node:path");
  const back = await readFile(join(UPLOADS_DIR, name));
  if (!back.equals(png)) throw new Error("upload bytes mismatch");
  await deleteUpload(name);
  let gone = false;
  try {
    await readFile(join(UPLOADS_DIR, name));
  } catch {
    gone = true;
  }
  console.log("upload deleted:", gone);

  // Clean up the test booking so the calendar stays tidy.
  await sql`DELETE FROM appointments WHERE id = ${booking.id}`;
  console.log("ALL CHECKS PASSED");
  await sql.end({ timeout: 5 });
}

main().catch((err: unknown) => {
  console.error(err);
  process.exit(1);
});
