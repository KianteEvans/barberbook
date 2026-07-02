"use client";

import { useState, type ReactNode } from "react";
import { MutationForm } from "@/components/ui/MutationForm";
import type { ActionState } from "@/domain/forms";

/**
 * Weekly hours editor: seven "H:MM-H:MM" text inputs (blank = closed) packed
 * into a single pipe-separated hidden field for the server action.
 */
export function HoursEditor({
  barberId,
  weekdays,
  initial,
  action,
}: {
  barberId: string;
  weekdays: string[];
  initial: string[];
  action: (prev: ActionState, formData: FormData) => Promise<ActionState>;
}): ReactNode {
  const [values, setValues] = useState<string[]>(initial);

  return (
    <MutationForm
      action={action}
      submitLabel="Save hours"
      successMessage="Weekly hours saved."
      hidden={{ barberId, hours: values.join("|") }}
    >
      <div style={{ display: "grid", gap: 8 }}>
        {weekdays.map((day, i) => (
          <label
            key={day}
            style={{
              display: "grid",
              gridTemplateColumns: "110px 1fr",
              alignItems: "center",
              gap: 12,
              fontSize: 13,
              fontWeight: 600,
            }}
          >
            {day}
            <input
              value={values[i] ?? ""}
              onChange={(e) => {
                const next = [...values];
                next[i] = e.target.value;
                setValues(next);
              }}
              placeholder="closed (or 9:00-18:00)"
              style={{
                background: "var(--panel-2)",
                border: "1px solid var(--border)",
                borderRadius: 8,
                padding: "8px 12px",
                fontSize: 13,
                color: "var(--text)",
              }}
            />
          </label>
        ))}
      </div>
    </MutationForm>
  );
}
