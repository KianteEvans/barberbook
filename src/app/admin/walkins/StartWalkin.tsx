"use client";

import type { ReactNode } from "react";
import { useRouter } from "next/navigation";
import { MutationForm } from "@/components/ui/MutationForm";
import { Select } from "@/components/ui/fields";
import { startWalkinAction } from "@/domain/walkins/actions";

/** Admin: pick a chair and start a waiting walk-in. */
export function StartWalkin({
  id,
  barberOptions,
  defaultBarberId,
}: {
  id: string;
  barberOptions: Array<{ id: string; name: string }>;
  defaultBarberId: string | null;
}): ReactNode {
  const router = useRouter();
  return (
    <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
      <MutationForm
        action={startWalkinAction}
        submitLabel="Start"
        successMessage="Walk-in started."
        hidden={{ id }}
        onSuccess={() => router.refresh()}
      >
        <Select name="barberId" defaultValue={defaultBarberId ?? barberOptions[0]?.id ?? ""}>
          {barberOptions.map((b) => (
            <option key={b.id} value={b.id}>
              {b.name}
            </option>
          ))}
        </Select>
      </MutationForm>
    </div>
  );
}
