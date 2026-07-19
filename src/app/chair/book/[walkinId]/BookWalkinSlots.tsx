"use client";

import { useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { MutationForm } from "@/components/ui/MutationForm";
import { bookWalkinSlotAction } from "@/domain/walkins/actions";

export interface SlotOption {
  readonly startIso: string;
  readonly label: string;
}

/** Pick a free slot, then confirm booking the walk-in into it. */
export function BookWalkinSlots({
  walkinId,
  serviceId,
  walkinName,
  slots,
}: {
  walkinId: string;
  serviceId: string;
  walkinName: string;
  slots: SlotOption[];
}): ReactNode {
  const [selected, setSelected] = useState<SlotOption | null>(null);
  const router = useRouter();

  if (slots.length === 0) {
    return (
      <p style={{ margin: 0, color: "var(--muted)", fontSize: 13 }}>
        No openings this day - try another day or service.
      </p>
    );
  }

  return (
    <div style={{ display: "grid", gap: 14 }}>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(76px, 1fr))",
          gap: 8,
        }}
      >
        {slots.map((s) => {
          const isSel = selected?.startIso === s.startIso;
          return (
            <button
              key={s.startIso}
              type="button"
              onClick={() => setSelected(s)}
              className="chip"
              style={{
                textAlign: "center",
                padding: "9px 4px",
                borderRadius: "var(--radius-sm)",
                border: `1px solid ${isSel ? "var(--accent)" : "var(--border)"}`,
                background: isSel ? "var(--accent)" : "var(--panel-2)",
                color: isSel ? "var(--accent-ink)" : "var(--text)",
                fontSize: 13,
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              {s.label}
            </button>
          );
        })}
      </div>

      {selected && (
        <MutationForm
          action={bookWalkinSlotAction}
          submitLabel={`Book ${walkinName} at ${selected.label}`}
          successMessage="Booked onto your calendar."
          hidden={{ walkinId, serviceId, startAt: selected.startIso }}
          onSuccess={() => router.push("/chair")}
        />
      )}
    </div>
  );
}
