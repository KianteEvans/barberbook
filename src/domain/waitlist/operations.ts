import { and, asc, eq, lt } from "drizzle-orm";
import { format } from "date-fns";
import { toZonedTime } from "date-fns-tz";
import { db } from "@/db/client";
import { appointments, barbers, services, waitlistEntries } from "@/db/schema";
import { createBookingOp } from "@/domain/booking/operations";
import { dayRangeUtc, loadSettings } from "@/domain/booking/load";
import {
  consumeCreditOp,
  loadClientMembership,
  refundCreditOp,
} from "@/domain/memberships/operations";
import { createNotification } from "@/domain/notifications/operations";
import { ConflictError, ValidationError } from "@/domain/errors";
import { orderWaitlist } from "./priority";
import { shouldNotifyFlexible } from "./flexible";

/** Waitlist reads, join/leave, and the auto-book promotion engine. */

export interface WaitlistView {
  readonly id: string;
  readonly barberName: string;
  readonly serviceName: string;
  readonly desiredStartAt: Date;
  /** True for "any time that day" entries. */
  readonly flexible: boolean;
  readonly desiredDate: string | null;
  /** 1-based spot in the member-first line; null for flexible entries. */
  readonly position: number | null;
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

/**
 * Add a client to the "any time that day" line for a barber (idempotent).
 * desired_start_at stores the END of the shop-local day so the expiry sweep
 * treats the entry as live until the whole day has passed.
 */
export async function joinFlexibleWaitlistOp(input: {
  clientId: string;
  barberId: string;
  serviceId: string;
  /** Shop-local day, YYYY-MM-DD. */
  date: string;
}): Promise<void> {
  const settings = await loadSettings();
  const { end } = dayRangeUtc(input.date, settings.timezone);
  if (end.getTime() <= Date.now()) {
    throw new ValidationError("That day has already passed.");
  }
  const [existing] = await db
    .select({ id: waitlistEntries.id })
    .from(waitlistEntries)
    .where(
      and(
        eq(waitlistEntries.clientId, input.clientId),
        eq(waitlistEntries.barberId, input.barberId),
        eq(waitlistEntries.flexible, true),
        eq(waitlistEntries.desiredDate, input.date),
        eq(waitlistEntries.status, "waiting"),
      ),
    );
  if (existing) return;
  await db.insert(waitlistEntries).values({
    clientId: input.clientId,
    barberId: input.barberId,
    serviceId: input.serviceId,
    desiredStartAt: end,
    flexible: true,
    desiredDate: input.date,
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

/** A client's active (waiting) line entries with queue position. */
export async function loadClientWaitlist(clientId: string): Promise<WaitlistView[]> {
  const rows = await db
    .select({
      id: waitlistEntries.id,
      barberId: waitlistEntries.barberId,
      barberName: barbers.displayName,
      serviceName: services.name,
      desiredStartAt: waitlistEntries.desiredStartAt,
      flexible: waitlistEntries.flexible,
      desiredDate: waitlistEntries.desiredDate,
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

  // Position = rank in the member-first line for that exact slot. A client
  // holds few entries, so the per-entry lookups stay cheap.
  const out: WaitlistView[] = [];
  for (const row of rows) {
    let position: number | null = null;
    if (!row.flexible) {
      const peers = await db
        .select({
          id: waitlistEntries.id,
          clientId: waitlistEntries.clientId,
          createdAt: waitlistEntries.createdAt,
        })
        .from(waitlistEntries)
        .where(
          and(
            eq(waitlistEntries.barberId, row.barberId),
            eq(waitlistEntries.desiredStartAt, row.desiredStartAt),
            eq(waitlistEntries.status, "waiting"),
          ),
        );
      const members = new Set<string>();
      for (const cid of new Set(peers.map((p) => p.clientId))) {
        if (await loadClientMembership(cid)) members.add(cid);
      }
      const ordered = orderWaitlist(peers, members);
      const idx = ordered.findIndex((p) => p.id === row.id);
      position = idx >= 0 ? idx + 1 : null;
    }
    out.push({
      id: row.id,
      barberName: row.barberName,
      serviceName: row.serviceName,
      desiredStartAt: row.desiredStartAt,
      flexible: row.flexible,
      desiredDate: row.desiredDate,
      position,
    });
  }
  return out;
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
          eq(waitlistEntries.flexible, false),
          eq(waitlistEntries.status, "waiting"),
        ),
      );
    if (entries.length === 0) {
      // Nobody wanted this exact slot - tell "any time that day" waiters it
      // opened so they can grab it themselves.
      await notifyFlexibleWaiters(barberId, desiredStartAt, now);
      return null;
    }

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

/**
 * A slot freed with no exact waiter: alert flexible ("any time that day")
 * waiters for this barber, throttled per entry via last_notified_at. Alerts
 * only - flexible waiters book themselves, they are never auto-booked.
 */
async function notifyFlexibleWaiters(
  barberId: string,
  freedAt: Date,
  now: Date,
): Promise<void> {
  const settings = await loadSettings();
  const dateStr = format(toZonedTime(freedAt, settings.timezone), "yyyy-MM-dd");
  const waiters = await db
    .select({
      id: waitlistEntries.id,
      clientId: waitlistEntries.clientId,
      lastNotifiedAt: waitlistEntries.lastNotifiedAt,
    })
    .from(waitlistEntries)
    .where(
      and(
        eq(waitlistEntries.barberId, barberId),
        eq(waitlistEntries.flexible, true),
        eq(waitlistEntries.desiredDate, dateStr),
        eq(waitlistEntries.status, "waiting"),
      ),
    );
  if (waiters.length === 0) return;

  const { start, end } = dayRangeUtc(dateStr, settings.timezone);
  const [barber] = await db
    .select({ name: barbers.displayName })
    .from(barbers)
    .where(eq(barbers.id, barberId));
  const local = toZonedTime(freedAt, settings.timezone);
  const timeLabel = format(local, "h:mm a");
  const dayLabel = format(local, "EEE, MMM d");

  for (const w of waiters) {
    const notify = shouldNotifyFlexible({
      freedAt,
      dayStart: start,
      dayEnd: end,
      lastNotifiedAt: w.lastNotifiedAt,
      now,
    });
    if (!notify) continue;
    await createNotification(
      w.clientId,
      "open_slot",
      "A spot just opened",
      `${barber?.name ?? "Your barber"} has an opening at ${timeLabel} on ${dayLabel} - book it from the Book page before it goes.`,
    );
    await db
      .update(waitlistEntries)
      .set({ lastNotifiedAt: now })
      .where(eq(waitlistEntries.id, w.id));
  }
}

export interface ExpiredWaitlistEntry {
  readonly clientId: string;
  readonly desiredStartAt: Date;
  readonly flexible: boolean;
}

/** Sweep waiting entries whose slot time has passed. Called from the tick,
 *  which notifies each expired waiter. */
export async function expireStaleWaitlist(
  now = new Date(),
): Promise<ExpiredWaitlistEntry[]> {
  return db
    .update(waitlistEntries)
    .set({ status: "expired" })
    .where(
      and(
        eq(waitlistEntries.status, "waiting"),
        lt(waitlistEntries.desiredStartAt, now),
      ),
    )
    .returning({
      clientId: waitlistEntries.clientId,
      desiredStartAt: waitlistEntries.desiredStartAt,
      flexible: waitlistEntries.flexible,
    });
}

/** Distinct exact (barber, slot) pairs still wanted by waiters - for the tick
 *  to retry promotions missed to transient failures. */
export async function openSlotsWithWaiters(): Promise<
  Array<{ barberId: string; desiredStartAt: Date }>
> {
  const rows = await db
    .selectDistinct({
      barberId: waitlistEntries.barberId,
      desiredStartAt: waitlistEntries.desiredStartAt,
    })
    .from(waitlistEntries)
    .where(
      and(
        eq(waitlistEntries.status, "waiting"),
        eq(waitlistEntries.flexible, false),
      ),
    );
  return rows;
}
