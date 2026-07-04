"use client";

import type { ReactNode } from "react";
import { useRouter } from "next/navigation";
import { MutationForm } from "@/components/ui/MutationForm";
import { leaveWaitlistAction } from "@/domain/waitlist/actions";

export function LeaveWaitlistButton({ entryId }: { entryId: string }): ReactNode {
  const router = useRouter();
  return (
    <MutationForm
      action={leaveWaitlistAction}
      submitLabel="Leave line"
      variant="secondary"
      successMessage="Left the line."
      hidden={{ entryId }}
      onSuccess={() => router.refresh()}
    />
  );
}
