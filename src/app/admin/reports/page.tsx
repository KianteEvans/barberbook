import type { ReactNode } from "react";
import { PageShell } from "@/components/ui/PageShell";
import { Card, EmptyState } from "@/components/ui/primitives";
import { Sparkline, BarList } from "@/components/ui/Charts";
import { loadShopReport } from "@/domain/reports/operations";
import { formatMoney } from "@/domain/money";

export const dynamic = "force-dynamic";

const pct = (r: number): string => `${Math.round(r * 100)}%`;

function Kpi({ label, value, hint }: { label: string; value: string; hint?: string }): ReactNode {
  return (
    <Card style={{ padding: 16 }}>
      <div style={{ fontSize: 12, color: "var(--muted)", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.04em" }}>
        {label}
      </div>
      <div style={{ fontSize: 26, fontWeight: 800, marginTop: 4 }}>{value}</div>
      {hint && <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 2 }}>{hint}</div>}
    </Card>
  );
}

export default async function AdminReportsPage(): Promise<ReactNode> {
  const r = await loadShopReport(30);

  return (
    <PageShell
      title="Reports"
      subtitle={`Shop performance over the last ${r.windowDays} days`}
    >
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))",
          gap: 12,
        }}
      >
        <Kpi
          label="Revenue"
          value={formatMoney(r.revenueCents)}
          hint={`${r.completedCount} completed visits`}
        />
        <Kpi label="Tips" value={formatMoney(r.tipsCents)} />
        <Kpi label="Collected online" value={formatMoney(r.collectedCents)} />
        <Kpi
          label="No-show rate"
          value={pct(r.noShowRate)}
          hint="of resolved visits"
        />
        <Kpi
          label="Repeat clients"
          value={pct(r.repeatClientRate)}
          hint="2+ completed visits"
        />
      </div>

      <Card title="Daily revenue">
        {r.revenueCents === 0 ? (
          <EmptyState
            title="No revenue yet in this window"
            hint="Completed visits will chart here as they add up."
          />
        ) : (
          <>
            <Sparkline points={r.series.map((p) => p.cents)} />
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                fontSize: 12,
                color: "var(--muted)",
                marginTop: 6,
              }}
            >
              <span>{r.series[0]?.day}</span>
              <span>{r.series[r.series.length - 1]?.day}</span>
            </div>
          </>
        )}
      </Card>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
          gap: 16,
        }}
      >
        <Card title="Top services">
          {r.services.length === 0 ? (
            <EmptyState title="No completed visits yet" />
          ) : (
            <BarList
              items={r.services.map((s) => ({
                label: s.serviceName,
                value: s.count,
                display: `${s.count} · ${formatMoney(s.revenueCents)}`,
              }))}
            />
          )}
        </Card>

        <Card title="Barber utilization">
          {r.utilization.length === 0 ? (
            <EmptyState title="No active barbers" />
          ) : (
            <>
              <BarList
                items={r.utilization.map((u) => ({
                  label: u.barberName,
                  value: u.ratio,
                  display: pct(u.ratio),
                }))}
              />
              <p style={{ fontSize: 11, color: "var(--muted)", marginTop: 10 }}>
                Booked minutes vs. scheduled availability (estimate).
              </p>
            </>
          )}
        </Card>
      </div>
    </PageShell>
  );
}
