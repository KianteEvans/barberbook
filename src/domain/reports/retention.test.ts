import { describe, expect, it } from "vitest";
import {
  rebookRateByBarber,
  noShowRateByBarber,
  retentionCohorts,
  type ApptFact,
} from "./report";

const NOW = new Date("2026-09-19T12:00:00Z");
const DAY = 86_400_000;
const daysAgo = (n: number): Date => new Date(NOW.getTime() - n * DAY);

function appt(over: Partial<ApptFact>): ApptFact {
  return {
    status: "completed",
    startAt: daysAgo(100),
    serviceId: "s1",
    serviceName: "Classic Cut",
    clientId: "c1",
    barberId: "b1",
    durationMin: 30,
    valueCents: 3500,
    ...over,
  };
}

const BARBERS = [
  { id: "b1", name: "Marco" },
  { id: "b2", name: "Dre" },
];

describe("rebookRateByBarber", () => {
  it("counts a return to the same barber inside the window", () => {
    const appts = [
      appt({ startAt: daysAgo(100) }),
      appt({ startAt: daysAgo(80) }), // 20 days later, same client + barber
    ];
    const [marco] = rebookRateByBarber(appts, BARBERS, { now: NOW });
    // The second visit is itself eligible but had no follow-up.
    expect(marco).toMatchObject({ eligible: 2, rebooked: 1 });
    expect(marco!.rate).toBe(0.5);
  });

  it("EXCLUDES visits whose window has not fully elapsed", () => {
    // A cut 3 days ago cannot have had 42 days to turn into a return.
    const appts = [appt({ startAt: daysAgo(3) })];
    const [marco] = rebookRateByBarber(appts, BARBERS, { now: NOW });
    expect(marco).toMatchObject({ eligible: 0, rebooked: 0, rate: 0 });
  });

  it("does not count a return that lands after the window closes", () => {
    const appts = [
      appt({ startAt: daysAgo(150) }),
      appt({ startAt: daysAgo(100) }), // 50 days later: outside a 42-day window
    ];
    const [marco] = rebookRateByBarber(appts, BARBERS, { now: NOW });
    expect(marco).toMatchObject({ eligible: 2, rebooked: 0 });
  });

  it("separates same-barber loyalty from returning to the shop", () => {
    const appts = [
      appt({ startAt: daysAgo(100), barberId: "b1" }),
      appt({ startAt: daysAgo(80), barberId: "b2" }), // same client, other chair
    ];
    const marco = rebookRateByBarber(appts, BARBERS, { now: NOW }).find(
      (r) => r.barberId === "b1",
    );
    expect(marco).toMatchObject({ eligible: 1, rebooked: 0 });
    expect(marco!.rate).toBe(0); // did not come back to Marco
    expect(marco!.shopRate).toBe(1); // but did come back to the shop
  });

  it("counts an upcoming booking as a return", () => {
    const appts = [
      appt({ startAt: daysAgo(60) }),
      appt({ startAt: daysAgo(30), status: "confirmed" }),
    ];
    const [marco] = rebookRateByBarber(appts, BARBERS, { now: NOW });
    expect(marco!.rebooked).toBe(1);
  });

  it("ignores canceled and no-show visits as returns", () => {
    const appts = [
      appt({ startAt: daysAgo(100) }),
      appt({ startAt: daysAgo(80), status: "canceled" }),
      appt({ startAt: daysAgo(79), status: "no_show" }),
    ];
    const [marco] = rebookRateByBarber(appts, BARBERS, { now: NOW });
    expect(marco).toMatchObject({ eligible: 1, rebooked: 0 });
  });

  it("reports a barber with nothing eligible as zero, not NaN", () => {
    const rows = rebookRateByBarber([], BARBERS, { now: NOW });
    expect(rows).toHaveLength(2);
    for (const r of rows) {
      expect(r.rate).toBe(0);
      expect(Number.isNaN(r.rate)).toBe(false);
    }
  });

  it("honors a custom window", () => {
    const appts = [
      appt({ startAt: daysAgo(100) }),
      appt({ startAt: daysAgo(80) }), // 20 days later
    ];
    // A 14-day window misses it; a 42-day window catches it.
    expect(
      rebookRateByBarber(appts, BARBERS, { now: NOW, windowDays: 14 })[0]!.rebooked,
    ).toBe(0);
    expect(rebookRateByBarber(appts, BARBERS, { now: NOW })[0]!.rebooked).toBe(1);
  });
});

describe("noShowRateByBarber", () => {
  it("rates each barber and its gap to the shop", () => {
    const appts = [
      appt({ barberId: "b1" }),
      appt({ barberId: "b1", status: "no_show" }),
      appt({ barberId: "b2" }),
      appt({ barberId: "b2" }),
    ];
    const rows = noShowRateByBarber(appts, BARBERS);
    const b1 = rows.find((r) => r.barberId === "b1")!;
    const b2 = rows.find((r) => r.barberId === "b2")!;
    expect(b1.rate).toBe(0.5);
    expect(b2.rate).toBe(0);
    // Shop-wide is 1 of 4 = 0.25.
    expect(b1.deltaVsShop).toBeCloseTo(0.25);
    expect(b2.deltaVsShop).toBeCloseTo(-0.25);
  });

  it("is zero for a barber with no resolved visits", () => {
    const rows = noShowRateByBarber([], BARBERS);
    expect(rows.every((r) => r.rate === 0 && r.resolved === 0)).toBe(true);
  });
});

describe("retentionCohorts", () => {
  it("buckets clients by first visit and measures the comeback", () => {
    const appts = [
      // c1: first visit, returns 20 days later -> counts at 30/60/90
      appt({ clientId: "c1", startAt: new Date("2026-01-05T12:00:00Z") }),
      appt({ clientId: "c1", startAt: new Date("2026-01-25T12:00:00Z") }),
      // c2: first visit same month, returns 70 days later -> only at 90
      appt({ clientId: "c2", startAt: new Date("2026-01-10T12:00:00Z") }),
      appt({ clientId: "c2", startAt: new Date("2026-03-21T12:00:00Z") }),
      // c3: same month, never returns
      appt({ clientId: "c3", startAt: new Date("2026-01-15T12:00:00Z") }),
    ];
    const [jan] = retentionCohorts(appts, { now: NOW });
    expect(jan).toMatchObject({ month: "2026-01", clients: 3 });
    expect(jan!.at30).toBeCloseTo(1 / 3);
    expect(jan!.at60).toBeCloseTo(1 / 3);
    expect(jan!.at90).toBeCloseTo(2 / 3);
  });

  it("hides cohorts whose 90-day window is still open", () => {
    // A client whose first visit was last week can't be judged yet.
    const appts = [appt({ clientId: "new", startAt: daysAgo(7) })];
    expect(retentionCohorts(appts, { now: NOW })).toEqual([]);
  });
});
