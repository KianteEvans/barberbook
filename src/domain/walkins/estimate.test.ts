import { describe, expect, it } from "vitest";
import { estimateWaitMin } from "./estimate";

describe("estimateWaitMin", () => {
  it("is zero when you're next", () => {
    expect(estimateWaitMin(0, 30, 3)).toBe(0);
  });
  it("spreads the line across active chairs", () => {
    expect(estimateWaitMin(1, 30, 1)).toBe(30);
    expect(estimateWaitMin(4, 30, 2)).toBe(60); // ceil(4/2)=2 rounds
    expect(estimateWaitMin(5, 30, 2)).toBe(90); // ceil(5/2)=3 rounds
  });
  it("never divides by zero chairs", () => {
    expect(estimateWaitMin(2, 30, 0)).toBe(60);
  });
});
