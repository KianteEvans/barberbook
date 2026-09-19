import { describe, expect, it } from "vitest";
import { computePayout, type PayoutInput } from "./compute";

const base: PayoutInput = {
  grossCents: 100_000, // $1,000 of cuts
  cardTipsCents: 12_000,
  cashTipsCents: 8_000,
  comp: { type: "none" },
  periodWeeks: 2,
};

describe("computePayout - cash tips", () => {
  it("NEVER adds cash tips to what the shop owes", () => {
    // The single most expensive mistake here: paying out money the barber
    // already pocketed.
    const withCash = computePayout({
      ...base,
      comp: { type: "commission", commissionPct: 60 },
    });
    const withoutCash = computePayout({
      ...base,
      cashTipsCents: 0,
      comp: { type: "commission", commissionPct: 60 },
    });
    expect(withCash.netCents).toBe(withoutCash.netCents);
    // ...but it is still reported.
    expect(withCash.cashTipsCents).toBe(8_000);
  });

  it("does pay out card tips - the shop is holding those", () => {
    const a = computePayout({ ...base, comp: { type: "commission", commissionPct: 50 } });
    const b = computePayout({
      ...base,
      cardTipsCents: 0,
      comp: { type: "commission", commissionPct: 50 },
    });
    expect(a.netCents - b.netCents).toBe(12_000);
  });

  it("marks cash tips as not counting toward the net", () => {
    const p = computePayout({ ...base, comp: { type: "commission", commissionPct: 50 } });
    const cashLine = p.lines.find((l) => l.label.startsWith("Cash tips"));
    expect(cashLine?.countsTowardNet).toBe(false);
  });
});

describe("computePayout - commission", () => {
  it("pays a share of gross plus card tips", () => {
    const p = computePayout({ ...base, comp: { type: "commission", commissionPct: 60 } });
    expect(p.commissionCents).toBe(60_000);
    expect(p.netCents).toBe(60_000 + 12_000);
  });

  it("clamps the percentage to 0-100", () => {
    expect(
      computePayout({ ...base, comp: { type: "commission", commissionPct: 150 } })
        .commissionCents,
    ).toBe(100_000);
    expect(
      computePayout({ ...base, comp: { type: "commission", commissionPct: -10 } })
        .commissionCents,
    ).toBe(0);
  });

  it("treats a missing percentage as zero rather than NaN", () => {
    const p = computePayout({ ...base, comp: { type: "commission" } });
    expect(p.commissionCents).toBe(0);
    expect(Number.isNaN(p.netCents)).toBe(false);
  });
});

describe("computePayout - booth rent", () => {
  it("subtracts rent and does NOT pay out gross - the barber kept it", () => {
    const p = computePayout({
      ...base,
      comp: { type: "booth_rent", boothRentCents: 20_000, boothRentPeriod: "weekly" },
    });
    // Two weeks at $200.
    expect(p.boothRentCents).toBe(40_000);
    // Owed = card tips - rent. Gross never enters, it never touched the shop.
    expect(p.balanceCents).toBe(12_000 - 40_000);
  });

  it("goes negative when rent exceeds what the shop holds, but never pays out negative", () => {
    const p = computePayout({
      ...base,
      cardTipsCents: 1_000,
      comp: { type: "booth_rent", boothRentCents: 20_000, boothRentPeriod: "weekly" },
    });
    expect(p.balanceCents).toBeLessThan(0); // the barber owes the shop
    expect(p.netCents).toBe(0); // ...but we never hand over a negative
  });

  it("pro-rates monthly rent across the period", () => {
    const monthly = computePayout({
      ...base,
      periodWeeks: 4.345,
      comp: { type: "booth_rent", boothRentCents: 80_000, boothRentPeriod: "monthly" },
    });
    expect(monthly.boothRentCents).toBe(80_000);
  });
});

describe("computePayout - hourly and adjustments", () => {
  it("pays hours times rate", () => {
    const p = computePayout({
      ...base,
      comp: { type: "hourly", hourlyCents: 2_500 },
      hoursWorked: 60,
    });
    expect(p.hourlyCents).toBe(150_000);
    expect(p.netCents).toBe(150_000 + 12_000);
  });

  it("applies a negative adjustment", () => {
    const p = computePayout({
      ...base,
      comp: { type: "commission", commissionPct: 50 },
      adjustmentCents: -5_000,
    });
    expect(p.netCents).toBe(50_000 + 12_000 - 5_000);
  });

  it("pays only tips when no comp is configured", () => {
    const p = computePayout(base);
    expect(p.netCents).toBe(12_000);
  });
});
