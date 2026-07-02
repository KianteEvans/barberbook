"use client";

import type { ReactNode } from "react";
import { useRouter } from "next/navigation";
import { MutationForm } from "@/components/ui/MutationForm";
import { cancelBookingAction } from "@/domain/booking/actions";

export function CancelButton({ appointmentId }: { appointmentId: string }): ReactNode {
  const router = useRouter();
  return (
    <MutationForm
      action={cancelBookingAction}
      submitLabel="Cancel"
      variant="danger"
      successMessage="Appointment canceled."
      hidden={{ appointmentId }}
      onSuccess={() => router.refresh()}
    />
  );
}
