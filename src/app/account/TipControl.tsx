"use client";

import { useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { MutationForm } from "@/components/ui/MutationForm";
import { addTipAction } from "@/domain/tips/actions";

/**
 * Compact post-visit tip: a "Tip" toggle reveals preset chips (percent of the
 * visit total, or fixed amounts when the total is unknown) plus a custom
 * dollar amount, then submits.
 */
export function TipControl({
  appointmentId,
  totalCents,
}: {
  appointmentId: string;
  totalCents: number;
}): ReactNode {
  const [open, setOpen] = useState(false);
  const [amount, setAmount] = useState<number>(0);
  const [custom, setCustom] = useState("");
  const router = useRouter();

  const presets =
    totalCents > 0
      ? [
          { label: "15%", cents: Math.round(totalCents * 0.15) },
          { label: "18%", cents: Math.round(totalCents * 0.18) },
          { label: "20%", cents: Math.round(totalCents * 0.2) },
        ]
      : [
          { label: "$5", cents: 500 },
          { label: "$10", cents: 1000 },
          { label: "$15", cents: 1500 },
        ];

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        style={{
          background: "transparent",
          border: "none",
          cursor: "pointer",
          fontSize: 12,
          fontWeight: 600,
          color: "var(--accent)",
        }}
      >
        Tip
      </button>
    );
  }

  return (
    <div style={{ display: "grid", gap: 6, justifyItems: "end" }}>
      <div style={{ display: "flex", gap: 4, flexWrap: "wrap", justifyContent: "flex-end" }}>
        {presets.map((p) => (
          <button
            key={p.label}
            type="button"
            onClick={() => {
              setAmount(p.cents);
              setCustom("");
            }}
            style={{
              padding: "4px 8px",
              borderRadius: "var(--radius-sm)",
              fontSize: 12,
              fontWeight: 600,
              cursor: "pointer",
              border: `1px solid ${amount === p.cents && !custom ? "var(--accent)" : "var(--border)"}`,
              background: amount === p.cents && !custom ? "var(--accent)" : "var(--panel-2)",
              color: amount === p.cents && !custom ? "var(--accent-ink)" : "var(--text)",
            }}
          >
            {p.label}
          </button>
        ))}
        <input
          value={custom}
          onChange={(e) => {
            const v = e.target.value.replace(/[^0-9.]/g, "");
            setCustom(v);
            setAmount(Math.round(Number(v) * 100));
          }}
          placeholder="$"
          inputMode="decimal"
          style={{
            width: 52,
            padding: "4px 6px",
            borderRadius: "var(--radius-sm)",
            border: "1px solid var(--border)",
            background: "var(--panel-2)",
            color: "var(--text)",
            fontSize: 12,
          }}
        />
      </div>
      {amount >= 100 && (
        <MutationForm
          action={addTipAction}
          submitLabel={`Tip $${(amount / 100).toFixed(2)}`}
          hidden={{ appointmentId, amountCents: String(amount) }}
          onSuccess={() => router.refresh()}
        />
      )}
    </div>
  );
}
