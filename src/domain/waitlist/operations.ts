import { and, asc, eq, lt } from "drizzle-orm";
import { db } from "@/db/client";
import { appointments, barbers, services, waitlistEntries } from "@/db/schema";
import { createBookingOp } from "@/domain/booking/operations";
import {
  consumeCreditOp,
  loadClientMembership,
  refundCreditOp,
} from "@/domain/memberships/operations";
import { createNotification } from "@/domain/notifications/operations";
import { ConflictError, ValidationError } from "@/domain/errors";
import { orderWaitlist } from "./priority";

/** Waitlist reads, join/leave, and the auto-book promotion engine. */

export interface WaitlistView {
  readonly id: string;
  readonly barberName: string;
  readonly serviceName: string;
  readonly desiredStartAt: Date;
}

/** Add a client to the line for a specific barber + slot (idempotent). */
export async function joinWaitlistOp(input: {
  clientId: string;
  barberId: string;
  serviceId: string;
  desiredStartAt: Date;
}): Promise<void> {
  if (input.desiredStartAt.getTime() <= Date.now()) {
    throw new ValidationError("That time has already passed.");
  }
  const [existing] = await db
    .select({ id: waitlistEntries.id })
    .from(waitlistEntries)
    .where(
      and(
        eq(waitlistEntries.clientId, input.clientId),
        eq(waitlistEntries.barberId, input.barberId),
        eq(waitlistEntries.desiredStartAt, input.desiredStartAt),
        eq(waitlistEntries.status, "waiting"),
      ),
    );
  if (existing) return;
  await db.insert(waitlistEntries).values({
    clientId: input.clientId,
    barberId: input.barberId,
    serviceId: input.serviceId,
    desiredStartAt: input.desiredStartAt,
  });
}

export async function leaveWaitlistOp(entryId: string, clientId: string): Promise<void> {
  await db
    .update(waitlistEntries)
    .set({ status: "canceled" })
    .where(
      and(
        eq(waitlistEntries.id, entryId),
        eq(waitlistEntries.clientId, clientId),
        eq(waitlistEntries.status, "waiting"),
      ),
    );
}

/** A client's active (waiting) line entries, for the account page. */
export async function loadClientWaitlist(clientId: string): Promise<WaitlistView[]> {
  return db
    .select({
      id: waitlistEntries.id,
      barberName: barbers.displayName,
      serviceName: services.name,
      desiredStartAt: waitlistEntries.desiredStartAt,
    })
    .from(waitlistEntries)
    .innerJoin(barbers, eq(waitlistEntries.barberId, barbers.id))
    .innerJoin(services, eq(waitlistEntries.serviceId, services.id))
    .where(
      and(
        eq(waitlistEntries.clientId, clientId),
        eq(waitlistEntries.status, "waiting"),
      ),
    )
    .orderBy(asc(waitlistEntries.desiredStartAt));
}

/** How many are waiting for a given barber + slot (admin signal). */
export async function countWaitingForSlot(
  barberId: string,
  desiredStartAt: Date,
): Promise<number> {
  const rows = await db
    .select({ id: waitlistEntries.id })
    .from(waitlistEntries)
    .where(
      and(
        eq(waitlistEntries.barberId, barberId),
        eq(waitlistEntries.desiredStartAt, desiredStartAt),
        eq(waitlistEntries.status, "waiting"),
      ),
    );
  return rows.length;
}

/**
 * A slot just freed: auto-book the highest-priority waiter (member first, then
 * earliest joined). Books members-with-credits as confirmed; others as a
 * reserved hold, or a straight walk-in when the slot is too close to confirm.
 * Slot-taken races (23P01 -> ConflictError) advance to the next entry. Never
 * throws out of the caller (cancel / tick).
 */
