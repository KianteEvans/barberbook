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
import {
  loadActiveBarbers,
  loadSettings,
  loadSlotsForDay,
  todayInShopTz,
} from "@/domain/booking/load";
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
  const barbers = await loadActiveBarbers();
  if (barbers.length === 0) {
    return (
      <PageShell title="Book an appointment" maxWidth={760}>
        <EmptyState title="No barbers available" hint="Check back soon." />
      </PageShell>
    );
  }

  const barberId = query.barber ?? barbers[0]!.id;
  const today = todayInShopTz(settings.timezone);
  const date = query.date ?? today;
  const { depositCents } = computeDeposit(service, settings);

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
      subtitle={`Step 2 of 3 - pick a time - ${service.durationMin} min - ${formatMoney(service.priceCents)}${depositCents > 0 ? ` (${formatMoney(depositCents)} deposit)` : ""}`}
      maxWidth={760}
    >
      {barbers.length > 1 && (
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          {barbers.map((b) => (
            <Link
              key={b.id}
              href={hrefFor(date, b.id)}
              style={{
                padding: "7px 14px",
                borderRadius: 999,
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
          const label = format(new Date(`${d}T12:00:00Z`), "EEE d");
          return (
            <Link
              key={d}
              href={hrefFor(d, barberId)}
              style={{
                padding: "8px 12px",
                borderRadius: 8,
                fontSize: 13,
                fontWeight: 600,
                textDecoration: "none",
                whiteSpace: "nowrap",
                color: d === date ? "var(--accent-ink)" : "var(--text)",
                background: d === date ? "var(--accent)" : "var(--panel)",
                border: "1px solid var(--border)",
              }}
            >
              {label}
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
              gridTemplateColumns: "repeat(auto-fill, minmax(90px, 1fr))",
              gap: 8,
            }}
          >
            {slots.map((s) => {
              const local = toZonedTime(s.startUtc, settings.timezone);
              return (
                <Link
                  key={s.startUtc.toISOString()}
                  href={`/book/${serviceId}/confirm?barber=${barberId}&start=${encodeURIComponent(s.startUtc.toISOString())}`}
                  style={{
                    textAlign: "center",
                    padding: "9px 4px",
                    borderRadius: 8,
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
