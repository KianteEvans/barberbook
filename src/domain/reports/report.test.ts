import { describe, expect, it } from "vitest";
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
} from "./report";

function appt(over: Partial<ApptFact>): ApptFact {
  return {
    status: "completed",
    startAt: new Date("2026-07-01T15:00:00Z"),
    serviceId: "s1",
    serviceName: "Cut",
    clientId: "c1",
    barberId: "b1",
    durationMin: 30,
    valueCents: 4000,
    ...over,
  };
}

describe("revenue + tips", () => {
  it("sums only completed-visit value", () => {
    const a = [
      appt({ valueCents: 4000 }),
      appt({ status: "no_show", valueCents: 4000 }),
      appt({ status: "confirmed", valueCents: 4000 }),
      appt({ valueCents: 2500 }),
    ];
    expect(completedRevenueCents(a)).toBe(6500);
  });
  it("sums succeeded tips and all collected", () => {
    const p: PaymentFact[] = [
      { type: "tip", status: "succeeded", amountCents: 800 },
      { type: "tip", status: "failed", amountCents: 500 },
      { type: "remainder", status: "succeeded", amountCents: 3000 },
      { type: "refund", status: "succeeded", amountCents: -1000 },
    ];
    expect(tipsCents(p)).toBe(800);
    expect(collectedCents(p)).toBe(2800);
  });
});

describe("rates", () => {
  it("no-show rate over resolved visits", () => {
    const a = [
      appt({}),
      appt({ status: "no_show" }),
      appt({ status: "no_show" }),
      appt({ status: "confirmed" }), // not resolved -> excluded
    ];
    expect(noShowRate(a)).toBeCloseTo(2 / 3);
    expect(noShowRate([])).toBe(0);
  });
  it("repeat-client rate", () => {
    const a = [
      appt({ clientId: "c1" }),
      appt({ clientId: "c1" }), // c1 repeats
      appt({ clientId: "c2" }),
      appt({ clientId: "c3", status: "no_show" }), // no completed -> excluded
    ];
    expect(repeatClientRate(a)).toBe(0.5); // c1 repeat of {c1,c2}
  });
});

describe("topServices", () => {
  it("ranks by completed count then revenue", () => {
    const a = [
      appt({ serviceId: "s1", serviceName: "Cut", valueCents: 4000 }),
      appt({ serviceId: "s1", serviceName: "Cut", valueCents: 4000 }),
      appt({ serviceId: "s2", serviceName: "Fade", valueCents: 5000 }),
      appt({ serviceId: "s2", serviceName: "Fade", status: "no_show" }),
    ];
    const top = topServices(a);
    expect(top[0]).toMatchObject({ serviceId: "s1", count: 2, revenueCents: 8000 });
    expect(top[1]).toMatchObject({ serviceId: "s2", count: 1 });
  });
});

describe("revenueSeries", () => {
  it("zero-fills a contiguous daily series", () => {
    const now = new Date("2026-07-03T20:00:00Z");
    const a = [
      appt({ startAt: new Date("2026-07-01T15:00:00Z"), valueCents: 4000 }),
      appt({ startAt: new Date("2026-07-03T09:00:00Z"), valueCents: 2500 }),
      appt({ startAt: new Date("2026-07-03T18:00:00Z"), valueCents: 1500 }),
    ];
    const s = revenueSeries(a, 3, now);
    expect(s.map((p) => p.day)).toEqual(["2026-07-01", "2026-07-02", "2026-07-03"]);
    expect(s.map((p) => p.cents)).toEqual([4000, 0, 4000]);
  });
});

describe("utilization", () => {
  it("computes clamped booked/available ratios, sorted", () => {
    const booked = new Map([
      ["b1", 300],
      ["b2", 1200],
    ]);
    const u = utilization(booked, [
      { id: "b1", name: "Ana", availableMin: 600 },
      { id: "b2", name: "Bo", availableMin: 600 }, // over-booked -> clamps to 1
      { id: "b3", name: "Cy", availableMin: 0 }, // no availability -> 0
    ]);
    expect(u[0]).toMatchObject({ barberId: "b2", ratio: 1 });
    expect(u[1]).toMatchObject({ barberId: "b1", ratio: 0.5 });
    expect(u[2]).toMatchObject({ barberId: "b3", ratio: 0 });
  });
});
