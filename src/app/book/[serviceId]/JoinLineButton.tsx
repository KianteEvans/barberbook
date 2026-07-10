"use client";

import type { ReactNode } from "react";
import { useRouter } from "next/navigation";
import { MutationForm } from "@/components/ui/MutationForm";
import { joinWaitlistAction } from "@/domain/waitlist/actions";

export function JoinLineButton({
  barberId,
  serviceId,
  desiredStartAt,
  date,
  label,
}: {
  barberId: string;
  serviceId: string;
  /** Exact-slot join: the slot instant (ISO). */
  desiredStartAt?: string;
  /** Flexible join: a shop-local day (YYYY-MM-DD), any opening that day. */
  date?: string;
  label: string;
}): ReactNode {
  const router = useRouter();
  return (
    <MutationForm
      action={joinWaitlistAction}
      submitLabel={label}
      variant="secondary"
      successMessage={date ? "You're on the list for that day." : "You're in line."}
      hidden={{
        barberId,
        serviceId,
        ...(desiredStartAt ? { desiredStartAt } : {}),
        ...(date ? { date } : {}),
      }}
      onSuccess={() => router.refresh()}
    />
  );
}
