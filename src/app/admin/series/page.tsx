import type { ReactNode } from "react";
import { desc, eq, inArray } from "drizzle-orm";
import { db } from "@/db/client";
import {
  barbers,
  recurringSeries,
  seriesOccurrences,
  services,
  users,
} from "@/db/schema";
import { PageShell } from "@/components/ui/PageShell";
import { Card, Badge, EmptyState, type BadgeTone } from "@/components/ui/primitives";
import { MaterializeNowButton, SeriesStatusButtons } from "./SeriesControls";

export const dynamic = "force-dynamic";

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

const seriesTone: Record<string, BadgeTone> = {
  active: "ok",
  paused: "warn",
  canceled: "neutral",
};

const occurrenceTone: Record<string, BadgeTone> = {
  booked: "ok",
  conflict: "warn",
  charge_failed: "danger",
  skipped: "neutral",
};

function timeLabel(timeMin: number): string {
  const hh = Math.floor(timeMin / 60);
  const mm = String(timeMin % 60).padStart(2, "0");
  const h12 = ((hh + 11) % 12) + 1;
  return `${h12}:${mm} ${hh >= 12 ? "PM" : "AM"}`;
}

export default async function AdminSeriesPage(): Promise<ReactNode> {
  const rows = await db
    .select({
      id: recurringSeries.id,
      cadenceWeeks: recurringSeries.cadenceWeeks,
      weekday: recurringSeries.weekday,
      timeMin: recurringSeries.timeMin,
      status: recurringSeries.status,
      hasCard: recurringSeries.stripePaymentMethodId,
      clientName: users.name,
      serviceName: services.name,
      barberName: barbers.displayName,
    })
    .from(recurringSeries)
    .innerJoin(users, eq(recurringSeries.clientId, users.id))
    .innerJoin(services, eq(recurringSeries.serviceId, services.id))
    .innerJoin(barbers, eq(recurringSeries.barberId, barbers.id))
    .orderBy(desc(recurringSeries.createdAt));

  const needsAttention =
    rows.length > 0
      ? await db
          .select({
            id: seriesOccurrences.id,
            seriesId: seriesOccurrences.seriesId,
            scheduledDate: seriesOccurrences.scheduledDate,
            status: seriesOccurrences.status,
            note: seriesOccurrences.note,
          })
          .from(seriesOccurrences)
          .where(inArray(seriesOccurrences.status, ["conflict", "charge_failed"]))
          .orderBy(desc(seriesOccurrences.scheduledDate))
          .limit(50)
      : [];

  const clientBySeries = new Map(rows.map((r) => [r.id, r.clientName]));

  return (
    <PageShell
      title="Recurring series"
      subtitle="Standing appointments that rebook themselves"
      action={<MaterializeNowButton />}
    >
      {needsAttention.length > 0 && (
        <Card title="Needs attention">
          <table>
            <thead>
              <tr>
                <th>Date</th>
                <th>Client</th>
                <th>Problem</th>
                <th>Detail</th>
              </tr>
            </thead>
            <tbody>
              {needsAttention.map((o) => (
                <tr key={o.id}>
                  <td style={{ fontWeight: 600 }}>{o.scheduledDate}</td>
                  <td>{clientBySeries.get(o.seriesId) ?? "-"}</td>
                  <td>
                    <Badge tone={occurrenceTone[o.status] ?? "neutral"}>
                      {o.status.replace("_", " ")}
                    </Badge>
                  </td>
                  <td style={{ color: "var(--muted)", fontSize: 12 }}>{o.note ?? ""}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}

      <Card title="All series">
        {rows.length === 0 ? (
          <EmptyState
            title="No recurring series yet"
            hint="Clients can choose a repeat cadence when booking."
          />
        ) : (
          <table>
            <thead>
              <tr>
                <th>Client</th>
                <th>Service</th>
                <th>Schedule</th>
                <th>Barber</th>
                <th>Card</th>
                <th>Status</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {rows.map((s) => (
                <tr key={s.id}>
                  <td style={{ fontWeight: 600 }}>{s.clientName}</td>
                  <td>{s.serviceName}</td>
                  <td style={{ color: "var(--muted)" }}>
                    Every {s.cadenceWeeks === 1 ? "week" : `${s.cadenceWeeks} weeks`},{" "}
                    {WEEKDAYS[s.weekday]} {timeLabel(s.timeMin)}
                  </td>
                  <td style={{ color: "var(--muted)" }}>{s.barberName}</td>
                  <td>
                    <Badge tone={s.hasCard ? "ok" : "warn"}>
                      {s.hasCard ? "saved" : "none"}
                    </Badge>
                  </td>
                  <td>
                    <Badge tone={seriesTone[s.status] ?? "neutral"}>{s.status}</Badge>
                  </td>
                  <td>
                    <SeriesStatusButtons seriesId={s.id} status={s.status} />
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
