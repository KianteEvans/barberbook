import type { ReactNode } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { addDays, format } from "date-fns";
import { toZonedTime } from "date-fns-tz";
import { eq } from "drizzle-orm";
import { db } from "@/db/client";
import { services } from "@/db/schema";
import { PageShell } from "@/components/ui/PageShell";
import { Card, EmptyState } from "@/components/ui/primitives";
import { StepIndicator } from "@/components/ui/StepIndicator";
import {
  loadSettings,
  loadSlotsForDay,
  todayInShopTz,
} from "@/domain/booking/load";
import { loadBarbersForService } from "@/domain/barbers/operations";
import { effectivePricing } from "@/domain/barbers/pricing";
import { formatMoney } from "@/domain/money";
import { computeDeposit } from "@/domain/payments/deposit";

export const dynamic = "force-dynamic";

export default async function PickSlotPage({
  params,
  searchParams,
}: {
  params: Promise<{ serviceId: string }>;
  searchParams: Promise<{ date?: string; barber?: string }>;
}): Promise<ReactNode> {
  const { serviceId } = await params;
  const query = await searchParams;

  const [service] = await db.select().from(services).where(eq(services.id, serviceId));
  if (!service || !service.active) notFound();

  const settings = await loadSettings();
  const barbers = await loadBarbersForService(serviceId);
  if (barbers.length === 0) {
    return (
      <PageShell title="Book an appointment" maxWidth={760}>
        <EmptyState
          title="No barbers offer this service right now"
          hint="Try another service or check back soon."
        />
      </PageShell>
    );
  }

  const selected = barbers.find((b) => b.id === query.barber) ?? barbers[0]!;
  const barberId = selected.id;
  const today = todayInShopTz(settings.timezone);
  const date = query.date ?? today;
  const priced = effectivePricing(service, selected.overrideCents);
  const { depositCents } = computeDeposit(priced, settings);

  const slots = await loadSlotsForDay({ barberId, serviceId, date });

  // Next 14 shop-local days for the date strip.
  const days: string[] = [];
  for (let i = 0; i < 14; i++) {
    days.push(format(addDays(new Date(`${today}T12:00:00Z`), i), "yyyy-MM-dd"));
  }

  const hrefFor = (d: string, b: string): string =>
    `/book/${serviceId}?date=${d}&barber=${b}`;

  return (
    <PageShell
      title={service.name}
      subtitle={`${service.durationMin} min - ${formatMoney(priced.priceCents)}${depositCents > 0 ? ` (${formatMoney(depositCents)} deposit)` : ""}`}
      maxWidth={760}
      stripe
    >
      <StepIndicator current={2} />
      {barbers.length > 1 && (
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          {barbers.map((b) => (
            <Link
              key={b.id}
              href={hrefFor(date, b.id)}
              className={b.id === barberId ? undefined : "chip"}
              style={{
                padding: "7px 14px",
                borderRadius: "var(--radius-full)",
                fontSize: 13,
                fontWeight: 600,
                textDecoration: "none",
                color: b.id === barberId ? "var(--accent-ink)" : "var(--text)",
                background: b.id === barberId ? "var(--accent)" : "var(--panel)",
                border: "1px solid var(--border)",
              }}
            >
              {b.displayName}
            </Link>
          ))}
        </div>
      )}

      <div style={{ display: "flex", gap: 8, overflowX: "auto", paddingBottom: 4 }}>
        {days.map((d) => {
          const selected = d === date;
          const dayDate = new Date(`${d}T12:00:00Z`);
          return (
            <Link
              key={d}
              href={hrefFor(d, barberId)}
              className={selected ? undefined : "chip"}
              style={{
                display: "grid",
                justifyItems: "center",
                gap: 2,
                padding: "8px 14px",
                borderRadius: "var(--radius)",
                textDecoration: "none",
                whiteSpace: "nowrap",
                color: selected ? "var(--accent-ink)" : "var(--text)",
                background: selected ? "var(--accent)" : "var(--panel)",
                border: `1px solid ${selected ? "var(--accent)" : "var(--border)"}`,
              }}
            >
              <span
                style={{
                  fontSize: 10,
                  fontWeight: 700,
                  textTransform: "uppercase",
                  letterSpacing: "0.06em",
                  opacity: 0.75,
                }}
              >
                {format(dayDate, "EEE")}
              </span>
              <span className="display" style={{ fontSize: 17, fontWeight: 600, lineHeight: 1 }}>
                {format(dayDate, "d")}
              </span>
            </Link>
          );
        })}
      </div>

      <Card title="Available times">
        {slots.length === 0 ? (
          <EmptyState
            title="No openings this day"
            hint="Try another day or barber."
          />
        ) : (
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(76px, 1fr))",
              gap: 8,
            }}
          >
            {slots.map((s) => {
              const local = toZonedTime(s.startUtc, settings.timezone);
              return (
                <Link
                  key={s.startUtc.toISOString()}
                  href={`/book/${serviceId}/confirm?barber=${barberId}&start=${encodeURIComponent(s.startUtc.toISOString())}`}
                  className="chip"
                  style={{
                    textAlign: "center",
                    padding: "9px 4px",
                    borderRadius: "var(--radius-sm)",
                    border: "1px solid var(--border)",
                    background: "var(--panel-2)",
                    color: "var(--text)",
                    fontSize: 13,
                    fontWeight: 600,
                    textDecoration: "none",
                  }}
                >
                  {format(local, "h:mm a")}
                </Link>
              );
            })}
          </div>
        )}
      </Card>
    </PageShell>
  );
}
