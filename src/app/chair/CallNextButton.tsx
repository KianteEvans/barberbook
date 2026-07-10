"use client";

import type { ReactNode } from "react";
import { useRouter } from "next/navigation";
import { MutationForm } from "@/components/ui/MutationForm";
import { callNextWalkinAction } from "@/domain/walkins/actions";

/** Barber: claim the next waiting walk-in (own chair or first-available). */
export function CallNextButton(): ReactNode {
  const router = useRouter();
  return (
    <MutationForm
      action={callNextWalkinAction}
      submitLabel="Call next"
      successMessage="Next up!"
      onSuccess={() => router.refresh()}
    />
  );
}
