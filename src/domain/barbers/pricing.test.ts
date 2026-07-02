import { describe, expect, it } from "vitest";
import { effectivePricing } from "./pricing";
import { computeDeposit } from "@/domain/payments/deposit";

const service = { priceCents: 5000, depositCents: 1500 };

describe("effectivePricing", () => {
  it("applies the barber override", () => {
    expect(effectivePricing(service, 5500)).toEqual({
      priceCents: 5500,
      depositCents: 1500,
    });
  });

  it("falls through to the shop price when the override is null", () => {
    expect(effectivePricing(service, null)).toEqual(service);
  });

  it("clamps the deposit when the override is below the fixed deposit", () => {
    const priced = effectivePricing(service, 1000);
    expect(
      computeDeposit(priced, { depositMode: "fixed", depositValue: 999999 }),
    ).toEqual({ depositCents: 1000, remainderCents: 0 });
  });

  it("percent deposits are computed from the overridden price", () => {
    const priced = effectivePricing({ ...service, depositCents: null }, 6000);
    expect(
      computeDeposit(priced, { depositMode: "percent", depositValue: 25 }),
    ).toEqual({ depositCents: 1500, remainderCents: 4500 });
  });
});
