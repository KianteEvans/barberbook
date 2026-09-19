"use client";

import type { ReactNode } from "react";
import { useRouter } from "next/navigation";
import { MutationForm } from "@/components/ui/MutationForm";
import { voidSaleAction } from "@/domain/pos/actions";

/** Admin-only reversal; the sale stays in history rather than disappearing. */
export function VoidSaleButton({ saleId }: { saleId: string }): ReactNode {
  const router = useRouter();
  return (
    <MutationForm
      action={voidSaleAction}
      submitLabel="Void"
      variant="danger"
      successMessage="Sale voided."
      hidden={{ saleId }}
      onSuccess={() => router.refresh()}
    />
  );
}
