import { describe, expect, it } from "vitest";
import {
  dueOffsets,
  offsetLabel,
  REMINDER_OFFSETS,
  selectDueReminders,
} from "./reminders";

const now = new Date("2026-07-04T12:00:00Z");
const at = (min: number) => new Date(now.getTime() + min * 60_000);

// Fine-grained cases pin the 30/15 window explicitly so they stay meaningful.
const SHORT = [30, 15] as const;

describe("dueOffsets", () => {
  it("returns nothing when far out (short offsets)", () => {
    expect(dueOffsets(at(45), now, SHORT)).toEqual([]);
  });

  it("returns only 30 between 15 and 30 minutes away", () => {
    expect(dueOffsets(at(22), now, SHORT)).toEqual([30]);
  });

  it("returns both 30 and 15 inside the 15-minute window", () => {
    expect(dueOffsets(at(10), now, SHORT)).toEqual([30, 15]);
  });

  it("is inclusive at the exact threshold", () => {
    expect(dueOffsets(at(30), now, SHORT)).toEqual([30]);
    expect(dueOffsets(at(15), now, SHORT)).toEqual([30, 15]);
  });

  it("returns nothing for a past or now appointment", () => {
    expect(dueOffsets(at(0), now, SHORT)).toEqual([]);
    expect(dueOffsets(at(-5), now, SHORT)).toEqual([]);
  });

  it("includes the 24-hour offset under the default set", () => {
    expect(REMINDER_OFFSETS).toContain(1440);
    expect(dueOffsets(at(600), now)).toEqual([1440]); // 10h out: only the day-before
    expect(dueOffsets(at(10), now)).toEqual([1440, 30, 15]); // all three crossed
    expect(dueOffsets(at(2000), now)).toEqual([]); // beyond 24h
  });
});

describe("offsetLabel", () => {
  it("renders hours for round-hour offsets", () => {
    expect(offsetLabel(1440)).toBe("24 hours");
    expect(offsetLabel(60)).toBe("1 hour");
  });
  it("renders minutes otherwise", () => {
    expect(offsetLabel(30)).toBe("30 minutes");
    expect(offsetLabel(15)).toBe("15 minutes");
  });
});

describe("selectDueReminders", () => {
  it("flattens due reminders across appointments", () => {
    const due = selectDueReminders(
      [
        { id: "a", startAt: at(10) },
        { id: "b", startAt: at(22) },
        { id: "c", startAt: at(90) },
      ],
      now,
      SHORT,
    );
    expect(due).toEqual([
      { appointmentId: "a", offsetMinutes: 30 },
      { appointmentId: "a", offsetMinutes: 15 },
      { appointmentId: "b", offsetMinutes: 30 },
    ]);
  });
});
