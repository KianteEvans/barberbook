import type { ReactNode } from "react";
import { and, eq, gte, lt } from "drizzle-orm";
import { db } from "@/db/client";
import { appointments, services, users, barbers } from "@/db/schema";
import { PageShell } from "@/components/ui/PageShell";
import { Card, Badge, EmptyState, Stat, type BadgeTone } from "@/components/ui/primitives";
import { formatMoney } from "@/domain/money";

export const dynamic = "force-dynamic";

const statusTone: Record<string, BadgeTone> = {
  pending_deposit: "warn",
  confirmed: "info",
  completed: "ok",
  canceled: "neutral",
  no_show: "danger",
};

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
        <Card><Stat label="Appointments" value={todays.length} /></Card>
        <Card><Stat label="Confirmed" value={confirmed.length} /></Card>
        <Card><Stat label="Expected revenue" value={formatMoney(expectedRevenue)} /></Card>
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
