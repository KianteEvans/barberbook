import type { ReactNode } from "react";
import { and, eq, gte, lt } from "drizzle-orm";
import { db } from "@/db/client";
import { appointments, services, users, barbers } from "@/db/schema";
import { PageShell } from "@/components/ui/PageShell";
import { Card, Badge, EmptyState, type BadgeTone } from "@/components/ui/primitives";
import { formatMoney } from "@/domain/money";

export const dynamic = "force-dynamic";

const statusTone: Record<string, BadgeTone> = {
  pending_deposit: "warn",
  confirmed: "info",
  completed: "ok",
  canceled: "neutral",
  no_show: "danger",
};

function StatBig({ label, value }: { label: string; value: string }): ReactNode {
  return (
    <div style={{ display: "grid", gap: 2 }}>
      <span
        style={{
          fontSize: 11,
          fontWeight: 600,
          textTransform: "uppercase",
          letterSpacing: "0.05em",
          color: "var(--muted)",
        }}
      >
        {label}
      </span>
      <span className="display" style={{ fontSize: 32, fontWeight: 700, lineHeight: 1.1 }}>
        {value}
      </span>
    </div>
  );
}

export default async function AdminTodayPage(): Promise<ReactNode> {
  const now = new Date();
  const startOfDay = new Date(now);
  startOfDay.setHours(0, 0, 0, 0);
  const endOfDay = new Date(startOfDay);
  endOfDay.setDate(endOfDay.getDate() + 1);

  const todays = await db
    .select({
      id: appointments.id,
      startAt: appointments.startAt,
      status: appointments.status,
      depositCents: appointments.depositCents,
      remainderCents: appointments.remainderCents,
      clientName: users.name,
      serviceName: services.name,
      barberName: barbers.displayName,
    })
    .from(appointments)
    .innerJoin(users, eq(appointments.clientId, users.id))
    .innerJoin(services, eq(appointments.serviceId, services.id))
    .innerJoin(barbers, eq(appointments.barberId, barbers.id))
    .where(and(gte(appointments.startAt, startOfDay), lt(appointments.startAt, endOfDay)))
    .orderBy(appointments.startAt);

  const confirmed = todays.filter((a) => a.status === "confirmed" || a.status === "completed");
  const expectedRevenue = confirmed.reduce(
    (sum, a) => sum + a.depositCents + a.remainderCents,
    0,
  );

  return (
    <PageShell title="Today" subtitle={now.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 12 }}>
        <Card style={{ background: "linear-gradient(color-mix(in srgb, var(--info) 6%, var(--panel)), var(--panel))" }}>
          <StatBig label="Appointments" value={String(todays.length)} />
        </Card>
        <Card style={{ background: "linear-gradient(color-mix(in srgb, var(--ok) 6%, var(--panel)), var(--panel))" }}>
          <StatBig label="Confirmed" value={String(confirmed.length)} />
        </Card>
        <Card style={{ background: "linear-gradient(color-mix(in srgb, var(--accent) 6%, var(--panel)), var(--panel))" }}>
          <StatBig label="Expected revenue" value={formatMoney(expectedRevenue)} />
        </Card>
      </div>

      <Card title="Schedule">
        {todays.length === 0 ? (
          <EmptyState title="No appointments today" hint="Bookings will appear here as clients confirm." />
        ) : (
          <table>
            <thead>
              <tr>
                <th>Time</th>
                <th>Client</th>
                <th>Service</th>
                <th>Barber</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {todays.map((a) => (
                <tr key={a.id}>
                  <td style={{ fontWeight: 600 }}>
                    {a.startAt.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}
                  </td>
                  <td>{a.clientName}</td>
                  <td>{a.serviceName}</td>
                  <td style={{ color: "var(--muted)" }}>{a.barberName}</td>
                  <td>
                    <Badge tone={statusTone[a.status] ?? "neutral"}>{a.status.replace("_", " ")}</Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>
    </PageShell>
  );
}
