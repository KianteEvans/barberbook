"use client";

import { useState, type ReactNode } from "react";

/**
 * How the client wants to hold the slot when online payments are on:
 * pay the deposit now (locked, no confirmation needed) or reserve free
 * (must confirm attendance before the cut). Posts as `depositChoice`.
 */
export function DepositChoice({
  depositLabel,
  cancellationWindowHours,
}: {
  depositLabel: string;
  cancellationWindowHours: number;
}): ReactNode {
  const [choice, setChoice] = useState<"deposit" | "reserve">("deposit");

  const card = (active: boolean) =>
    ({
      display: "grid",
      gap: 4,
      padding: "12px 14px",
      borderRadius: 10,
      cursor: "pointer",
      border: `1px solid ${active ? "var(--accent)" : "var(--border)"}`,
      background: active
        ? "color-mix(in srgb, var(--accent) 8%, transparent)"
        : "var(--panel-2)",
    }) as const;

  return (
    <div style={{ display: "grid", gap: 8 }}>
      <span style={{ fontSize: 13, fontWeight: 700 }}>How do you want to hold the slot?</span>
      <label style={card(choice === "deposit")}>
        <span style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 14, fontWeight: 700 }}>
          <input
            type="radio"
            name="depositChoice"
            value="deposit"
            checked={choice === "deposit"}
            onChange={() => setChoice("deposit")}
          />
          Pay the {depositLabel} deposit - slot locked
        </span>
        <span style={{ fontSize: 12, color: "var(--muted)", marginLeft: 22 }}>
          Secure checkout, counted toward your total. No confirmation needed -
          full refund if you cancel at least {cancellationWindowHours} hours ahead.
        </span>
      </label>
      <label style={card(choice === "reserve")}>
        <span style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 14, fontWeight: 700 }}>
          <input
            type="radio"
            name="depositChoice"
            value="reserve"
            checked={choice === "reserve"}
            onChange={() => setChoice("reserve")}
          />
          Reserve without a deposit
        </span>
        <span style={{ fontSize: 12, color: "var(--muted)", marginLeft: 22 }}>
          Pay the full amount at the shop. We&apos;ll ask you to confirm you&apos;re
          coming before your cut - unconfirmed slots are released to the line.
        </span>
      </label>
    </div>
  );
}
