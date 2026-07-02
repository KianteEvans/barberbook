import { describe, expect, it } from "vitest";
import { generateSlots, type GenerateSlotsInput } from "./slots";

const TZ = "America/New_York";
const EARLY = new Date("2026-01-01T00:00:00Z"); // "now" far in the past of test dates

function base(overrides: Partial<GenerateSlotsInput> = {}): GenerateSlotsInput {
  return {
    date: "2026-07-15", // a Wednesday
    rules: [{ weekday: 3, startMin: 540, endMin: 1080 }], // Wed 9:00-18:00
    exceptions: [],
    existing: [],
    serviceDurationMin: 30,
    bufferMin: 0,
    granularityMin: 30,
    timezone: TZ,
    now: EARLY,
    ...overrides,
  };
}

describe("generateSlots", () => {
  it("generates slots across the working window at the given granularity", () => {
    const slots = generateSlots(base());
    // 9:00 through 17:30 inclusive = 18 slots of 30 min.
    expect(slots).toHaveLength(18);
    // July in New York is EDT (UTC-4): 9:00 local = 13:00Z.
    expect(slots[0]?.startUtc.toISOString()).toBe("2026-07-15T13:00:00.000Z");
    expect(slots[17]?.startUtc.toISOString()).toBe("2026-07-15T21:30:00.000Z");
  });

  it("returns nothing on a day with no rule", () => {
    const slots = generateSlots(base({ date: "2026-07-13" })); // Monday
    expect(slots).toHaveLength(0);
  });

  it("honors an off exception", () => {
    const slots = generateSlots(
      base({
        exceptions: [{ date: "2026-07-15", kind: "off", startMin: null, endMin: null }],
      }),
    );
    expect(slots).toHaveLength(0);
  });

  it("honors custom-hours exceptions over the weekly rule", () => {
    const slots = generateSlots(
      base({
        exceptions: [
          { date: "2026-07-15", kind: "custom", startMin: 600, endMin: 720 },
        ], // 10:00-12:00
      }),
    );
    expect(slots).toHaveLength(4);
    expect(slots[0]?.startUtc.toISOString()).toBe("2026-07-15T14:00:00.000Z");
  });

  it("excludes slots overlapping existing appointments, including the buffer", () => {
    const slots = generateSlots(
      base({
        bufferMin: 15,
        granularityMin: 15,
        existing: [
          {
            startAt: new Date("2026-07-15T15:00:00Z"), // 11:00 local
            endAt: new Date("2026-07-15T15:30:00Z"), // 11:30 local
          },
        ],
      }),
    );
    const starts = slots.map((s) => s.startUtc.toISOString());
    // 10:30 local starts a 30+15 block ending 11:15 local - overlaps the busy 11:00.
    expect(starts).not.toContain("2026-07-15T14:30:00.000Z");
    expect(starts).not.toContain("2026-07-15T15:00:00.000Z");
    expect(starts).not.toContain("2026-07-15T15:15:00.000Z");
    // 11:30 local starts exactly when the busy interval ends - allowed.
    expect(starts).toContain("2026-07-15T15:30:00.000Z");
  });

  it("drops slots in the past relative to now", () => {
    const slots = generateSlots(
      base({ now: new Date("2026-07-15T17:00:00Z") }), // 13:00 local
    );
    expect(slots[0]?.startUtc.getTime()).toBeGreaterThan(
      new Date("2026-07-15T17:00:00Z").getTime(),
    );
  });

  it("handles the spring-forward DST day (2:00 AM does not exist)", () => {
    // 2026-03-08 is the US spring-forward date; NY jumps 2:00 -> 3:00.
    const slots = generateSlots(
      base({
        date: "2026-03-08", // a Sunday
        rules: [{ weekday: 0, startMin: 0, endMin: 360 }], // 0:00-6:00 local
        granularityMin: 60,
        serviceDurationMin: 60,
      }),
    );
    // Wall-clock hours 0,1,2,3,4 fit inside 0:00-6:00 with 60-min service.
    // The 2:00 wall time is skipped forward by the zone conversion; what
    // matters is instants are strictly increasing and never duplicated.
    const instants = slots.map((s) => s.startUtc.getTime());
    const unique = new Set(instants);
    expect(unique.size).toBe(instants.length);
    for (let i = 1; i < instants.length; i++) {
      expect(instants[i]!).toBeGreaterThan(instants[i - 1]!);
    }
  });

  it("handles the fall-back DST day without duplicating wall times", () => {
    // 2026-11-01 is the US fall-back date; NY repeats 1:00-2:00.
    const slots = generateSlots(
      base({
        date: "2026-11-01", // a Sunday
        rules: [{ weekday: 0, startMin: 540, endMin: 720 }], // 9:00-12:00
        granularityMin: 30,
      }),
    );
    // Post-transition morning: 9:00 EST = 14:00Z.
    expect(slots[0]?.startUtc.toISOString()).toBe("2026-11-01T14:00:00.000Z");
    expect(slots).toHaveLength(6);
  });
});
