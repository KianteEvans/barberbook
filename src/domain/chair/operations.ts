import { and, asc, eq, gte, lt, sql } from "drizzle-orm";
import { db } from "@/db/client";
import { appointments, barbers, payments, services, users } from "@/db/schema";

/** Barber-facing ("my chair") reads. */

export interface ChairBarber {
  readonly id: string;
  readonly displayName: string;
}

/** The barber row linked to a barber-role user, or null. */
export async function resolveBarberForUser(userId: string): Promise<ChairBarber | null> {
  const [row] = await db
    .select({ id: barbers.id, displayName: barbers.displayName })
    .from(barbers)
    .where(eq(barbers.userId, userId));
  return row ?? null;
}

export interface ChairAppointment {
  readonly id: string;
  readonly startAt: Date;
  readonly endAt: Date;
  readonly status: string;
  readonly clientId: string;
  readonly clientName: string;
  readonly clientPhone: string | null;
  readonly serviceName: string;
  readonly holdTier: string | null;
  readonly graceMinutes: number | null;
}

/** A barber's appointments within a UTC range, soonest first. */
export async function loadChairAppointments(
  barberId: string,
  rangeStart: Date,
  rangeEnd: Date,
): Promise<ChairAppointment[]> {
  return db
    .select({
      id: appointments.id,
      startAt: appointments.startAt,
      endAt: appointments.endAt,
      status: appointments.status,
      clientId: appointments.clientId,
      clientName: users.name,
      clientPhone: users.phone,
      serviceName: services.name,
      holdTier: appointments.holdTier,
      graceMinutes: appointments.graceMinutes,
    })
    .from(appointments)
    .innerJoin(users, eq(appointments.clientId, users.id))
    .innerJoin(services, eq(appointments.serviceId, services.id))
    .where(
      and(
        eq(appointments.barberId, barberId),
        gte(appointments.startAt, rangeStart),
        lt(appointments.startAt, rangeEnd),
      ),
    )
    .orderBy(asc(appointments.startAt));
}

export interface ChairEarnings {
  readonly completedCount: number;
  readonly revenueCents: number;
  readonly tipsCents: number;
  readonly upcomingCount: number;
}

/**
 * A barber's earnings over the last `windowDays`: completed-visit value
 * (deposit + remainder) + succeeded tips, plus a count of upcoming live
 * appointments. All scoped to the barber's own chair.
 */
export async function loadChairEarnings(
  barberId: string,
  windowDays = 30,
  now = new Date(),
): Promise<ChairEarnings> {
  const windowStart = new Date(now.getTime() - windowDays * 86_400_000);

  const [completed] = await db
    .select({
      n: sql<number>`count(*)::int`,
      revenue: sql<number>`coalesce(sum(${appointments.depositCents} + ${appointments.remainderCents}), 0)::int`,
    })
    .from(appointments)
    .where(
      and(
        eq(appointments.barberId, barberId),
        eq(appointments.status, "completed"),
        gte(appointments.startAt, windowStart),
      ),
    );

  const [tips] = await db
    .select({ cents: sql<number>`coalesce(sum(${payments.amountCents}), 0)::int` })
    .from(payments)
    .innerJoin(appointments, eq(payments.appointmentId, appointments.id))
    .where(
      and(
        eq(appointments.barberId, barberId),
        eq(payments.type, "tip"),
        eq(payments.status, "succeeded"),
        gte(payments.createdAt, windowStart),
      ),
    );

  const [upcoming] = await db
    .select({ n: sql<number>`count(*)::int` })
    .from(appointments)
    .where(
      and(
        eq(appointments.barberId, barberId),
        sql`${appointments.status} in ('confirmed','reserved','pending_deposit')`,
        gte(appointments.startAt, now),
      ),
    );

  return {
    completedCount: completed?.n ?? 0,
    revenueCents: completed?.revenue ?? 0,
    tipsCents: tips?.cents ?? 0,
    upcomingCount: upcoming?.n ?? 0,
  };
}
