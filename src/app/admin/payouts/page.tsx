import type { ReactNode } from "react";
import Link from "next/link";
import { asc, eq } from "drizzle-orm";
import { addDays, format } from "date-fns";
import { db } from "@/db/client";
import { barbers } from "@/db/schema";
import { PageShell } from "@/components/ui/PageShell";
import { Card, Badge, EmptyState, Stat } from "@/components/ui/primitives";
import { loadSettings, todayInShopTz } from "@/domain/booking/load";
import { loadPayoutsForPeriod, type PeriodBounds } from "@/domain/payroll/operations";
import { formatMoney } from "@/domain/money";
import { CompensationDrawer } from "./CompensationDrawer";
import { FinalizeButton } from "./FinalizeButton";

export const dynamic = "force-dynamic";

const DATE = /^\d{4}-\d{2}-\d{2}$/;

const COMP_LABEL: Record<string, string> = {
  none: "Not set",
  commission: "Commission",
  booth_rent: "Booth rent",
  hourly: "Hourly",
};

export default async function AdminPayoutsPage({
  searchParams,
}: {
  searchParams: Promise<{ start?: string; end?: string }>;
}): Promise<ReactNode> {
  const q = await searchParams;
  const settings = await loadSettings();
  const today = todayInShopTz(settings.timezone);

  // Default to the last two weeks, ending today.
  const end = q.end && DATE.test(q.end) ? q.end : today;
  const start =
    q.start && DATE.test(q.start)
      ? q.start
      : format(addDays(new Date(`${end}T12:00:00Z`), -13), "yyyy-MM-dd");

  const bounds: PeriodBounds = {
    start,
    end,
    startUtc: new Date(`${start}T00:00:00.000Z`),
    endUtc: new Date(new Date(`${end}T00:00:00.000Z`).getTime() + 86_400_000),
  };

  const rows = await loadPayoutsForPeriod(bounds);
  const compRows = await db
    .select({
      id: barbers.id,
      compType: barbers.compType,
      commissionPct: barbers.commissionPct,
      boothRentCents: barbers.boothRentCents,
      boothRentPeriod: barbers.boothRentPeriod,
      hourlyCents: barbers.hourlyCents,
    })
    .from(barbers)
    .where(eq(barbers.active, true))
    .orderBy(asc(barbers.displayName));

  const owed = rows.reduce((s, r) => s + r.payout.netCents, 0);
  const gross = rows.reduce((s, r) => s + r.payout.grossCents, 0);
  const cashTips = rows.reduce((s, r) => s + r.payout.cashTipsCents, 0);
  const unset = rows.filter((r) => r.comp.type === "none").length;

  const shift = (days: number): string => {
    const s = format(addDays(new Date(`${start}T12:00:00Z`), days), "yyyy-MM-dd");
    const e = format(addDays(new Date(`${end}T12:00:00Z`), days), "yyyy-MM-dd");
    return `/admin/payouts?start=${s}&end=${e}`;
  };
  const navStyle = {
    padding: "7px 14px",
    borderRadius: 8,
    fontSize: 13,
    fontWeight: 600,
    textDecoration: "none",
    color: "var(--text)",
    background: "var(--panel)",
    border: "1px solid var(--border)",
  } as const;

  return (
    <PageShell
      title="Payouts"
      subtitle={`${format(new Date(`${start}T12:00:00Z`), "MMM d")} - ${format(
        new Date(`${end}T12:00:00Z`),
        "MMM d, yyyy",
      )}`}
      maxWidth={1100}
      action={
        <div style={{ display: "flex", gap: 8 }}>
          <Link href={shift(-14)} style={navStyle}>{"< Prev"}</Link>
          <Link href="/admin/payouts" style={navStyle}>This period</Link>
          <Link href={shift(14)} style={navStyle}>{"Next >"}</Link>
        </div>
      }
    >
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 12 }}>
        <Card style={{ padding: 16 }}>
          <Stat label="Owed this period" value={formatMoney(owed)} />
        </Card>
        <Card style={{ padding: 16 }}>
          <Stat label="Chairs' gross" value={formatMoney(gross)} />
        </Card>
        <Card style={{ padding: 16 }}>
          <Stat label="Cash tips (not owed)" value={formatMoney(cashTips)} />
        </Card>
        <Card style={{ padding: 16 }}>
          <Stat label="Pay setup missing" value={String(unset)} />
        </Card>
      </div>

      <Card title="This period">
        {rows.length === 0 ? (
          <EmptyState title="No active barbers" />
        ) : (
          <table>
            <thead>
              <tr>
                <th>Barber</th>
                <th>Model</th>
                <th style={{ textAlign: "right" }}>Gross</th>
                <th style={{ textAlign: "right" }}>Earned</th>
                <th style={{ textAlign: "right" }}>Card tips</th>
                <th style={{ textAlign: "right" }}>Cash tips</th>
                <th style={{ textAlign: "right" }}>Net owed</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => {
                const comp = compRows.find((c) => c.id === r.barberId);
                const earned =
                  r.payout.commissionCents +
                  r.payout.hourlyCents -
                  r.payout.boothRentCents;
                return (
                  <tr key={r.barberId}>
                    <td style={{ fontWeight: 600, whiteSpace: "nowrap" }}>{r.barberName}</td>
                    <td>
                      <Badge tone={r.comp.type === "none" ? "warn" : "info"}>
                        {COMP_LABEL[r.comp.type]}
                        {r.comp.type === "commission" && ` ${r.comp.commissionPct ?? 0}%`}
                      </Badge>
                    </td>
                    <td style={{ textAlign: "right" }}>{formatMoney(r.payout.grossCents)}</td>
                    <td style={{ textAlign: "right" }}>{formatMoney(earned)}</td>
                    <td style={{ textAlign: "right" }}>{formatMoney(r.payout.cardTipsCents)}</td>
                    <td style={{ textAlign: "right", color: "var(--muted)" }}>
                      {formatMoney(r.payout.cashTipsCents)}
                    </td>
                    <td style={{ textAlign: "right", fontWeight: 700, whiteSpace: "nowrap" }}>
                      {formatMoney(r.payout.netCents)}
                      {r.payout.balanceCents < 0 && (
                        <div style={{ fontSize: 11, color: "var(--danger)", fontWeight: 500 }}>
                          owes {formatMoney(-r.payout.balanceCents)}
                        </div>
                      )}
                    </td>
                    <td style={{ textAlign: "right" }}>
                      <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", flexWrap: "wrap" }}>
                        {comp && (
                          <CompensationDrawer
                            barberId={r.barberId}
                            barberName={r.barberName}
                            compType={comp.compType}
                            commissionPct={comp.commissionPct}
                            boothRentCents={comp.boothRentCents}
                            boothRentPeriod={comp.boothRentPeriod}
                            hourlyCents={comp.hourlyCents}
                          />
                        )}
                        {r.finalized?.status === "paid" ? (
                          <Badge tone="ok">paid</Badge>
                        ) : (
                          <FinalizeButton barberId={r.barberId} start={start} end={end} />
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
        <p style={{ fontSize: 11, color: "var(--muted)", marginTop: 12 }}>
          Gross is completed appointments plus register sales rung to that chair.
          Cash tips are shown for the record but never paid out again - the barber
          already took them. Booth-rent chairs keep their gross directly, so only
          rent and card tips move the net.
        </p>
      </Card>
    </PageShell>
  );
}
