import type { ReactNode } from "react";
import { PageShell } from "@/components/ui/PageShell";
import { SkeletonCard } from "@/components/ui/Skeleton";

export default function AccountLoading(): ReactNode {
  return (
    <PageShell title="My account">
      <SkeletonCard lines={3} />
      <SkeletonCard lines={4} />
    </PageShell>
  );
}
