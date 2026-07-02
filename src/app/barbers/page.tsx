import type { ReactNode } from "react";
import Link from "next/link";
import { asc, eq } from "drizzle-orm";
import { db } from "@/db/client";
import { barbers } from "@/db/schema";
import { PageShell } from "@/components/ui/PageShell";
import { EmptyState } from "@/components/ui/primitives";

export const dynamic = "force-dynamic";

export default async function BarbersPage(): Promise<ReactNode> {
  const active = await db
    .select()
    .from(barbers)
    .where(eq(barbers.active, true))
    .orderBy(asc(barbers.displayName));

  return (
    <PageShell
      title="Our barbers"
      subtitle="Pick your barber, browse their work, book your spot"
      maxWidth={880}
    >
      {active.length === 0 ? (
        <EmptyState title="No barbers listed yet" hint="Check back soon." />
      ) : (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))",
            gap: 16,
          }}
        >
          {active.map((b) => (
            <Link
              key={b.id}
              href={`/barbers/${b.id}`}
              style={{
                display: "grid",
                gap: 12,
                background: "var(--panel)",
                border: "1px solid var(--border)",
                borderRadius: 14,
                padding: 18,
                textDecoration: "none",
                color: "var(--text)",
                boxShadow: "var(--shadow)",
              }}
            >
              {b.photoFile ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={`/api/uploads/${b.photoFile}`}
                  alt={b.displayName}
                  style={{
                    width: "100%",
                    aspectRatio: "1",
                    objectFit: "cover",
                    borderRadius: 10,
                    border: "1px solid var(--border)",
                  }}
                />
              ) : (
                <div
                  style={{
                    width: "100%",
                    aspectRatio: "1",
                    borderRadius: 10,
                    border: "1px dashed var(--border)",
                    display: "grid",
                    placeItems: "center",
                    fontSize: 56,
                    fontWeight: 800,
                    color: "var(--muted)",
                    background: "var(--panel-2)",
                  }}
                >
                  {b.displayName.charAt(0)}
                </div>
              )}
              <div style={{ display: "grid", gap: 4 }}>
                <span style={{ fontWeight: 800, fontSize: 17 }}>{b.displayName}</span>
                {b.tagline && (
                  <span style={{ fontSize: 13, color: "var(--muted)" }}>{b.tagline}</span>
                )}
                <span style={{ fontSize: 13, fontWeight: 600, color: "var(--accent)" }}>
                  View profile & book {">"}
                </span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </PageShell>
  );
}
