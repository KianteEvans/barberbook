"use client";

import type { ReactNode } from "react";
import { useRouter } from "next/navigation";
import { MutationForm } from "@/components/ui/MutationForm";
import {
  materializeNowAction,
  setSeriesStatusAction,
} from "@/domain/series/actions";

export function SeriesStatusButtons({
  seriesId,
  status,
}: {
  seriesId: string;
  status: string;
}): ReactNode {
  const router = useRouter();
  const refresh = () => router.refresh();
  return (
    <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
      {status === "active" && (
        <MutationForm
          action={setSeriesStatusAction}
          submitLabel="Pause"
          variant="secondary"
          hidden={{ seriesId, status: "paused" }}
          onSuccess={refresh}
        />
      )}
      {status === "paused" && (
        <MutationForm
          action={setSeriesStatusAction}
          submitLabel="Resume"
          variant="secondary"
          hidden={{ seriesId, status: "active" }}
          onSuccess={refresh}
        />
      )}
      {status !== "canceled" && (
        <MutationForm
          action={setSeriesStatusAction}
          submitLabel="Cancel series"
          variant="danger"
          hidden={{ seriesId, status: "canceled" }}
          onSuccess={refresh}
        />
      )}
    </div>
  );
}

export function MaterializeNowButton(): ReactNode {
  const router = useRouter();
  return (
    <MutationForm
      action={materializeNowAction}
      submitLabel="Materialize now"
      variant="secondary"
      onSuccess={() => router.refresh()}
    />
  );
}
