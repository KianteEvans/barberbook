import { NextResponse } from "next/server";
import { and, eq, gt, inArray, isNull, lt, lte } from "drizzle-orm";
import { format } from "date-fns";
import { toZonedTime } from "date-fns-tz";
import { db } from "@/db/client";
import { appointments, barbers, reminderLog, services, users } from "@/db/schema";
import { authorizeCron } from "@/domain/cron";
import { loadSettings } from "@/domain/booking/load";
import { createNotification } from "@/domain/notifications/operations";
import { dueOffsets, offsetLabel, REMINDER_OFFSETS } from "@/domain/notifications/reminders";
import { expireStaleWaitlist, promoteForSlot } from "@/domain/waitlist/operations";

/**
 * The single time-driven worker. Runs the reminder pass (P1); later phases add
 * the unconfirmed-release sweep and waitlist promotion. Idempotent and
 * cadence-independent: reminders send at most once via the reminder_log unique
 * key, so it is safe to call every minute or every five.
 */
export async function POST(req: Request): Promise<NextResponse> {
  if (!authorizeCron(req)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const now = new Date();
  const reminders = await runReminderPass(now);
  const released = await runReleasePass(now);
  const expired = await expireStaleWaitlist(now);

  return NextResponse.json({ ok: true, reminders, released, expired });
}

/**
 * Release non-member holds that were never confirmed by their deadline, then
 * auto-book the next waiter into the freed slot (else it opens for walk-ins).
 */
async function runReleasePass(now: Date): Promise<number> {
  const stale = await db
    .update(appointments)
    .set({ status: "canceled", canceledAt: now, cancelReason: "unconfirmed" })
    .where(
      and(
        eq(appointments.status, "reserved"),
        isNull(appointments.attendanceConfirmedAt),
        lt(appointments.confirmationDeadline, now),
      ),
    )
    .returning({
      id: appointments.id,
      clientId: appointments.clientId,
      barberId: appointments.barberId,
      startAt: appointments.startAt,
    });

  for (const appt of stale) {
    await createNotification(
      appt.clientId,
      "released",
      "Reservation released",
      "You did not confirm attendance in time, so your reserved slot has been released.",
      appt.id,
    );
    await promoteForSlot(appt.barberId, appt.startAt, now);
  }
  return stale.length;
}

const MAX_OFFSET = Math.max(...REMINDER_OFFSETS);

async function runReminderPass(now: Date): Promise<number> {
  const settings = await loadSettings();
  const horizon = new Date(now.getTime() + MAX_OFFSET * 60_000);

  const upcoming = await db
    .select({
      id: appointments.id,
      startAt: appointments.startAt,
      clientId: appointments.clientId,
      serviceName: services.name,
      barberName: barbers.displayName,
      barberUserId: barbers.userId,
    })
    .from(appointments)
    .innerJoin(services, eq(appointments.serviceId, services.id))
    .innerJoin(barbers, eq(appointments.barberId, barbers.id))
    .where(
      and(
        inArray(appointments.status, ["pending_deposit", "confirmed", "reserved"]),
        gt(appointments.startAt, now),
        lte(appointments.startAt, horizon),
      ),
    );

  // Admin fallback recipients for barbers with no linked user account.
  let adminIds: string[] | null = null;
  const admins = async (): Promise<string[]> => {
    if (adminIds === null) {
      const rows = await db
        .select({ id: users.id })
        .from(users)
        .where(eq(users.role, "admin"));
      adminIds = rows.map((r) => r.id);
    }
    return adminIds;
  };

  let sent = 0;
  for (const appt of upcoming) {
    const localTime = format(toZonedTime(appt.startAt, settings.timezone), "h:mm a");
    for (const offset of dueOffsets(appt.startAt, now)) {
      const label = offsetLabel(offset);
      // The client reminder.
      if (await claimReminder(appt.id, offset, "client")) {
        await createNotification(
          appt.clientId,
          "reminder",
          `Appointment in ${label}`,
          `Your ${appt.serviceName} with ${appt.barberName} starts at ${localTime} (in ${label}).`,
          appt.id,
        );
        sent += 1;
      }
      // The barber reminder (linked user, else all admins).
      if (await claimReminder(appt.id, offset, "barber")) {
        const recipients = appt.barberUserId ? [appt.barberUserId] : await admins();
        for (const uid of recipients) {
          await createNotification(
            uid,
            "reminder",
            `${appt.barberName}: chair in ${label}`,
            `${appt.serviceName} at ${localTime} (in ${label}).`,
            appt.id,
          );
        }
        sent += recipients.length;
      }
    }
  }
  return sent;
}

/**
 * Reserve the right to send one reminder. The unique key on reminder_log makes
 * this atomic: exactly one caller inserts, the rest get an empty return.
 */
async function claimReminder(
  appointmentId: string,
  offsetMinutes: number,
  recipientKind: "client" | "barber",
): Promise<boolean> {
  const inserted = await db
    .insert(reminderLog)
    .values({ appointmentId, offsetMinutes, recipientKind })
    .onConflictDoNothing()
    .returning({ appointmentId: reminderLog.appointmentId });
  return inserted.length > 0;
}
