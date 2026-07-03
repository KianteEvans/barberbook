import type { ReactNode } from "react";
import Link from "next/link";
import { PageShell } from "@/components/ui/PageShell";
import { EmptyState } from "@/components/ui/primitives";
import { StepIndicator } from "@/components/ui/StepIndicator";
import { loadActiveServices } from "@/domain/booking/load";
import { formatMoney } from "@/domain/money";

export const dynamic = "force-dynamic";

export default async function BookServicePage(): Promise<ReactNode> {
  const services = await loadActiveServices();

  return (
    <PageShell title="Book an appointment" maxWidth={760} stripe>
      <StepIndicator current={1} />
      {services.length === 0 ? (
        <EmptyState title="No services available" hint="Check back soon." />
      ) : (
        <div style={{ display: "grid", gap: 12 }}>
          {services.map((s) => (
            <Link
              key={s.id}
              href={`/book/${s.id}`}
              className="card-hover"
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: 16,
                background: "var(--panel)",
                border: "1px solid var(--border)",
                borderRadius: "var(--radius-lg)",
                padding: "16px 20px",
                textDecoration: "none",
                color: "var(--text)",
                boxShadow: "var(--shadow-sm)",
              }}
            >
              <div style={{ display: "grid", gap: 4 }}>
                <span style={{ fontWeight: 700, fontSize: 15 }}>{s.name}</span>
                {s.description && (
                  <span style={{ color: "var(--muted)", fontSize: 13 }}>{s.description}</span>
                )}
                <span style={{ color: "var(--muted)", fontSize: 12 }}>{s.durationMin} minutes</span>
              </div>
              <span className="display" style={{ fontWeight: 600, fontSize: 19, whiteSpace: "nowrap" }}>
                {formatMoney(s.priceCents)}
              </span>
            </Link>
          ))}
        </div>
      )}
    </PageShell>
  );
}
