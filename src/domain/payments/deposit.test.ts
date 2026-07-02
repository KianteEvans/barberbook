import { describe, expect, it } from "vitest";
import { computeDeposit, refundEligibility } from "./deposit";

describe("computeDeposit", () => {
  const fixed = { depositMode: "fixed" as const, depositValue: 1000 };
  const percent = { depositMode: "percent" as const, depositValue: 25 };

  it("uses the service override when set", () => {
    expect(computeDeposit({ priceCents: 5000, depositCents: 1500 }, fixed)).toEqual({
      depositCents: 1500,
      remainderCents: 3500,
    });
  });

  it("falls back to fixed shop policy", () => {
    expect(computeDeposit({ priceCents: 5000, depositCents: null }, fixed)).toEqual({
      depositCents: 1000,
      remainderCents: 4000,
    });
  });

  it("falls back to percent shop policy", () => {
    expect(computeDeposit({ priceCents: 5000, depositCents: null }, percent)).toEqual({
      depositCents: 1250,
      remainderCents: 3750,
    });
  });

  it("clamps the deposit to the service price", () => {
    expect(computeDeposit({ priceCents: 800, depositCents: null }, fixed)).toEqual({
      depositCents: 800,
      remainderCents: 0,
    });
  });
});

describe("refundEligibility", () => {
  const start = new Date("2026-07-15T15:00:00Z");

  it("refunds when cancelling before the window", () => {
    expect(
      refundEligibility(start, new Date("2026-07-14T14:00:00Z"), 24),
    ).toBe("full_refund");
  });

  it("does not refund inside the window", () => {
    expect(
      refundEligibility(start, new Date("2026-07-14T16:00:00Z"), 24),
    ).toBe("no_refund");
  });

  it("treats exactly-at-cutoff as refundable", () => {
    expect(
      refundEligibility(start, new Date("2026-07-14T15:00:00Z"), 24),
    ).toBe("full_refund");
  });
});
