import { describe, expect, it } from "vitest";
import { codeRedeemable, discountCents, discountedPrice } from "./discount";

describe("discountCents", () => {
  it("computes percent off, rounded", () => {
    expect(discountCents(5000, { kind: "percent", amount: 20 })).toBe(1000);
    expect(discountCents(3500, { kind: "percent", amount: 15 })).toBe(525);
  });
  it("computes fixed off, clamped to the price", () => {
    expect(discountCents(5000, { kind: "fixed", amount: 1500 })).toBe(1500);
    expect(discountCents(1000, { kind: "fixed", amount: 1500 })).toBe(1000);
  });
});

describe("discountedPrice", () => {
  it("subtracts the discount", () => {
    expect(discountedPrice(5000, { kind: "percent", amount: 20 })).toBe(4000);
    expect(discountedPrice(800, { kind: "fixed", amount: 1000 })).toBe(0);
  });
});

describe("codeRedeemable", () => {
  const now = new Date("2026-07-09T12:00:00Z");
  const base = { active: true, maxUses: null, usedCount: 0, expiresAt: null };
  it("accepts an active, unexpired, unlimited code", () => {
    expect(codeRedeemable(base, now)).toBe(true);
  });
  it("rejects inactive / expired / exhausted codes", () => {
    expect(codeRedeemable({ ...base, active: false }, now)).toBe(false);
    expect(codeRedeemable({ ...base, expiresAt: new Date("2026-07-08T00:00:00Z") }, now)).toBe(false);
    expect(codeRedeemable({ ...base, maxUses: 5, usedCount: 5 }, now)).toBe(false);
  });
});
