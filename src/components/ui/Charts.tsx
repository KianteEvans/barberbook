import type { ReactNode } from "react";

/** Lightweight, dependency-free inline-SVG / CSS charts for the admin reports. */

/** Area sparkline for a daily series. Renders a flat baseline when all-zero. */
export function Sparkline({
  points,
  width = 640,
  height = 72,
  stroke = "var(--accent)",
}: {
  points: readonly number[];
  width?: number;
  height?: number;
  stroke?: string;
}): ReactNode {
  const n = points.length;
  const max = Math.max(1, ...points);
  const pad = 4;
  const w = width - pad * 2;
  const h = height - pad * 2;
  const x = (i: number) => pad + (n <= 1 ? 0 : (i / (n - 1)) * w);
  const y = (v: number) => pad + h - (v / max) * h;

  const line = points.map((v, i) => `${x(i)},${y(v)}`).join(" ");
  const area = `${pad},${pad + h} ${line} ${pad + w},${pad + h}`;
  const gid = "spark-fill";

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      width="100%"
      height={height}
      preserveAspectRatio="none"
      role="img"
      aria-label="Daily revenue trend"
    >
      <defs>
        <linearGradient id={gid} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={stroke} stopOpacity="0.35" />
          <stop offset="100%" stopColor={stroke} stopOpacity="0" />
        </linearGradient>
      </defs>
      <polygon points={area} fill={`url(#${gid})`} />
      <polyline
        points={line}
        fill="none"
        stroke={stroke}
        strokeWidth={2}
        strokeLinejoin="round"
        strokeLinecap="round"
      />
    </svg>
  );
}

export interface BarItem {
  readonly label: string;
  readonly value: number;
  /** Right-aligned display value (e.g. "$120.00", "42%"). */
  readonly display: string;
}

/** Horizontal bar list, each bar proportional to the largest value. */
export function BarList({ items }: { items: readonly BarItem[] }): ReactNode {
  const max = Math.max(1, ...items.map((i) => i.value));
  return (
    <div style={{ display: "grid", gap: 12 }}>
      {items.map((it) => (
        <div key={it.label} style={{ display: "grid", gap: 4 }}>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              gap: 12,
              fontSize: 13,
              fontWeight: 600,
            }}
          >
            <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {it.label}
            </span>
            <span style={{ color: "var(--muted)", whiteSpace: "nowrap" }}>{it.display}</span>
          </div>
          <div
            style={{
              height: 8,
              borderRadius: 999,
              background: "var(--panel-2)",
              overflow: "hidden",
            }}
          >
            <div
              style={{
                height: "100%",
                width: `${Math.max(2, (it.value / max) * 100)}%`,
                borderRadius: 999,
                background: "var(--accent)",
              }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}
