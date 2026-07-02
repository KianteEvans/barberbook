"use client";

import type { ReactNode } from "react";
import { useRouter } from "next/navigation";
import { MutationForm } from "@/components/ui/MutationForm";
import { deleteBarberPhotoAction } from "@/domain/barbers/actions";

export function PhotoDeleteButton({ photoId }: { photoId: string }): ReactNode {
  const router = useRouter();
  return (
    <MutationForm
      action={deleteBarberPhotoAction}
      submitLabel="Remove"
      variant="danger"
      successMessage="Photo removed."
      hidden={{ photoId }}
      onSuccess={() => router.refresh()}
    />
  );
}
