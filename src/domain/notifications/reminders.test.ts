import { describe, expect, it } from "vitest";
import { dueOffsets, selectDueReminders } from "./reminders";

const now = new Date("2026-07-04T12:00:00Z");
const at = (min: number) => new Date(now.getTime() + min * 60_000);

describe("dueOffsets", () => {
  it("returns nothing when the appointment is far out", () => {
    expect(dueOffsets(at(45), now)).toEqual([]);
  });

  it("returns only 30 when between 15 and 30 minutes away", () => {
    expect(dueOffsets(at(22), now)).toEqual([30]);
  });

  it("returns both 30 and 15 inside the 15-minute window", () => {
    expect(dueOffsets(at(10), now)).toEqual([30, 15]);
  });

  it("is inclusive at the exact threshold", () => {
    expect(dueOffsets(at(30), now)).toEqual([30]);
    expect(dueOffsets(at(15), now)).toEqual([30, 15]);
  });

  it("returns nothing for a past or now appointment", () => {
    expect(dueOffsets(at(0), now)).toEqual([]);
    expect(dueOffsets(at(-5), now)).toEqual([]);
  });
});

describe("selectDueReminders", () => {
  it("flattens due reminders across appointments", () => {
    const due = selectDueReminders(
      [
        { id: "a", startAt: at(10) }, // both
        { id: "b", startAt: at(22) }, // 30 only
        { id: "c", startAt: at(90) }, // none
      ],
      now,
    );
    expect(due).toEqual([
      { appointmentId: "a", offsetMinutes: 30 },
      { appointmentId: "a", offsetMinutes: 15 },
      { appointmentId: "b", offsetMinutes: 30 },
    ]);
  });
});
