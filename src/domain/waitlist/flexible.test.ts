import { describe, expect, it } from "vitest";
import { shouldNotifyFlexible } from "./flexible";

const dayStart = new Date("2026-07-12T04:00:00Z"); // EDT midnight
const dayEnd = new Date("2026-07-13T04:00:00Z");
const now = new Date("2026-07-12T14:00:00Z");

const base = {
  freedAt: new Date("2026-07-12T18:00:00Z"),
  dayStart,
  dayEnd,
  lastNotifiedAt: null,
  now,
};

describe("shouldNotifyFlexible", () => {
  it("notifies for a future slot inside the desired day", () => {
    expect(shouldNotifyFlexible(base)).toBe(true);
  });
  it("skips slots outside the desired day", () => {
    expect(
      shouldNotifyFlexible({ ...base, freedAt: new Date("2026-07-13T05:00:00Z") }),
    ).toBe(false);
    expect(
      shouldNotifyFlexible({ ...base, freedAt: new Date("2026-07-12T03:00:00Z") }),
    ).toBe(false);
  });
  it("skips slots already in the past", () => {
    expect(
      shouldNotifyFlexible({ ...base, freedAt: new Date("2026-07-12T13:00:00Z") }),
    ).toBe(false);
  });
  it("throttles repeat alerts inside 60 minutes", () => {
    expect(
      shouldNotifyFlexible({
        ...base,
        lastNotifiedAt: new Date("2026-07-12T13:30:00Z"), // 30 min ago
      }),
    ).toBe(false);
    expect(
      shouldNotifyFlexible({
        ...base,
        lastNotifiedAt: new Date("2026-07-12T12:00:00Z"), // 2h ago
      }),
    ).toBe(true);
  });
});