export async function promoteForSlot(
  barberId: string,
  desiredStartAt: Date,
  now = new Date(),
): Promise<string | null> {
  try {
    if (desiredStartAt.getTime() <= now.getTime()) return null;

    const entries = await db
      .select({
        id: waitlistEntries.id,
        clientId: waitlistEntries.clientId,
        serviceId: waitlistEntries.serviceId,
        createdAt: waitlistEntries.createdAt,
      })
      .from(waitlistEntries)
      .where(
        and(
          eq(waitlistEntries.barberId, barberId),
          eq(waitlistEntries.desiredStartAt, desiredStartAt),
          eq(waitlistEntries.status, "waiting"),
        ),
      );
    if (entries.length === 0) return null;

    // Which waiting clients are active members (priority + credit-eligible)?
    const memberships = new Map<string, number>();
    for (const clientId of new Set(entries.map((e) => e.clientId))) {
      const m = await loadClientMembership(clientId, now);
      if (m) memberships.set(clientId, m.creditsAvailable);
    }
    const ordered = orderWaitlist(entries, new Set(memberships.keys()));

    for (const entry of ordered) {
      const promotedId = await bookPromotion(
        { ...entry, barberId, desiredStartAt },
        memberships.get(entry.clientId) ?? 0,
        now,
      );
      if (promotedId) {
        await db
          .update(waitlistEntries)
          .set({ status: "promoted" })
          .where(eq(waitlistEntries.id, entry.id));
        await createNotification(
          entry.clientId,
          "promoted",
          "You're in - slot booked",
          "A spot you were waiting for opened up and has been booked for you. See your appointments.",
          promotedId,
        );
        return promotedId;
      }
    }
    return null;
  } catch (err) {
    console.error("[waitlist] promotion failed:", err);
    return null;
  }
}

async function bookPromotion(
  entry: { clientId: string; serviceId: string; barberId: string; desiredStartAt: Date },
  creditsAvailable: number,
  now: Date,
): Promise<string | null> {
  let creditId: string | undefined;
  if (creditsAvailable > 0) {
    try {
      creditId = await consumeCreditOp(entry.clientId, now);
    } catch {
      creditId = undefined;
    }
  }
  try {
    const booking = await createBookingOp({
      clientId: entry.clientId,
      barberId: entry.barberId,
      serviceId: entry.serviceId,
      startAt: entry.desiredStartAt,
      ...(creditId ? { creditId } : {}),
    });
    // A promoted non-member lands 'reserved'; if the slot is too close to
    // require a T-minus confirmation, treat them as a walk-in (confirmed) so
    // the release pass doesn't immediately cancel it.
    if (booking.status === "reserved") {
      const [row] = await db
        .select({ deadline: appointments.confirmationDeadline })
        .from(appointments)
        .where(eq(appointments.id, booking.id));
      if (!row?.deadline || row.deadline.getTime() <= now.getTime()) {
        await db
          .update(appointments)
          .set({ status: "confirmed", attendanceConfirmedAt: now })
          .where(eq(appointments.id, booking.id));
      }
    }
    return booking.id;
  } catch (err) {
    // Slot retaken between free and rebook: give back the credit, try next.
    if (creditId) await refundCreditOp(creditId);
    if (err instanceof ConflictError) return null;
    throw err;
  }
}

/** Sweep waiting entries whose slot time has passed. Called from the tick. */
export async function expireStaleWaitlist(now = new Date()): Promise<number> {
  const expired = await db
    .update(waitlistEntries)
    .set({ status: "expired" })
    .where(
      and(
        eq(waitlistEntries.status, "waiting"),
        lt(waitlistEntries.desiredStartAt, now),
      ),
    )
    .returning({ id: waitlistEntries.id });
  return expired.length;
}

/** Distinct freed (barber, slot) pairs still wanted by waiters - for the tick
 *  to retry promotion after unconfirmed releases. */
export async function openSlotsWithWaiters(): Promise<
  Array<{ barberId: string; desiredStartAt: Date }>
> {
  const rows = await db
    .selectDistinct({
      barberId: waitlistEntries.barberId,
      desiredStartAt: waitlistEntries.desiredStartAt,
    })
    .from(waitlistEntries)
    .where(eq(waitlistEntries.status, "waiting"));
  return rows;
}
