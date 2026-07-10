"use client";

import type { ReactNode } from "react";
import { useRouter } from "next/navigation";
import { MutationForm } from "@/components/ui/MutationForm";
import { approveReviewAction, rejectReviewAction } from "@/domain/reviews/actions";

export function ReviewModeration({ reviewId }: { reviewId: string }): ReactNode {
  const router = useRouter();
  const refresh = () => router.refresh();
  return (
    <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
      <MutationForm
        action={approveReviewAction}
        submitLabel="Approve"
        successMessage="Review approved."
        hidden={{ reviewId }}
        onSuccess={refresh}
      />
      <MutationForm
        action={rejectReviewAction}
        submitLabel="Reject"
        variant="danger"
        successMessage="Review rejected."
        hidden={{ reviewId }}
        onSuccess={refresh}
      />
    </div>
  );
}
