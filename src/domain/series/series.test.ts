import { describe, expect, it } from "vitest";
import { expandSeries, hasConflict, proposeAlternative } from "./series";

const TZ = "America/New_York";

describe("expandSeries", () => {
  it("expands every-2-weeks occurrences up to the horizon, excluding the anchor", () => {
    const out = expandSeries({
      spec: { anchorDate: "2026-07-02", cadenceWeeks: 2, timeMin: 600 }, // Thu 10:00
      fromDate: "2026-07-02",
      horizonDate: "2026-08-27",
      timezone: TZ,
    });
    expect(out.map((o) => o.date)).toEqual([
      "2026-07-16",
      "2026-07-30",
      "2026-08-13",
      "2026-08-27",
    ]);
    // July in NY = EDT (UTC-4): 10:00 local = 14:00Z.
    expect(out[0]?.startUtc.toISOString()).toBe("2026-07-16T14:00:00.000Z");
  });

  it("keeps the same WALL time across the fall-back DST transition", () => {
    const out = expandSeries({
      spec: { anchorDate: "2026-10-24", cadenceWeeks: 2, timeMin: 600 }, // Sat 10:00
      fromDate: "2026-10-24",
      horizonDate: "2026-11-21",
      timezone: TZ,
    });
    expect(out.map((o) => o.date)).toEqual(["2026-11-07", "2026-11-21"]);
    // Nov 7 is after fall-back (EST, UTC-5): 10:00 local = 15:00Z, not 14:00Z.
    expect(out[0]?.startUtc.toISOString()).toBe("2026-11-07T15:00:00.000Z");
  });

  it("respects fromDate as an exclusive lower bound (no re-materialization)", () => {
    const out = expandSeries({
      spec: { anchorDate: "2026-07-02", cadenceWeeks: 1, timeMin: 540 },
      fromDate: "2026-07-16",
      horizonDate: "2026-07-30",
      timezone: TZ,
    });
    expect(out.map((o) => o.date)).toEqual(["2026-07-23", "2026-07-30"]);
  });
});

describe("hasConflict", () => {
  const busy = [
    {
      startAt: new Date("2026-07-16T14:00:00Z"),
      endAt: new Date("2026-07-16T14:30:00Z"),
    },
  ];

  it("detects overlap", () => {
    expect(hasConflict(new Date("2026-07-16T14:15:00Z"), 30, busy)).toBe(true);
  });

  it("allows back-to-back", () => {
    expect(hasConflict(new Date("2026-07-16T14:30:00Z"), 30, busy)).toBe(false);
  });
});

describe("proposeAlternative", () => {
  it("finds the nearest free start on the same day", () => {
    const alt = proposeAlternative({
      date: "2026-07-16",
      preferredMin: 600, // 10:00
      durationMin: 30,
      granularityMin: 15,
      dayStartMin: 540,
      dayEndMin: 1080,
      busy: [
        {
          startAt: new Date("2026-07-16T14:00:00Z"), // 10:00-10:30 local busy
          endAt: new Date("2026-07-16T14:30:00Z"),
        },
      ],
      timezone: TZ,
    });
    // 10:15 and 9:45 both overlap the 10:00-10:30 block (30-min service);
    // the tie between 9:30 and 10:30 at distance 30 resolves upward first.
    expect(alt).not.toBeNull();
    expect(alt?.startMin).toBe(630); // 10:30
  });

  it("returns null when the whole day is blocked", () => {
    const alt = proposeAlternative({
      date: "2026-07-16",
      preferredMin: 600,
      durationMin: 60,
      granularityMin: 30,
      dayStartMin: 540,
      dayEndMin: 660, // 9:00-11:00 window only
      busy: [
        {
          startAt: new Date("2026-07-16T13:00:00Z"), // 9:00-11:00 local busy
          endAt: new Date("2026-07-16T15:00:00Z"),
        },
      ],
      timezone: TZ,
    });
    expect(alt).toBeNull();
  });
});
