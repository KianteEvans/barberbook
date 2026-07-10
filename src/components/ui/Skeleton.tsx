import type { CSSProperties, ReactNode } from "react";

/** Shimmering placeholder block. Widths/heights accept any CSS length. */
export function Skeleton({
  width = "100%",
  height = 16,
  radius,
  style,
}: {
  width?: number | string;
  height?: number | string;
  radius?: number | string;
  style?: CSSProperties;
}): ReactNode {
  return (
    <div
      className="skeleton"
      aria-hidden
      style={{ width, height, ...(radius !== undefined ? { borderRadius: radius } : {}), ...style }}
    />
  );
}

/** A card-shaped skeleton with a title line and a few body lines. */
export function SkeletonCard({ lines = 3 }: { lines?: number }): ReactNode {
  return (
    <div
      style={{
        background: "var(--panel)",
        border: "1px solid var(--border)",
        borderRadius: "var(--radius-lg)",
        padding: 16,
        display: "grid",
        gap: 12,
      }}
    >
      <Skeleton width="40%" height={18} />
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton key={i} width={i === lines - 1 ? "70%" : "100%"} height={12} />
      ))}
    </div>
  );
}

/** A responsive grid of card skeletons. */
export function SkeletonGrid({
  count = 6,
  minWidth = 220,
}: {
  count?: number;
  minWidth?: number;
}): ReactNode {
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: `repeat(auto-fill, minmax(${minWidth}px, 1fr))`,
        gap: 12,
      }}
    >
      {Array.from({ length: count }).map((_, i) => (
        <SkeletonCard key={i} lines={2} />
      ))}
    </div>
  );
}
