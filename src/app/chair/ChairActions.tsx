"use client";

import type { ReactNode } from "react";
import { useRouter } from "next/navigation";
import { MutationForm } from "@/components/ui/MutationForm";
import {
  markCompletedAction,
  markNoShowAction,
} from "@/domain/admin/appointment-actions";

export function ChairActions({
  appointmentId,
  status,
}: {
  appointmentId: string;
  status: string;
}): ReactNode {
  const router = useRouter();
  const done = () => router.refresh();
  const live =
    status === "confirmed" || status === "reserved" || status === "pending_deposit";
  if (!live) return null;

  return (
    <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
      <MutationForm
        action={markCompletedAction}
        submitLabel="Completed"
        successMessage="Marked completed."
        hidden={{ appointmentId }}
        onSuccess={done}
      />
      {status === "confirmed" && (
        <MutationForm
          action={markNoShowAction}
          submitLabel="No-show"
          variant="secondary"
          successMessage="Marked no-show."
          hidden={{ appointmentId }}
          onSuccess={done}
        />
      )}
    </div>
  );
}
