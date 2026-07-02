import type { ReactNode } from "react";

/** Centered max-width content shell with a title row. */
export function PageShell({
  title,
  subtitle,
  action,
  children,
  maxWidth = 1080,
}: {
  title: string;
  subtitle?: string;
  action?: ReactNode;
  children: ReactNode;
  maxWidth?: number;
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
        <div>
          <h1 style={{ margin: 0, fontSize: 22, fontWeight: 800 }}>{title}</h1>
          {subtitle && (
            <p style={{ margin: "4px 0 0", color: "var(--muted)", fontSize: 14 }}>
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
