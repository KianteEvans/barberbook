import { describe, expect, it } from "vitest";
import { toIcs } from "./ics";

describe("toIcs", () => {
  const ics = toIcs({
    uid: "abc-123",
    start: new Date("2026-07-09T15:00:00Z"),
    end: new Date("2026-07-09T15:30:00Z"),
    summary: "Classic Cut with Marco",
    location: "Fade Factory",
    description: "See you soon; bring a photo.",
    now: new Date("2026-07-01T00:00:00Z"),
  });

  it("wraps a single VEVENT in a VCALENDAR", () => {
    expect(ics).toContain("BEGIN:VCALENDAR");
    expect(ics).toContain("BEGIN:VEVENT");
    expect(ics).toContain("END:VEVENT");
    expect(ics).toContain("END:VCALENDAR");
  });

  it("emits UTC basic-format timestamps", () => {
    expect(ics).toContain("DTSTART:20260709T150000Z");
    expect(ics).toContain("DTEND:20260709T153000Z");
    expect(ics).toContain("DTSTAMP:20260701T000000Z");
    expect(ics).toContain("UID:abc-123@barberbook");
  });

  it("escapes commas and semicolons in text", () => {
    expect(ics).toContain("DESCRIPTION:See you soon\\; bring a photo.");
    expect(ics).toContain("SUMMARY:Classic Cut with Marco");
  });

  it("uses CRLF line endings", () => {
    expect(ics.includes("\r\n")).toBe(true);
  });
});
