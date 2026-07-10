import { describe, expect, it } from "vitest";
import { parseSmsCommand } from "./commands";

describe("parseSmsCommand", () => {
  it("recognizes cancel words case-insensitively", () => {
    expect(parseSmsCommand("CANCEL").kind).toBe("cancel");
    expect(parseSmsCommand("cancel").kind).toBe("cancel");
    expect(parseSmsCommand(" c ").kind).toBe("cancel");
    expect(parseSmsCommand("Cancel my 3pm").kind).toBe("cancel");
  });
  it("recognizes confirm words", () => {
    expect(parseSmsCommand("YES").kind).toBe("confirm");
    expect(parseSmsCommand("confirm").kind).toBe("confirm");
    expect(parseSmsCommand("y").kind).toBe("confirm");
  });
  it("recognizes help", () => {
    expect(parseSmsCommand("HELP").kind).toBe("help");
  });
  it("falls back to unknown", () => {
    expect(parseSmsCommand("what time").kind).toBe("unknown");
    expect(parseSmsCommand("").kind).toBe("unknown");
  });
});
