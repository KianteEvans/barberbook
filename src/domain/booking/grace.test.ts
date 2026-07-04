import { describe, expect, it } from "vitest";
import {
  chooseTier,
  graceForTier,
  noShowAllowed,
  statusForTier,
} from "./grace";

const settings = { memberGraceMinutes: 15, depositGraceMinutes: 10 };

describe("chooseTier", () => {
  it("member when credit-covered", () => {
    expect(chooseTier(true, false)).toBe("member");
  });
  it("deposit when paying a Stripe deposit", () => {
    expect(chooseTier(false, true)).toBe("deposit");
  });
  it("unconfirmed when non-member with no deposit", () => {
    expect(chooseTier(false, false)).toBe("unconfirmed");
  });
});

describe("statusForTier", () => {
  it("maps tiers to booking statuses", () => {
    expect(statusForTier("member")).toBe("confirmed");
    expect(statusForTier("deposit")).toBe("pending_deposit");
    expect(statusForTier("unconfirmed")).toBe("reserved");
  });
});

describe("graceForTier", () => {
  it("members get the longer grace, others the shorter", () => {
    expect(graceForTier("member", settings)).toBe(15);
    expect(graceForTier("deposit", settings)).toBe(10);
    expect(graceForTier("unconfirmed", settings)).toBe(10);
  });
});

describe("noShowAllowed", () => {
  const start = new Date("2026-07-04T15:00:00Z");
  it("blocks a no-show before grace elapses", () => {
    expect(noShowAllowed(start, 10, new Date("2026-07-04T15:09:00Z"))).toBe(false);
  });
  it("allows a no-show once grace has elapsed", () => {
    expect(noShowAllowed(start, 10, new Date("2026-07-04T15:10:00Z"))).toBe(true);
    expect(noShowAllowed(start, 10, new Date("2026-07-04T15:30:00Z"))).toBe(true);
  });
});
