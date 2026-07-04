"use client";

import type { ReactNode } from "react";
import { useRouter } from "next/navigation";
import { MutationForm } from "@/components/ui/MutationForm";
import { deleteTestimonialAction } from "@/domain/testimonials/actions";

export function DeleteTestimonialButton({ id }: { id: string }): ReactNode {
  const router = useRouter();
  return (
    <MutationForm
      action={deleteTestimonialAction}
      submitLabel="Delete"
      variant="danger"
      successMessage="Testimonial removed."
      hidden={{ id }}
      onSuccess={() => router.refresh()}
    />
  );
}
