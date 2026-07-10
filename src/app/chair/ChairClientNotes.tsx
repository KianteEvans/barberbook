"use client";

import { useState, type ReactNode } from "react";
import { Drawer } from "@/components/ui/Drawer";
import { ClientNotes, type NoteView } from "@/components/ui/ClientNotes";

/** A compact "Notes (n)" button per chair row that opens the notes drawer. */
export function ChairClientNotes({
  clientId,
  clientName,
  notes,
}: {
  clientId: string;
  clientName: string;
  notes: NoteView[];
}): ReactNode {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="btn btn-secondary"
        style={{
          background: "transparent",
          border: "1px solid var(--border)",
          borderRadius: "var(--radius-sm)",
          padding: "5px 10px",
          cursor: "pointer",
          fontSize: 12,
          fontWeight: 600,
          color: notes.length > 0 ? "var(--accent)" : "var(--muted)",
          whiteSpace: "nowrap",
        }}
      >
        Notes{notes.length > 0 ? ` (${notes.length})` : ""}
      </button>
      <Drawer open={open} onClose={() => setOpen(false)} title={`Notes - ${clientName}`}>
        <ClientNotes clientId={clientId} notes={notes} />
      </Drawer>
    </>
  );
}
