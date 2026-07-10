"use client";

import { useRouter } from "next/navigation";
import type { ReactNode } from "react";
import { format } from "date-fns";
import { MutationForm } from "@/components/ui/MutationForm";
import { Field, TextArea } from "@/components/ui/fields";
import { EmptyState } from "@/components/ui/primitives";
import { addClientNoteAction, deleteClientNoteAction } from "@/domain/clients/actions";

export interface NoteView {
  readonly id: string;
  readonly body: string;
  readonly authorName: string | null;
  readonly createdAt: Date | string;
}

/** Staff-facing client notes: add + list + delete. Reused on admin + chair. */
export function ClientNotes({
  clientId,
  notes,
}: {
  clientId: string;
  notes: NoteView[];
}): ReactNode {
  const router = useRouter();
  const refresh = () => router.refresh();

  return (
    <div style={{ display: "grid", gap: 14 }}>
      <MutationForm
        action={addClientNoteAction}
        submitLabel="Add note"
        successMessage="Note added."
        hidden={{ clientId }}
        onSuccess={refresh}
      >
        <Field label="Private note (staff only)">
          <TextArea name="body" rows={2} placeholder="e.g. #2 on the sides, no talking" />
        </Field>
      </MutationForm>

      {notes.length === 0 ? (
        <EmptyState title="No notes yet" hint="Add a note only staff can see." />
      ) : (
        <div style={{ display: "grid", gap: 8 }}>
          {notes.map((n) => (
            <div
              key={n.id}
              style={{
                display: "flex",
                justifyContent: "space-between",
                gap: 12,
                alignItems: "start",
                border: "1px solid var(--border)",
                borderRadius: "var(--radius-sm)",
                padding: "10px 12px",
                background: "var(--panel-2)",
              }}
            >
              <div style={{ display: "grid", gap: 3 }}>
                <span style={{ fontSize: 13, lineHeight: 1.5 }}>{n.body}</span>
                <span style={{ fontSize: 11, color: "var(--muted)" }}>
                  {n.authorName ?? "Staff"} - {format(new Date(n.createdAt), "MMM d, yyyy")}
                </span>
              </div>
              <MutationForm
                action={deleteClientNoteAction}
                submitLabel="Delete"
                variant="danger"
                successMessage="Note removed."
                hidden={{ id: n.id }}
                onSuccess={refresh}
              />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
