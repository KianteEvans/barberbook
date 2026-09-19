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
  it("recognizes join and carries an optional name", () => {
    expect(parseSmsCommand("JOIN")).toEqual({ kind: "join", name: null });
    expect(parseSmsCommand("join")).toEqual({ kind: "join", name: null });
    expect(parseSmsCommand("LINE  Malik  Rivera")).toEqual({
      kind: "join",
      name: "Malik Rivera",
    });
    // A runaway name can't blow past the column length.
    const long = parseSmsCommand(`JOIN ${"a".repeat(200)}`);
    expect(long.kind === "join" && long.name?.length).toBe(60);
  });
  it("recognizes status words", () => {
    expect(parseSmsCommand("STATUS").kind).toBe("status");
    expect(parseSmsCommand("wait").kind).toBe("status");
  });
  it("falls back to unknown", () => {
    expect(parseSmsCommand("what time").kind).toBe("unknown");
    expect(parseSmsCommand("").kind).toBe("unknown");
  });
});
