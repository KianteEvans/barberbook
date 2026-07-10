import { describe, expect, it } from "vitest";
import { decideNudge, type NudgeInput } from "./nudges";

const base: NudgeInput = {
  daysSinceLastVisit: 40,
  hasUpcoming: false,
  rebookAfterDays: 28,
  winbackAfterDays: 90,
  rebookSentDaysAgo: null,
  winbackSentDaysAgo: null,
};

describe("decideNudge", () => {
  it("never nudges a client with an upcoming booking", () => {
    expect(decideNudge({ ...base, hasUpcoming: true })).toBeNull();
  });
  it("sends a rebook nudge past the rebook threshold", () => {
    expect(decideNudge({ ...base, daysSinceLastVisit: 30 })).toBe("rebook");
  });
  it("sends win-back once deeply lapsed", () => {
    expect(decideNudge({ ...base, daysSinceLastVisit: 100 })).toBe("winback");
  });
  it("stays quiet below the rebook threshold", () => {
    expect(decideNudge({ ...base, daysSinceLastVisit: 20 })).toBeNull();
  });
  it("respects each nudge's cooldown", () => {
    // Rebooked-window client nudged 5 days ago -> still cooling down.
    expect(
      decideNudge({ ...base, daysSinceLastVisit: 30, rebookSentDaysAgo: 5 }),
    ).toBeNull();
    // Win-back sent 10 days ago, threshold 90 -> still cooling down.
    expect(
      decideNudge({ ...base, daysSinceLastVisit: 100, winbackSentDaysAgo: 10 }),
    ).toBeNull();
  });
  it("honors disabled thresholds (0 = off)", () => {
    expect(
      decideNudge({ ...base, daysSinceLastVisit: 30, rebookAfterDays: 0 }),
    ).toBeNull();
    expect(
      decideNudge({ ...base, daysSinceLastVisit: 200, winbackAfterDays: 0, rebookAfterDays: 0 }),
    ).toBeNull();
  });
});
