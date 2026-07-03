import type { ReactNode } from "react";

/** Centered max-width content shell with a title row. */
export function PageShell({
  title,
  subtitle,
  action,
  children,
  maxWidth = 1080,
  stripe = false,
}: {
  title: string;
  subtitle?: string;
  action?: ReactNode;
  children: ReactNode;
  maxWidth?: number;
  /** Show the barber-pole rule under the title (public pages only). */
  stripe?: boolean;
}): ReactNode {
  return (
    <main
      style={{
        maxWidth,
        margin: "0 auto",
        padding: "clamp(16px, 4vw, 32px)",
        display: "grid",
        gap: 20,
      }}
    >
      <header
        style={{
          display: "flex",
          flexWrap: "wrap",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 12,
        }}
      >
        <div style={{ display: "grid", gap: 6 }}>
          <h1
            className="display"
            style={{
              margin: 0,
              fontSize: 26,
              fontWeight: 600,
              textTransform: "uppercase",
              letterSpacing: "0.04em",
            }}
          >
            {title}
          </h1>
          {stripe && <div className="pole-stripe" style={{ width: 72 }} />}
          {subtitle && (
            <p style={{ margin: 0, color: "var(--muted)", fontSize: 14 }}>
              {subtitle}
            </p>
          )}
        </div>
        {action}
      </header>
      {children}
    </main>
  );
}
