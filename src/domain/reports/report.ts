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

const DAY_MS = 86_400_000;

/** Statuses that mean the client came back (or is committed to coming back). */
const RETURN_STATUSES = new Set([
  "completed",
  "confirmed",
  "reserved",
  "pending_deposit",
]);

export interface BarberRebookRate {
  readonly barberId: string;
  readonly barberName: string;
  /** Completed visits whose rebook window has fully elapsed. */
  readonly eligible: number;
  /** Of those, how many were followed by a return to the SAME barber. */
  readonly rebooked: number;
  /** Return to the same barber: rebooked / eligible (0 when none eligible). */
  readonly rate: number;
  /** Return to the shop at all, same barber or not. */
  readonly shopRate: number;
}

/**
 * Per-barber rebook rate: of this barber's completed visits, how often did the
 * client come back within `windowDays`?
 *
 * The denominator only counts visits whose window has FULLY ELAPSED. A cut
 * from three days ago has not had six weeks to turn into a return, and
 * counting it would drag every barber's rate toward zero as the window moves.
 * Callers must therefore supply history well beyond `windowDays`.
 */
export function rebookRateByBarber(
  appts: readonly ApptFact[],
  barbers: ReadonlyArray<{ id: string; name: string }>,
  { windowDays = 42, now }: { windowDays?: number; now: Date },
): BarberRebookRate[] {
  // Every return-ish visit per client, ascending, so the lookup is a scan.
  const byClient = new Map<string, ApptFact[]>();
  for (const a of appts) {
    if (!RETURN_STATUSES.has(a.status)) continue;
    const list = byClient.get(a.clientId) ?? [];
    list.push(a);
    byClient.set(a.clientId, list);
  }
  for (const list of byClient.values()) {
    list.sort((x, y) => x.startAt.getTime() - y.startAt.getTime());
  }

  const cutoff = now.getTime() - windowDays * DAY_MS;
  const tally = new Map<string, { eligible: number; same: number; shop: number }>();

  for (const visit of appts) {
    if (visit.status !== "completed") continue;
    // Window must have fully elapsed for this visit to be judged.
    if (visit.startAt.getTime() > cutoff) continue;

    const t = visit.startAt.getTime();
    const deadline = t + windowDays * DAY_MS;
    const later = (byClient.get(visit.clientId) ?? []).filter(
      (a) => a.startAt.getTime() > t && a.startAt.getTime() <= deadline,
    );

    const row = tally.get(visit.barberId) ?? { eligible: 0, same: 0, shop: 0 };
    row.eligible += 1;
    if (later.length > 0) row.shop += 1;
    if (later.some((a) => a.barberId === visit.barberId)) row.same += 1;
    tally.set(visit.barberId, row);
  }

  return barbers
    .map((b) => {
      const row = tally.get(b.id) ?? { eligible: 0, same: 0, shop: 0 };
      return {
        barberId: b.id,
        barberName: b.name,
        eligible: row.eligible,
        rebooked: row.same,
        rate: row.eligible === 0 ? 0 : row.same / row.eligible,
        shopRate: row.eligible === 0 ? 0 : row.shop / row.eligible,
      };
    })
    .sort((x, y) => y.rate - x.rate);
}

export interface BarberNoShow {
  readonly barberId: string;
  readonly barberName: string;
  readonly resolved: number;
  readonly noShows: number;
  readonly rate: number;
  /** Rate minus the shop-wide rate; positive is worse than average. */
  readonly deltaVsShop: number;
}

/** Per-barber no-show rate with its gap to the shop-wide rate. */
export function noShowRateByBarber(
  appts: readonly ApptFact[],
  barbers: ReadonlyArray<{ id: string; name: string }>,
): BarberNoShow[] {
  const shop = noShowRate(appts);
  return barbers
    .map((b) => {
      const mine = appts.filter((a) => a.barberId === b.id);
      const completed = mine.filter(isCompleted).length;
      const noShows = mine.filter(isNoShow).length;
      const resolved = completed + noShows;
      const rate = resolved === 0 ? 0 : noShows / resolved;
      return {
        barberId: b.id,
        barberName: b.name,
        resolved,
        noShows,
        rate,
        deltaVsShop: rate - shop,
      };
    })
    .sort((x, y) => y.rate - x.rate);
}

export interface RetentionCohort {
  /** First-visit month, YYYY-MM. */
  readonly month: string;
  readonly clients: number;
  /** Share of the cohort with a second visit within N days. */
  readonly at30: number;
  readonly at60: number;
  readonly at90: number;
}

/**
 * Group clients by the month of their first completed visit and report how
 * many came back within 30 / 60 / 90 days. A cohort is only reported once its
 * 90-day window has elapsed, so the newest months do not look like churn.
 */
export function retentionCohorts(
  appts: readonly ApptFact[],
  { now }: { now: Date },
): RetentionCohort[] {
  const visitsByClient = new Map<string, Date[]>();
  for (const a of appts) {
    if (!isCompleted(a)) continue;
    const list = visitsByClient.get(a.clientId) ?? [];
    list.push(a.startAt);
    visitsByClient.set(a.clientId, list);
  }

  const buckets = new Map<string, { clients: number; d30: number; d60: number; d90: number }>();
  for (const dates of visitsByClient.values()) {
    dates.sort((x, y) => x.getTime() - y.getTime());
    const first = dates[0]!;
    // Only judge cohorts whose 90-day window has fully elapsed.
    if (first.getTime() + 90 * DAY_MS > now.getTime()) continue;

    const month = first.toISOString().slice(0, 7);
    const b = buckets.get(month) ?? { clients: 0, d30: 0, d60: 0, d90: 0 };
    b.clients += 1;
    const gap = dates[1] ? dates[1].getTime() - first.getTime() : Infinity;
    if (gap <= 30 * DAY_MS) b.d30 += 1;
    if (gap <= 60 * DAY_MS) b.d60 += 1;
    if (gap <= 90 * DAY_MS) b.d90 += 1;
    buckets.set(month, b);
  }

  return [...buckets.entries()]
    .map(([month, b]) => ({
      month,
      clients: b.clients,
      at30: b.clients === 0 ? 0 : b.d30 / b.clients,
      at60: b.clients === 0 ? 0 : b.d60 / b.clients,
      at90: b.clients === 0 ? 0 : b.d90 / b.clients,
    }))
    .sort((x, y) => x.month.localeCompare(y.month));
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
