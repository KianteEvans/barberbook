import { describe, expect, it } from "vitest";
import { canSelfJoin, type SelfJoinInput } from "./selfjoin";

const base: SelfJoinInput = {
  enabled: true,
  waitingCount: 3,
  maxWaiting: 20,
  alreadyInLine: false,
};

describe("canSelfJoin", () => {
  it("lets a new walk-in join an open line", () => {
    expect(canSelfJoin(base).ok).toBe(true);
  });

  it("refuses when the owner switched self-join off", () => {
    const d = canSelfJoin({ ...base, enabled: false });
    expect(d).toMatchObject({ ok: false, reason: "disabled" });
  });

  it("refuses someone already holding a spot", () => {
    const d = canSelfJoin({ ...base, alreadyInLine: true });
    expect(d).toMatchObject({ ok: false, reason: "already_in_line" });
  });

  it("refuses once the line hits the cap", () => {
    expect(canSelfJoin({ ...base, waitingCount: 20 })).toMatchObject({
      ok: false,
      reason: "full",
    });
    // One under the cap still gets in.
    expect(canSelfJoin({ ...base, waitingCount: 19 }).ok).toBe(true);
  });

  it("treats a zero cap as unlimited", () => {
    expect(canSelfJoin({ ...base, maxWaiting: 0, waitingCount: 500 }).ok).toBe(true);
  });

  it("reports being in line before the line being full", () => {
    // Both apply; the actionable message is the personal one.
    const d = canSelfJoin({ ...base, alreadyInLine: true, waitingCount: 99 });
    expect(d).toMatchObject({ ok: false, reason: "already_in_line" });
  });

  it("carries a client-safe message on every refusal", () => {
    for (const d of [
      canSelfJoin({ ...base, enabled: false }),
      canSelfJoin({ ...base, alreadyInLine: true }),
      canSelfJoin({ ...base, waitingCount: 20 }),
    ]) {
      expect(d.ok).toBe(false);
      if (!d.ok) expect(d.message.length).toBeGreaterThan(10);
    }
  });
});
