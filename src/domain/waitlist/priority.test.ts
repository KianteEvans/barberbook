import { describe, expect, it } from "vitest";
import { orderWaitlist } from "./priority";

const t = (min: number) => new Date(2026, 6, 4, 12, min);

describe("orderWaitlist", () => {
  const entries = [
    { id: "e1", clientId: "nonmember-early", createdAt: t(0) },
    { id: "e2", clientId: "member-late", createdAt: t(30) },
    { id: "e3", clientId: "member-early", createdAt: t(10) },
    { id: "e4", clientId: "nonmember-late", createdAt: t(20) },
  ];
  const members = new Set(["member-late", "member-early"]);

  it("puts members ahead of non-members, earliest first within a group", () => {
    const ordered = orderWaitlist(entries, members).map((e) => e.id);
    // members by join time: e3 (t10) then e2 (t30); then non-members: e1, e4.
    expect(ordered).toEqual(["e3", "e2", "e1", "e4"]);
  });

  it("falls back to pure FIFO when nobody is a member", () => {
    const ordered = orderWaitlist(entries, new Set()).map((e) => e.id);
    expect(ordered).toEqual(["e1", "e3", "e4", "e2"]);
  });

  it("does not mutate the input", () => {
    const copy = [...entries];
    orderWaitlist(entries, members);
    expect(entries).toEqual(copy);
  });
});
