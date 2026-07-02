"use client";

import type { ReactNode } from "react";
import { MutationForm } from "@/components/ui/MutationForm";
import { subscribeAction } from "@/domain/memberships/actions";

export function SubscribeButton({ planId }: { planId: string }): ReactNode {
  return (
    <MutationForm
      action={subscribeAction}
      submitLabel="Join"
      successMessage="Redirecting to checkout..."
      hidden={{ planId }}
    />
  );
}
