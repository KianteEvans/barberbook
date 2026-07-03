"use client";

import { useActionState, useEffect, useState, type ReactNode } from "react";
import { IDLE_STATE, type ActionState } from "@/domain/forms";
import { emitToast } from "./toast";

/**
 * Client island that drives any domain server action. Adds a per-form
 * idempotency token (hidden field) that ROTATES after a successful submit, so
 * a true retry replays/dedupes while a fresh edit is a new operation, plus an
 * error slot fed by the typed ActionState the action returns.
 */
export function MutationForm({
  action,
  submitLabel = "Save",
  successMessage = "Saved.",
  variant = "primary",
  hidden,
  onSuccess,
  children,
}: {
  action: (prev: ActionState, formData: FormData) => Promise<ActionState>;
  submitLabel?: string;
  successMessage?: string | undefined;
  variant?: "primary" | "secondary" | "danger";
  hidden?: Readonly<Record<string, string>> | undefined;
  /** Called after a successful submit - e.g. to close a drawer. */
  onSuccess?: () => void;
  children?: ReactNode;
}): ReactNode {
  const [state, formAction, pending] = useActionState(action, IDLE_STATE);
  const [token, setToken] = useState(() => crypto.randomUUID());

  useEffect(() => {
    if (state.ok) {
      setToken(crypto.randomUUID());
      emitToast(state.detail ?? successMessage ?? "Saved.", "ok");
      onSuccess?.();
    } else if (state.error) {
      emitToast(state.error, "danger");
    }
    // Key only on `state`; the callbacks are stable enough.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);

  const v =
    variant === "primary"
      ? {
          background: "var(--accent)",
          color: "var(--accent-ink)",
          border: "1px solid var(--accent)",
        }
      : variant === "danger"
        ? {
            background: "color-mix(in srgb, var(--danger) 12%, transparent)",
            color: "var(--danger)",
            border: "1px solid color-mix(in srgb, var(--danger) 45%, transparent)",
          }
        : {
            background: "transparent",
            color: "var(--text)",
            border: "1px solid var(--border)",
          };

  return (
    <form action={formAction} style={{ display: "grid", gap: 12 }}>
      {hidden &&
        Object.entries(hidden).map(([k, val]) => (
          <input key={k} type="hidden" name={k} value={val} />
        ))}
      <input type="hidden" name="idempotencyKey" value={token} />
      {children}
      {state.error && (
        <p role="alert" style={{ color: "var(--danger)", margin: 0, fontSize: 13 }}>
          {state.error}
        </p>
      )}
      <button
        type="submit"
        disabled={pending}
        className={variant === "primary" ? "btn" : "btn btn-secondary"}
        style={{
          justifySelf: "start",
          ...v,
          borderRadius: "var(--radius-sm)",
          padding: "9px 18px",
          fontWeight: 600,
          fontSize: 13,
          cursor: pending ? "progress" : "pointer",
          opacity: pending ? 0.6 : 1,
        }}
      >
        {pending ? "Working..." : submitLabel}
      </button>
    </form>
  );
}
