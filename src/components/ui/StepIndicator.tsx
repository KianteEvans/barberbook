import type { ReactNode } from "react";
import { CheckIcon } from "./icons";

const STEPS = ["Service", "Time", "Confirm"];

/** Booking-flow progress: done = accent fill, current = accent ring. */
export function StepIndicator({ current }: { current: 1 | 2 | 3 }): ReactNode {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 8,
        flexWrap: "wrap",
      }}
    >
      {STEPS.map((label, i) => {
        const step = i + 1;
        const done = step < current;
        const active = step === current;
        return (
          <div key={label} style={{ display: "flex", alignItems: "center", gap: 8 }}>
            {i > 0 && (
              <span
                style={{
                  width: 28,
                  height: 1,
                  background: done || active ? "var(--accent)" : "var(--border)",
                }}
              />
            )}
            <span
              style={{
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                width: 24,
                height: 24,
                borderRadius: "var(--radius-full)",
                fontSize: 12,
                fontWeight: 700,
                background: done ? "var(--accent)" : "transparent",
                color: done
                  ? "var(--accent-ink)"
                  : active
                    ? "var(--accent)"
                    : "var(--muted)",
                border: `2px solid ${done || active ? "var(--accent)" : "var(--border)"}`,
              }}
            >
              {done ? <CheckIcon size={13} /> : step}
            </span>
            <span
              style={{
                fontSize: 12,
                fontWeight: active ? 700 : 500,
                textTransform: "uppercase",
                letterSpacing: "0.05em",
                color: active ? "var(--text)" : "var(--muted)",
              }}
            >
              {label}
            </span>
          </div>
        );
      })}
    </div>
  );
}
