import { and, eq, gte, inArray } from "drizzle-orm";
import { db } from "@/db/client";
import {
  appointments,
  availabilityRules,
  barbers,
  payments,
  services,
} from "@/db/schema";
import {
  completedRevenueCents,
  tipsCents,
  collectedCents,
  noShowRate,
  repeatClientRate,
  topServices,
  revenueSeries,
  utilization,
  type ApptFact,
  type PaymentFact,
  type BarberUtilization,
  type ServiceStat,
  type DayPoint,
} from "./report";

/** Loads windowed facts and assembles the admin analytics report. */

export interface ShopReport {
  readonly windowDays: number;
  readonly completedCount: number;
  readonly bookedCount: number;
  readonly revenueCents: number;
  readonly tipsCents: number;
  readonly collectedCents: number;
  readonly noShowRate: number;
  readonly repeatClientRate: number;
  readonly series: DayPoint[];
  readonly services: ServiceStat[];
  readonly utilization: BarberUtilization[];
}

export async function loadShopReport(
  windowDays = 30,
  now = new Date(),
): Promise<ShopReport> {
  const windowStart = new Date(now.getTime() - windowDays * 86_400_000);

  const apptRows = await db
    .select({
      status: appointments.status,
      startAt: appointments.startAt,
      endAt: appointments.endAt,
      serviceId: appointments.serviceId,
      serviceName: services.name,
      clientId: appointments.clientId,
      barberId: appointments.barberId,
      depositCents: appointments.depositCents,
      remainderCents: appointments.remainderCents,
    })
    .from(appointments)
    .innerJoin(services, eq(services.id, appointments.serviceId))
    .where(gte(appointments.startAt, windowStart));

  const appts: ApptFact[] = apptRows.map((r) => ({
    status: r.status,
    startAt: r.startAt,
    serviceId: r.serviceId,
    serviceName: r.serviceName,
    clientId: r.clientId,
    barberId: r.barberId,
    durationMin: Math.round((r.endAt.getTime() - r.startAt.getTime()) / 60_000),
    valueCents: r.depositCents + r.remainderCents,
  }));

  const payRows = await db
    .select({
      type: payments.type,
      status: payments.status,
      amountCents: payments.amountCents,
    })
    .from(payments)
    .where(gte(payments.createdAt, windowStart));
  const pays: PaymentFact[] = payRows;

  // Booked minutes per barber over the window (live/served appointments).
  const bookedMin = new Map<string, number>();
  for (const a of appts) {
    if (a.status === "confirmed" || a.status === "completed") {
      bookedMin.set(a.barberId, (bookedMin.get(a.barberId) ?? 0) + a.durationMin);
    }
  }

  // Estimated available minutes = weekly rule minutes scaled to the window.
  const activeBarbers = await db
    .select({ id: barbers.id, name: barbers.displayName })
    .from(barbers)
    .where(eq(barbers.active, true));
  const rules = await db
    .select({
      barberId: availabilityRules.barberId,
      startMin: availabilityRules.startMin,
      endMin: availabilityRules.endMin,
    })
    .from(availabilityRules)
    .where(
      inArray(
        availabilityRules.barberId,
        activeBarbers.map((b) => b.id),
      ),
    );
  const weeklyMin = new Map<string, number>();
  for (const r of rules) {
    weeklyMin.set(
      r.barberId,
      (weeklyMin.get(r.barberId) ?? 0) + (r.endMin - r.startMin),
    );
  }
  const barberAvail = activeBarbers.map((b) => ({
    id: b.id,
    name: b.name,
    availableMin: Math.round(((weeklyMin.get(b.id) ?? 0) * windowDays) / 7),
  }));

  const completedCount = appts.filter((a) => a.status === "completed").length;
  const bookedCount = appts.filter(
    (a) => a.status === "confirmed" || a.status === "completed",
  ).length;

  return {
    windowDays,
    completedCount,
    bookedCount,
    revenueCents: completedRevenueCents(appts),
    tipsCents: tipsCents(pays),
    collectedCents: collectedCents(pays),
    noShowRate: noShowRate(appts),
    repeatClientRate: repeatClientRate(appts),
    series: revenueSeries(appts, windowDays, now),
    services: topServices(appts),
    utilization: utilization(bookedMin, barberAvail),
  };
}
