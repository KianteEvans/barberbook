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

        <Card title="Client retention">
          {r.rebook.every((b) => b.eligible === 0) ? (
            <EmptyState
              title="Not enough history yet"
              hint={`A visit only counts once it has had ${r.rebookWindowDays} days to turn into a return.`}
            />
          ) : (
            <>
              <BarList
                items={r.rebook.map((b) => ({
                  label: b.barberName,
                  value: b.rate,
                  display: `${pct(b.rate)} of ${b.eligible}`,
                }))}
              />
              <p style={{ fontSize: 11, color: "var(--muted)", marginTop: 10 }}>
                Share of each barber&apos;s clients who came back to them within{" "}
                {r.rebookWindowDays} days. Visits too recent to judge are left out.
              </p>
            </>
          )}
        </Card>

        <Card title="No-shows by barber">
          {r.noShowByBarber.every((b) => b.resolved === 0) ? (
            <EmptyState title="No resolved visits yet" />
          ) : (
            <>
              <BarList
                items={r.noShowByBarber.map((b) => ({
                  label: b.barberName,
                  value: b.rate,
                  display: `${pct(b.rate)} (${b.deltaVsShop >= 0 ? "+" : ""}${pct(
                    b.deltaVsShop,
                  )} vs shop)`,
                }))}
              />
              <p style={{ fontSize: 11, color: "var(--muted)", marginTop: 10 }}>
                Of visits that resolved either way. Positive is worse than the shop average.
              </p>
            </>
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

      <Card title="New-client retention by cohort">
        {r.cohorts.length === 0 ? (
          <EmptyState
            title="No mature cohorts yet"
            hint="A month appears here once its clients have had 90 days to come back."
          />
        ) : (
          <>
            <table>
              <thead>
                <tr>
                  <th>First visit</th>
                  <th>New clients</th>
                  <th>Back in 30d</th>
                  <th>60d</th>
                  <th>90d</th>
                </tr>
              </thead>
              <tbody>
                {r.cohorts.map((c) => (
                  <tr key={c.month}>
                    <td style={{ fontWeight: 600, whiteSpace: "nowrap" }}>{c.month}</td>
                    <td>{c.clients}</td>
                    <td>{pct(c.at30)}</td>
                    <td>{pct(c.at60)}</td>
                    <td style={{ fontWeight: 600 }}>{pct(c.at90)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <p style={{ fontSize: 11, color: "var(--muted)", marginTop: 10 }}>
              Looking back {r.retentionLookbackDays} days. Months whose 90-day window
              is still open are hidden.
            </p>
          </>
        )}
      </Card>
    </PageShell>
  );
}
