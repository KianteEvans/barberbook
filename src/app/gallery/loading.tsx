import type { ReactNode } from "react";
import { PageShell } from "@/components/ui/PageShell";
import { SkeletonGrid } from "@/components/ui/Skeleton";

export default function GalleryLoading(): ReactNode {
  return (
    <PageShell title="Gallery" maxWidth={980} stripe>
      <SkeletonGrid count={8} minWidth={200} />
    </PageShell>
  );
}
