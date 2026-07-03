import Link from "next/link";
import type { CSSProperties, ReactNode } from "react";
import { ScissorsIcon } from "./icons";

/** Shared server-renderable primitives: Card, Badge, Button-link, EmptyState. */

export function Card({
  title,
  action,
  hover = false,
  children,
  style,
}: {
  title?: string;
  action?: ReactNode;
  /** Lift + deepen shadow on hover (for clickable/scannable cards). */
  hover?: boolean;
  children: ReactNode;
  style?: CSSProperties;
}): ReactNode {
  return (
    <section
      className={hover ? "card-hover" : undefined}
      style={{
        background: "var(--panel)",
        border: "1px solid var(--border)",
        borderRadius: "var(--radius-lg)",
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
            <h2
              style={{
                margin: 0,
                fontSize: 13,
                fontWeight: 700,
                textTransform: "uppercase",
                letterSpacing: "0.05em",
                color: "var(--text)",
              }}
            >
              {title}
            </h2>
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
        border: `1px solid color-mix(in srgb, ${t.fg} 30%, transparent)`,
        borderRadius: "var(--radius-full)",
        padding: "2px 8px",
        fontSize: 11,
        fontWeight: 700,
        textTransform: "uppercase",
        letterSpacing: "0.05em",
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
      className={variant === "primary" ? "btn" : "btn btn-secondary"}
      style={{
        ...styles,
        display: "inline-block",
        borderRadius: "var(--radius-sm)",
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
        borderRadius: "var(--radius-lg)",
        padding: "36px 24px",
        textAlign: "center",
        display: "grid",
        gap: 10,
        justifyItems: "center",
      }}
    >
      <span style={{ color: "var(--muted)", opacity: 0.7 }}>
        <ScissorsIcon size={28} />
      </span>
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
      <span
        style={{
          fontSize: 11,
          fontWeight: 600,
          textTransform: "uppercase",
          letterSpacing: "0.05em",
          color: "var(--muted)",
        }}
      >
        {label}
      </span>
      <span className="display" style={{ fontSize: 17, fontWeight: 600 }}>
        {value}
      </span>
    </div>
  );
}
