import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import { addDays, format } from "date-fns";
import { toZonedTime } from "date-fns-tz";
import { tryGetIdentity } from "@/auth/session";
import { PageShell } from "@/components/ui/PageShell";
import { Card, Badge, EmptyState, type BadgeTone } from "@/components/ui/primitives";
import { dayRangeUtc, loadSettings, todayInShopTz } from "@/domain/booking/load";
import {
  loadChairAppointments,
  resolveBarberForUser,
} from "@/domain/chair/operations";
import { ChairActions } from "./ChairActions";

export const dynamic = "force-dynamic";

const statusTone: Record<string, BadgeTone> = {
  pending_deposit: "warn",
  confirmed: "info",
  reserved: "warn",
  completed: "ok",
  canceled: "neutral",
  no_show: "danger",
};

export default async function ChairPage(): Promise<ReactNode> {
  const identity = await tryGetIdentity();
  if (!identity) redirect("/login?next=/chair");
  if (identity.role !== "barber") redirect("/");

  const barber = await resolveBarberForUser(identity.userId);
  if (!barber) {
    return (
      <PageShell title="My chair">
        <EmptyState
          title="No chair linked to your account"
          hint="Ask the shop owner to link your barber profile."
        />
      </PageShell>
    );
  }

  const settings = await loadSettings();
  const today = todayInShopTz(settings.timezone);
  const rangeStart = dayRangeUtc(today, settings.timezone).start;
  const rangeEnd = dayRangeUtc(
    format(addDays(new Date(`${today}T12:00:00Z`), 6), "yyyy-MM-dd"),
    settings.timezone,
  ).end;

  const appts = await loadChairAppointments(barber.id, rangeStart, rangeEnd);

  // Group by shop-local day.
  const byDay = new Map<string, typeof appts>();
  for (const a of appts) {
    const key = format(toZonedTime(a.startAt, settings.timezone), "EEEE, MMM d");
    const list = byDay.get(key) ?? [];
    list.push(a);
    byDay.set(key, list);
  }

  return (
    <PageShell
      title="My chair"
      subtitle={`${barber.displayName} - next 7 days`}
      maxWidth={820}
    >
      {appts.length === 0 ? (
        <Card>
          <EmptyState title="No appointments this week" hint="New bookings will appear here." />
        </Card>
      ) : (
        [...byDay.entries()].map(([day, list]) => (
          <Card key={day} title={day}>
            <table>
              <thead>
                <tr>
                  <th>Time</th>
                  <th>Client</th>
                  <th>Service</th>
                  <th>Status</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {list.map((a) => (
                  <tr key={a.id}>
                    <td style={{ fontWeight: 600, whiteSpace: "nowrap" }}>
                      {format(toZonedTime(a.startAt, settings.timezone), "h:mm a")}
                    </td>
                    <td>
                      {a.clientName}
                      {a.clientPhone && (
                        <span style={{ color: "var(--muted)" }}> - {a.clientPhone}</span>
                      )}
                    </td>
                    <td style={{ color: "var(--muted)" }}>{a.serviceName}</td>
                    <td>
                      <Badge tone={statusTone[a.status] ?? "neutral"}>
                        {a.status.replace("_", " ")}
                      </Badge>
                    </td>
                    <td style={{ textAlign: "right" }}>
                      <ChairActions appointmentId={a.id} status={a.status} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>
        ))
      )}
    </PageShell>
  );
}
