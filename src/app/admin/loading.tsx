import type { ReactNode } from "react";
import { PageShell } from "@/components/ui/PageShell";
import { Skeleton, SkeletonCard } from "@/components/ui/Skeleton";

export default function AdminLoading(): ReactNode {
  return (
    <PageShell title="Loading">
      <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} width={140} height={64} radius={10} />
        ))}
      </div>
      <SkeletonCard lines={4} />
    </PageShell>
  );
}
