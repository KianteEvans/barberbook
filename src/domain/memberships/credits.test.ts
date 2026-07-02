import { describe, expect, it } from "vitest";
import { creditsAvailable, pickCreditRow, type CreditRow } from "./credits";

const NOW = new Date("2026-07-15T12:00:00Z");

function row(overrides: Partial<CreditRow>): CreditRow {
  return {
    id: "r1",
    granted: 2,
    consumed: 0,
    periodStart: new Date("2026-07-01T00:00:00Z"),
    periodEnd: new Date("2026-08-01T00:00:00Z"),
    ...overrides,
  };
}

describe("creditsAvailable", () => {
  it("counts unconsumed credits in the current period", () => {
    expect(creditsAvailable([row({ consumed: 1 })], NOW)).toBe(1);
  });

  it("ignores expired periods (no rollover)", () => {
    expect(
      creditsAvailable(
        [
          row({
            periodStart: new Date("2026-06-01T00:00:00Z"),
            periodEnd: new Date("2026-07-01T00:00:00Z"),
          }),
        ],
        NOW,
      ),
    ).toBe(0);
  });

  it("ignores future periods", () => {
    expect(
      creditsAvailable(
        [
          row({
            periodStart: new Date("2026-08-01T00:00:00Z"),
            periodEnd: new Date("2026-09-01T00:00:00Z"),
          }),
        ],
        NOW,
      ),
    ).toBe(0);
  });

  it("sums across rows and never goes negative", () => {
    expect(
      creditsAvailable(
        [row({ consumed: 2 }), row({ id: "r2", granted: 3, consumed: 1 })],
        NOW,
      ),
    ).toBe(2);
  });
});

describe("pickCreditRow", () => {
  it("returns the first row with headroom in the current period", () => {
    const rows = [row({ consumed: 2 }), row({ id: "r2", consumed: 1 })];
    expect(pickCreditRow(rows, NOW)?.id).toBe("r2");
  });

  it("returns null when everything is spent", () => {
    expect(pickCreditRow([row({ consumed: 2 })], NOW)).toBeNull();
  });
});
