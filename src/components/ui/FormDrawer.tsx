"use client";

import { useState, type ReactNode } from "react";
import { Drawer } from "./Drawer";
import { MutationForm } from "./MutationForm";
import type { ActionState } from "@/domain/forms";

/**
 * Trigger button + right-side drawer wrapping a MutationForm. The standard
 * create/edit affordance: lists stay data-first, forms live behind a button.
 */
export function FormDrawer({
  trigger,
  title,
  action,
  submitLabel = "Save",
  successMessage,
  hidden,
  variant = "primary",
  children,
}: {
  trigger: string;
  title: string;
  action: (prev: ActionState, formData: FormData) => Promise<ActionState>;
  submitLabel?: string;
  successMessage?: string;
  hidden?: Readonly<Record<string, string>>;
  variant?: "primary" | "secondary";
  children?: ReactNode;
}): ReactNode {
  const [open, setOpen] = useState(false);

  const triggerStyle =
    variant === "primary"
      ? {
          background: "var(--accent)",
          color: "var(--accent-ink)",
          border: "1px solid var(--accent)",
        }
      : {
          background: "transparent",
          color: "var(--text)",
          border: "1px solid var(--border)",
        };

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        style={{
          ...triggerStyle,
          borderRadius: 8,
          padding: "9px 18px",
          fontWeight: 600,
          fontSize: 13,
          cursor: "pointer",
        }}
      >
        {trigger}
      </button>
      <Drawer open={open} onClose={() => setOpen(false)} title={title}>
        <MutationForm
          action={action}
          submitLabel={submitLabel}
          successMessage={successMessage}
          hidden={hidden}
          onSuccess={() => setOpen(false)}
        >
          {children}
        </MutationForm>
      </Drawer>
    </>
  );
}
