import { and, asc, avg, count, eq, inArray, isNull, or, type SQL } from "drizzle-orm";
import { db } from "@/db/client";
import { barbers, services, walkIns } from "@/db/schema";
import { loadSettings } from "@/domain/booking/load";
import { sendSms } from "@/notifications/sms";
import { NotFoundError, ValidationError } from "@/domain/errors";
import { estimateWaitMin } from "./estimate";

/** In-shop walk-in queue: FIFO with "first available" (NULL barber) entries. */

export interface WalkinRow {
  readonly id: string;
  readonly name: string;
  readonly phone: string | null;
  readonly barberId: string | null;
  readonly barberName: string | null;
  readonly serviceName: string | null;
  readonly status: "waiting" | "serving" | "done" | "no_show" | "canceled";
  readonly createdAt: Date;
  readonly calledAt: Date | null;
  /** Rough minutes until called; 0 when next or already serving. */
  readonly estWaitMin: number;
}

/** Average active-service length + active chair count for wait estimates. */
async function queueFactors(): Promise<{ avgServiceMin: number; chairs: number }> {
  const [svc] = await db
    .select({ avgMin: avg(services.durationMin) })
    .from(services)
    .where(eq(services.active, true));
  const [chairRow] = await db
    .select({ n: count() })
    .from(barbers)
    .where(eq(barbers.active, true));
  return {
    avgServiceMin: Math.round(Number(svc?.avgMin ?? 30)) || 30,
    chairs: chairRow?.n ?? 1,
  };
}

async function liveQueue(where?: SQL): Promise<WalkinRow[]> {
  const rows = await db
    .select({
      id: walkIns.id,
      name: walkIns.name,
      phone: walkIns.phone,
      barberId: walkIns.barberId,
      barberName: barbers.displayName,
      serviceName: services.name,
      status: walkIns.status,
      createdAt: walkIns.createdAt,
      calledAt: walkIns.calledAt,
    })
    .from(walkIns)
    .leftJoin(barbers, eq(walkIns.barberId, barbers.id))
    .leftJoin(services, eq(walkIns.serviceId, services.id))
    .where(
      where
        ? and(inArray(walkIns.status, ["waiting", "serving"]), where)
        : inArray(walkIns.status, ["waiting", "serving"]),
    )
    .orderBy(asc(walkIns.createdAt));

  const { avgServiceMin, chairs } = await queueFactors();
  let ahead = 0;
  return rows.map((r) => {
    const estWaitMin =
      r.status === "waiting" ? estimateWaitMin(ahead, avgServiceMin, chairs) : 0;
    if (r.status === "waiting") ahead += 1;
    return { ...r, estWaitMin };
  });
}

/** The whole live queue (waiting + serving), FIFO. */
export async function loadWalkinQueue(): Promise<WalkinRow[]> {
  return liveQueue();
}

/** A barber's view: their own entries plus unassigned "first available" ones. */
export async function queueForBarber(barberId: string): Promise<WalkinRow[]> {
  return liveQueue(or(eq(walkIns.barberId, barberId), isNull(walkIns.barberId)));
}

export async function addWalkinOp(input: {
  name: string;
  phone?: string | null;
  serviceId?: string | null;
  barberId?: string | null;
}): Promise<void> {
  await db.insert(walkIns).values({
    name: input.name,
    phone: input.phone ?? null,
    serviceId: input.serviceId ?? null,
    barberId: input.barberId ?? null,
  });
}

/**
 * Claim the oldest waiting walk-in for this chair (own entries or "first
 * available"), mark it serving, and text the client if they left a number.
 * The status guard on the UPDATE makes concurrent claims race-safe: the loser
 * matches zero rows and moves to the next candidate.
 */
export async function callNextWalkinOp(
  barberId: string,
  now = new Date(),
): Promise<WalkinRow | null> {
  for (let attempt = 0; attempt < 5; attempt++) {
    const [next] = await db
      .select({ id: walkIns.id })
      .from(walkIns)
      .where(
        and(
          eq(walkIns.status, "waiting"),
          or(eq(walkIns.barberId, barberId), isNull(walkIns.barberId)),
        ),
      )
      .orderBy(asc(walkIns.createdAt))
      .limit(1);
    if (!next) return null;

    const [claimed] = await db
      .update(walkIns)
      .set({ status: "serving", calledAt: now, barberId })
      .where(and(eq(walkIns.id, next.id), eq(walkIns.status, "waiting")))
      .returning({ id: walkIns.id, name: walkIns.name, phone: walkIns.phone });
    if (!claimed) continue; // lost the race - try the next candidate

    if (claimed.phone) {
      const settings = await loadSettings();
      const [barber] = await db
        .select({ name: barbers.displayName })
        .from(barbers)
        .where(eq(barbers.id, barberId));
      await sendSms(
        claimed.phone,
        `You're up at ${settings.shopName}! Head to ${barber?.name ?? "the"} chair.`,
      );
    }
    const [row] = await liveQueue(eq(walkIns.id, claimed.id));
    return row ?? null;
  }
  return null;
}

/** Move a live entry to a terminal status. Barbers may only touch their own. */
export async function resolveWalkinOp(
  id: string,
  outcome: "done" | "no_show" | "canceled",
  ownBarberId: string | null,
  now = new Date(),
): Promise<void> {
  const [entry] = await db
    .select({ status: walkIns.status, barberId: walkIns.barberId })
    .from(walkIns)
    .where(eq(walkIns.id, id));
  if (!entry) throw new NotFoundError("Walk-in not found.");
  if (entry.status !== "waiting" && entry.status !== "serving") {
    throw new ValidationError("This walk-in is already resolved.");
  }
  if (
    ownBarberId !== null &&
    entry.barberId !== null &&
    entry.barberId !== ownBarberId
  ) {
    throw new ValidationError("That walk-in belongs to another chair.");
  }
  await db
    .update(walkIns)
    .set({ status: outcome, doneAt: now })
    .where(eq(walkIns.id, id));
}

/** Assign + start a specific waiting entry (admin flow). */
export async function startWalkinOp(
  id: string,
  barberId: string,
  now = new Date(),
): Promise<void> {
  const [claimed] = await db
    .update(walkIns)
    .set({ status: "serving", calledAt: now, barberId })
    .where(and(eq(walkIns.id, id), eq(walkIns.status, "waiting")))
    .returning({ id: walkIns.id, phone: walkIns.phone });
  if (!claimed) throw new ValidationError("That walk-in is no longer waiting.");
  if (claimed.phone) {
    const settings = await loadSettings();
    const [barber] = await db
      .select({ name: barbers.displayName })
      .from(barbers)
      .where(eq(barbers.id, barberId));
    await sendSms(
      claimed.phone,
      `You're up at ${settings.shopName}! Head to ${barber?.name ?? "the"} chair.`,
    );
  }
}
