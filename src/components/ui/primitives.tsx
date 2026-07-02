import Link from "next/link";
import type { CSSProperties, ReactNode } from "react";

/** Shared server-renderable primitives: Card, Badge, Button-link, EmptyState. */

export function Card({
  title,
  action,
  children,
  style,
}: {
  title?: string;
  action?: ReactNode;
  children: ReactNode;
  style?: CSSProperties;
}): ReactNode {
  return (
    <section
      style={{
        background: "var(--panel)",
        border: "1px solid var(--border)",
        borderRadius: 12,
        padding: 20,
        boxShadow: "var(--shadow)",
        ...style,
      }}
    >
      {(title || action) && (
        <header
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: 14,
            gap: 12,
          }}
        >
          {title && (
            <h2 style={{ margin: 0, fontSize: 15, fontWeight: 700 }}>{title}</h2>
          )}
          {action}
        </header>
      )}
      {children}
    </section>
  );
}

export type BadgeTone = "ok" | "warn" | "danger" | "info" | "neutral";

const badgeTones: Record<BadgeTone, { bg: string; fg: string }> = {
  ok: { bg: "color-mix(in srgb, var(--ok) 15%, transparent)", fg: "var(--ok)" },
  warn: { bg: "color-mix(in srgb, var(--warn) 15%, transparent)", fg: "var(--warn)" },
  danger: { bg: "color-mix(in srgb, var(--danger) 15%, transparent)", fg: "var(--danger)" },
  info: { bg: "color-mix(in srgb, var(--info) 15%, transparent)", fg: "var(--info)" },
  neutral: { bg: "color-mix(in srgb, var(--muted) 15%, transparent)", fg: "var(--muted)" },
};

export function Badge({
  tone = "neutral",
  children,
}: {
  tone?: BadgeTone;
  children: ReactNode;
}): ReactNode {
  const t = badgeTones[tone];
  return (
    <span
      style={{
        display: "inline-block",
        background: t.bg,
        color: t.fg,
        borderRadius: 999,
        padding: "2px 10px",
        fontSize: 12,
        fontWeight: 600,
        whiteSpace: "nowrap",
      }}
    >
      {children}
    </span>
  );
}

export function ButtonLink({
  href,
  variant = "primary",
  children,
}: {
  href: string;
  variant?: "primary" | "secondary";
  children: ReactNode;
}): ReactNode {
  const styles: CSSProperties =
    variant === "primary"
      ? {
          background: "var(--accent)",
          color: "var(--accent-ink)",
          border: "1px solid var(--accent)",
        }
      : {
          background: "transparent",
          color: "var(--text)",
          border: "1px solid var(--border)",
        };
  return (
    <Link
      href={href}
      style={{
        ...styles,
        display: "inline-block",
        borderRadius: 8,
        padding: "9px 18px",
        fontWeight: 600,
        fontSize: 13,
        textDecoration: "none",
      }}
    >
      {children}
    </Link>
  );
}

export function EmptyState({
  title,
  hint,
  action,
}: {
  title: string;
  hint?: string;
  action?: ReactNode;
}): ReactNode {
  return (
    <div
      style={{
        border: "1px dashed var(--border)",
        borderRadius: 12,
        padding: "36px 24px",
        textAlign: "center",
        display: "grid",
        gap: 8,
        justifyItems: "center",
      }}
    >
      <p style={{ margin: 0, fontWeight: 600, fontSize: 14 }}>{title}</p>
      {hint && (
        <p style={{ margin: 0, color: "var(--muted)", fontSize: 13 }}>{hint}</p>
      )}
      {action}
    </div>
  );
}

/** Simple key/value stat block used on heroes and detail drawers. */
export function Stat({
  label,
  value,
}: {
  label: string;
  value: ReactNode;
}): ReactNode {
  return (
    <div style={{ display: "grid", gap: 2 }}>
      <span style={{ fontSize: 12, color: "var(--muted)" }}>{label}</span>
      <span style={{ fontSize: 16, fontWeight: 700 }}>{value}</span>
    </div>
  );
}
