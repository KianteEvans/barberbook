import { and, asc, eq, gte, lt } from "drizzle-orm";
import { db } from "@/db/client";
import { appointments, barbers, services, users } from "@/db/schema";

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
