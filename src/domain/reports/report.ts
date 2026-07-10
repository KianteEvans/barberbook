/**
 * Pure analytics aggregations over minimal appointment/payment rows. Kept free
 * of DB/date-library coupling so they are deterministic and unit-testable; the
 * operations layer maps DB rows into these shapes and formats the results.
 */

export interface ApptFact {
  readonly status: string;
  readonly startAt: Date;
  readonly serviceId: string;
  readonly serviceName: string;
  readonly clientId: string;
  readonly barberId: string;
  /** Booked length in minutes (endAt - startAt). */
  readonly durationMin: number;
  /** Earned value = deposit + remainder (0 for credit/free covered visits). */
  readonly valueCents: number;
}

export interface PaymentFact {
  readonly type: string;
  readonly status: string;
  readonly amountCents: number;
}

const isCompleted = (a: ApptFact): boolean => a.status === "completed";
const isNoShow = (a: ApptFact): boolean => a.status === "no_show";

/** UTC day key (YYYY-MM-DD) for deterministic bucketing. */
export function dayKey(d: Date): string {
  return d.toISOString().slice(0, 10);
}

/** Total earned value from completed visits, in cents. */
export function completedRevenueCents(appts: readonly ApptFact[]): number {
  return appts.filter(isCompleted).reduce((sum, a) => sum + a.valueCents, 0);
}

/** Sum of succeeded tip payments, in cents. */
export function tipsCents(payments: readonly PaymentFact[]): number {
  return payments
    .filter((p) => p.type === "tip" && p.status === "succeeded")
    .reduce((sum, p) => sum + p.amountCents, 0);
}

/** Sum of ALL succeeded payments (deposits, remainders, tips, fees, refunds). */
export function collectedCents(payments: readonly PaymentFact[]): number {
  return payments
    .filter((p) => p.status === "succeeded")
    .reduce((sum, p) => sum + p.amountCents, 0);
}

/** No-show rate over resolved visits (completed + no-show); 0 when none. */
export function noShowRate(appts: readonly ApptFact[]): number {
  const completed = appts.filter(isCompleted).length;
  const noShow = appts.filter(isNoShow).length;
  const resolved = completed + noShow;
  return resolved === 0 ? 0 : noShow / resolved;
}

/** Share of returning clients: (clients with >=2 completed) / (>=1 completed). */
export function repeatClientRate(appts: readonly ApptFact[]): number {
  const counts = new Map<string, number>();
  for (const a of appts) {
    if (isCompleted(a)) counts.set(a.clientId, (counts.get(a.clientId) ?? 0) + 1);
  }
  const withAny = counts.size;
  if (withAny === 0) return 0;
  let repeat = 0;
  for (const n of counts.values()) if (n >= 2) repeat += 1;
  return repeat / withAny;
}

export interface ServiceStat {
  readonly serviceId: string;
  readonly serviceName: string;
  readonly count: number;
  readonly revenueCents: number;
}

/** Top services by completed-visit count (revenue as a tiebreaker). */
export function topServices(
  appts: readonly ApptFact[],
  limit = 6,
): ServiceStat[] {
  const byId = new Map<string, ServiceStat>();
  for (const a of appts) {
    if (!isCompleted(a)) continue;
    const prev = byId.get(a.serviceId);
    byId.set(a.serviceId, {
      serviceId: a.serviceId,
      serviceName: a.serviceName,
      count: (prev?.count ?? 0) + 1,
      revenueCents: (prev?.revenueCents ?? 0) + a.valueCents,
    });
  }
  return [...byId.values()]
    .sort((x, y) => y.count - x.count || y.revenueCents - x.revenueCents)
    .slice(0, limit);
}

export interface DayPoint {
  readonly day: string;
  readonly cents: number;
}

/**
 * Daily completed-visit revenue over the last `days` days ending at `now`
 * (inclusive), zero-filled so the series is contiguous for charting.
 */
export function revenueSeries(
  appts: readonly ApptFact[],
  days: number,
  now: Date,
): DayPoint[] {
  const byDay = new Map<string, number>();
  for (const a of appts) {
    if (!isCompleted(a)) continue;
    const k = dayKey(a.startAt);
    byDay.set(k, (byDay.get(k) ?? 0) + a.valueCents);
  }
  const out: DayPoint[] = [];
  const end = new Date(dayKey(now) + "T00:00:00.000Z").getTime();
  for (let i = days - 1; i >= 0; i--) {
    const k = dayKey(new Date(end - i * 86_400_000));
    out.push({ day: k, cents: byDay.get(k) ?? 0 });
  }
  return out;
}

export interface BarberUtilization {
  readonly barberId: string;
  readonly barberName: string;
  readonly bookedMin: number;
  readonly availableMin: number;
  /** 0..1, clamped; 0 when the barber has no available minutes. */
  readonly ratio: number;
}

/**
 * Utilization per barber: booked minutes / estimated available minutes. The
 * caller supplies available minutes (weekly rule minutes scaled to the window).
 */
export function utilization(
  bookedMinByBarber: ReadonlyMap<string, number>,
  barbers: ReadonlyArray<{ id: string; name: string; availableMin: number }>,
): BarberUtilization[] {
  return barbers
    .map((b) => {
      const bookedMin = bookedMinByBarber.get(b.id) ?? 0;
      const ratio =
        b.availableMin <= 0 ? 0 : Math.min(1, bookedMin / b.availableMin);
      return {
        barberId: b.id,
        barberName: b.name,
        bookedMin,
        availableMin: b.availableMin,
        ratio,
      };
    })
    .sort((x, y) => y.ratio - x.ratio);
}
