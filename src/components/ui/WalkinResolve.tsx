"use client";

import type { ReactNode } from "react";
import { useRouter } from "next/navigation";
import { MutationForm } from "@/components/ui/MutationForm";
import { resolveWalkinAction } from "@/domain/walkins/actions";

/** Terminal-state buttons for a live walk-in row (admin + chair). */
export function WalkinResolve({
  id,
  status,
}: {
  id: string;
  status: "waiting" | "serving";
}): ReactNode {
  const router = useRouter();
  const refresh = () => router.refresh();
  return (
    <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", flexWrap: "wrap" }}>
      {status === "serving" && (
        <MutationForm
          action={resolveWalkinAction}
          submitLabel="Done"
          successMessage="Marked done."
          hidden={{ id, outcome: "done" }}
          onSuccess={refresh}
        />
      )}
      {status === "serving" && (
        <MutationForm
          action={resolveWalkinAction}
          submitLabel="No-show"
          variant="secondary"
          successMessage="Marked no-show."
          hidden={{ id, outcome: "no_show" }}
          onSuccess={refresh}
        />
      )}
      {status === "waiting" && (
        <MutationForm
          action={resolveWalkinAction}
          submitLabel="Remove"
          variant="danger"
          successMessage="Removed."
          hidden={{ id, outcome: "canceled" }}
          onSuccess={refresh}
        />
      )}
    </div>
  );
}
