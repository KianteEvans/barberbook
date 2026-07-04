"use client";

import type { ReactNode } from "react";
import { useRouter } from "next/navigation";
import { MutationForm } from "@/components/ui/MutationForm";
import { joinWaitlistAction } from "@/domain/waitlist/actions";

export function JoinLineButton({
  barberId,
  serviceId,
  desiredStartAt,
  label,
}: {
  barberId: string;
  serviceId: string;
  desiredStartAt: string;
  label: string;
}): ReactNode {
  const router = useRouter();
  return (
    <MutationForm
      action={joinWaitlistAction}
      submitLabel={label}
      variant="secondary"
      successMessage="You're in line."
      hidden={{ barberId, serviceId, desiredStartAt }}
      onSuccess={() => router.refresh()}
    />
  );
}
