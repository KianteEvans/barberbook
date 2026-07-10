"use client";

import type { ReactNode } from "react";
import { useRouter } from "next/navigation";
import { MutationForm } from "@/components/ui/MutationForm";
import {
  toggleDiscountCodeAction,
  deleteDiscountCodeAction,
} from "@/domain/promotions/actions";

/** Enable/disable toggle + delete for a promo code row. */
export function CodeActions({
  id,
  active,
}: {
  id: string;
  active: boolean;
}): ReactNode {
  const router = useRouter();
  const refresh = () => router.refresh();
  return (
    <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
      <MutationForm
        action={toggleDiscountCodeAction}
        submitLabel={active ? "Disable" : "Enable"}
        variant="secondary"
        successMessage="Updated."
        hidden={{ id, active: active ? "false" : "true" }}
        onSuccess={refresh}
      />
      <MutationForm
        action={deleteDiscountCodeAction}
        submitLabel="Delete"
        variant="danger"
        successMessage="Deleted."
        hidden={{ id }}
        onSuccess={refresh}
      />
    </div>
  );
}
