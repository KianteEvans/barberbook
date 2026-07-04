"use client";

import type { ReactNode } from "react";
import { useRouter } from "next/navigation";
import { MutationForm } from "@/components/ui/MutationForm";
import { confirmAttendanceAction } from "@/domain/booking/actions";

export function ConfirmAttendanceButton({
  appointmentId,
}: {
  appointmentId: string;
}): ReactNode {
  const router = useRouter();
  return (
    <MutationForm
      action={confirmAttendanceAction}
      submitLabel="Confirm attendance"
      successMessage="Spot locked in."
      hidden={{ appointmentId }}
      onSuccess={() => router.refresh()}
    />
  );
}
