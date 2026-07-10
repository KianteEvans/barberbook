import { describe, expect, it } from "vitest";
import { parseWeeklyHours } from "./hours";

describe("parseWeeklyHours", () => {
  it("parses populated days and skips blanks", () => {
    const rules = parseWeeklyHours("|9:00-17:00||8:30-20:00|||");
    expect(rules).toEqual([
      { weekday: 1, startMin: 540, endMin: 1020 },
      { weekday: 3, startMin: 510, endMin: 1200 },
    ]);
  });
  it("returns nothing when all days are closed", () => {
    expect(parseWeeklyHours("||||||")).toEqual([]);
  });
  it("rejects a payload without seven fields", () => {
    expect(() => parseWeeklyHours("9:00-17:00")).toThrow(/Malformed/);
  });
  it("rejects malformed and inverted ranges", () => {
    expect(() => parseWeeklyHours("|9-17|||||")).toThrow(/look like/);
    expect(() => parseWeeklyHours("|18:00-9:00|||||")).toThrow(/after start/);
  });
});
