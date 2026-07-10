"use client";

import { useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { MutationForm } from "@/components/ui/MutationForm";
import { rescheduleBookingAction } from "@/domain/booking/actions";

export interface SlotOption {
  readonly startIso: string;
  readonly label: string;
}

/**
 * Pick a new slot, then confirm the reschedule. Clicking a chip selects it;
 * the confirm form submits {appointmentId, startAt} to the reschedule action.
 */
export function RescheduleSlots({
  appointmentId,
  slots,
}: {
  appointmentId: string;
  slots: SlotOption[];
}): ReactNode {
  const [selected, setSelected] = useState<SlotOption | null>(null);
  const router = useRouter();

  if (slots.length === 0) {
    return (
      <p style={{ margin: 0, color: "var(--muted)", fontSize: 13 }}>
        No openings this day - try another day.
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
          action={rescheduleBookingAction}
          submitLabel={`Reschedule to ${selected.label}`}
          successMessage="Appointment rescheduled."
          hidden={{ appointmentId, startAt: selected.startIso }}
          onSuccess={() => router.push("/account")}
        />
      )}
    </div>
  );
}
