"use client";

import type { ReactNode } from "react";
import { useRouter } from "next/navigation";
import { MutationForm } from "@/components/ui/MutationForm";
import { markAllReadAction } from "@/domain/notifications/actions";

export function MarkAllReadButton(): ReactNode {
  const router = useRouter();
  return (
    <MutationForm
      action={markAllReadAction}
      submitLabel="Mark all read"
      variant="secondary"
      successMessage="All caught up."
      onSuccess={() => router.refresh()}
    />
  );
}
