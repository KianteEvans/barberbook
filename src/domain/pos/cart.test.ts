import { describe, expect, it } from "vitest";
import { cartTotals, lineTotal, tipForPercent, type CartLine } from "./cart";

const line = (over: Partial<CartLine> = {}): CartLine => ({
  kind: "service",
  name: "Classic Cut",
  unitPriceCents: 3500,
  qty: 1,
  ...over,
});

describe("lineTotal", () => {
  it("multiplies price by quantity", () => {
    expect(lineTotal(line({ unitPriceCents: 1200, qty: 3 }))).toBe(3600);
  });
  it("never goes negative", () => {
    expect(lineTotal(line({ unitPriceCents: -500 }))).toBe(0);
    expect(lineTotal(line({ qty: -2 }))).toBe(0);
  });
});

describe("cartTotals", () => {
  it("is all zeroes for an empty cart", () => {
    expect(cartTotals([])).toMatchObject({
      subtotalCents: 0,
      discountCents: 0,
      tipCents: 0,
      totalCents: 0,
      netSalesCents: 0,
    });
  });

  it("sums mixed lines", () => {
    const t = cartTotals([
      line({ unitPriceCents: 3500 }),
      line({ kind: "product", name: "Pomade", unitPriceCents: 1800, qty: 2 }),
    ]);
    expect(t.subtotalCents).toBe(3500 + 3600);
    expect(t.totalCents).toBe(7100);
  });

  it("applies a discount and a tip", () => {
    const t = cartTotals([line({ unitPriceCents: 5000 })], {
      discountCents: 1000,
      tipCents: 800,
    });
    expect(t.netSalesCents).toBe(4000);
    expect(t.totalCents).toBe(4800);
  });

  it("clamps a discount to the subtotal - a sale never pays out", () => {
    const t = cartTotals([line({ unitPriceCents: 2000 })], { discountCents: 9999 });
    expect(t.discountCents).toBe(2000);
    expect(t.netSalesCents).toBe(0);
    expect(t.totalCents).toBe(0);
  });

  it("ignores negative discounts and tips", () => {
    const t = cartTotals([line({ unitPriceCents: 2000 })], {
      discountCents: -500,
      tipCents: -100,
    });
    expect(t).toMatchObject({ discountCents: 0, tipCents: 0, totalCents: 2000 });
  });

  it("keeps the tip out of net sales", () => {
    // The barber's gross is the service money, not the client's generosity.
    const t = cartTotals([line({ unitPriceCents: 4000 })], { tipCents: 1000 });
    expect(t.netSalesCents).toBe(4000);
    expect(t.totalCents).toBe(5000);
  });
});

describe("tipForPercent", () => {
  it("tips on what is actually owed, not the list price", () => {
    expect(tipForPercent(4000, 20)).toBe(800);
    expect(tipForPercent(0, 20)).toBe(0);
  });
  it("rounds to the cent", () => {
    expect(tipForPercent(3333, 15)).toBe(500);
  });
});
