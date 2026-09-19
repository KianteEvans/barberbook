"use client";

import { useRouter } from "next/navigation";
import type { ReactNode } from "react";
import { MutationForm } from "@/components/ui/MutationForm";
import { leaveQueueSelfAction } from "@/domain/walkins/actions";

/** Lets a waiting client drop out of the line with their own ticket token. */
export function LeaveLineButton({ token }: { token: string }): ReactNode {
  const router = useRouter();
  return (
    <MutationForm
      action={leaveQueueSelfAction}
      submitLabel="Leave the line"
      variant="secondary"
      successMessage="You're out of the line."
      hidden={{ token }}
      onSuccess={() => router.refresh()}
    />
  );
}
