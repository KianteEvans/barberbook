"use client";

import type { ReactNode } from "react";
import { useRouter } from "next/navigation";
import { MutationForm } from "@/components/ui/MutationForm";
import { finalizePayoutAction } from "@/domain/payroll/actions";

/** Freezes the computed payout for this barber + period and marks it paid. */
export function FinalizeButton({
  barberId,
  start,
  end,
}: {
  barberId: string;
  start: string;
  end: string;
}): ReactNode {
  const router = useRouter();
  return (
    <MutationForm
      action={finalizePayoutAction}
      submitLabel="Mark paid"
      successMessage="Payout marked paid."
      hidden={{ barberId, start, end }}
      onSuccess={() => router.refresh()}
    />
  );
}
