import type { ReactNode } from "react";
import Link from "next/link";
import { PageShell } from "@/components/ui/PageShell";
import { Badge, EmptyState } from "@/components/ui/primitives";
import { StepIndicator } from "@/components/ui/StepIndicator";
import { loadActiveServices } from "@/domain/booking/load";
import { loadBarberProfile, type BarberProfile } from "@/domain/barbers/operations";
import { formatMoney } from "@/domain/money";

export const dynamic = "force-dynamic";

interface PickerService {
  readonly id: string;
  readonly name: string;
  readonly description: string | null;
  readonly durationMin: number;
  readonly priceCents: number;
  readonly isOverride: boolean;
}

export default async function BookServicePage({
  searchParams,
}: {
  searchParams: Promise<{ barber?: string }>;
}): Promise<ReactNode> {
  const query = await searchParams;

  // With ?barber= the picker scopes to that barber's menu at THEIR prices and
  // keeps the barber pinned through the rest of the flow.
  let barber: BarberProfile | null = null;
  if (query.barber) {
    try {
      barber = await loadBarberProfile(query.barber);
    } catch {
      barber = null; // unknown/inactive -> fall back to the shop menu
    }
  }

  const list: PickerService[] = barber
    ? barber.offerings.map((o) => ({
        id: o.id,
        name: o.name,
        description: o.description,
        durationMin: o.durationMin,
        priceCents: o.priceCents,
        isOverride: o.isOverride,
      }))
    : (await loadActiveServices()).map((s) => ({
        id: s.id,
        name: s.name,
        description: s.description,
        durationMin: s.durationMin,
        priceCents: s.priceCents,
        isOverride: false,
      }));

  const hrefFor = (serviceId: string): string =>
    barber ? `/book/${serviceId}?barber=${barber.id}` : `/book/${serviceId}`;

  return (
    <PageShell
      title={barber ? `Book with ${barber.displayName}` : "Book an appointment"}
      subtitle={barber?.tagline ?? undefined}
      maxWidth={760}
      stripe
    >
      <StepIndicator current={1} />
      {list.length === 0 ? (
        <EmptyState
          title={barber ? "This barber's menu is being set up" : "No services available"}
          hint="Check back soon."
        />
      ) : (
        <div style={{ display: "grid", gap: 12 }}>
          {list.map((s) => (
            <Link
              key={s.id}
              href={hrefFor(s.id)}
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
                <span style={{ fontWeight: 700, fontSize: 15 }}>
                  {s.name}
                  {s.isOverride && barber && (
                    <span style={{ marginLeft: 8 }}>
                      <Badge tone="info">{barber.displayName}&apos;s price</Badge>
                    </span>
                  )}
                </span>
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
