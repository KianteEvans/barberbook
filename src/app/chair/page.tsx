import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import { addDays, format } from "date-fns";
import { toZonedTime } from "date-fns-tz";
import { asc, eq, gte } from "drizzle-orm";
import { db } from "@/db/client";
import { availabilityExceptions, availabilityRules } from "@/db/schema";
import { tryGetIdentity } from "@/auth/session";
import { PageShell } from "@/components/ui/PageShell";
import { Card, Badge, EmptyState, Stat, type BadgeTone } from "@/components/ui/primitives";
import { Field, TextInput } from "@/components/ui/fields";
import { MutationForm } from "@/components/ui/MutationForm";
import { HoursEditor } from "@/app/admin/hours/HoursEditor";
import { dayRangeUtc, loadSettings, todayInShopTz } from "@/domain/booking/load";
import {
  loadChairAppointments,
  loadChairEarnings,
  resolveBarberForUser,
} from "@/domain/chair/operations";
import {
  saveMyHoursAction,
  addMyTimeOffAction,
  removeMyTimeOffAction,
} from "@/domain/chair/actions";
import { formatMoney } from "@/domain/money";
import { ChairActions } from "./ChairActions";

const WEEKDAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const fmtMin = (min: number): string =>
  `${Math.floor(min / 60)}:${String(min % 60).padStart(2, "0")}`;

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
  const earnings = await loadChairEarnings(barber.id, 30);

  const rules = await db
    .select()
    .from(availabilityRules)
    .where(eq(availabilityRules.barberId, barber.id));
  const weekly: string[] = WEEKDAYS.map((_, weekday) => {
    const rule = rules.find((r) => r.weekday === weekday);
    return rule ? `${fmtMin(rule.startMin)}-${fmtMin(rule.endMin)}` : "";
  });
  const timeOff = await db
    .select()
    .from(availabilityExceptions)
    .where(
      eq(availabilityExceptions.barberId, barber.id),
    )
    .orderBy(asc(availabilityExceptions.date));
  const upcomingTimeOff = timeOff.filter((t) => t.date >= today);

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
      <Card title="Your last 30 days">
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))",
            gap: 16,
          }}
        >
          <Stat label="Service revenue" value={formatMoney(earnings.revenueCents)} />
          <Stat label="Tips" value={formatMoney(earnings.tipsCents)} />
          <Stat label="Completed cuts" value={String(earnings.completedCount)} />
          <Stat label="Upcoming booked" value={String(earnings.upcomingCount)} />
        </div>
      </Card>

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

      <Card title="My weekly hours">
        <p style={{ margin: "0 0 12px", fontSize: 13, color: "var(--muted)" }}>
          Set when you take bookings. Blank = closed that day. Clients only see
          open times inside these hours.
        </p>
        <HoursEditor
          barberId={barber.id}
          weekdays={WEEKDAYS}
          initial={weekly}
          action={saveMyHoursAction}
        />
      </Card>

      <Card title="Time off">
        <div style={{ display: "grid", gap: 16 }}>
          <MutationForm action={addMyTimeOffAction} submitLabel="Add day off">
            <Field label="Date">
              <TextInput name="date" type="date" required />
            </Field>
          </MutationForm>

          {upcomingTimeOff.length > 0 ? (
            <table>
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Kind</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {upcomingTimeOff.map((t) => (
                  <tr key={t.id}>
                    <td style={{ fontWeight: 600 }}>{t.date}</td>
                    <td style={{ color: "var(--muted)" }}>
                      {t.kind === "off" ? "day off" : "custom hours"}
                    </td>
                    <td style={{ textAlign: "right" }}>
                      <MutationForm
                        action={removeMyTimeOffAction}
                        submitLabel="Remove"
                        variant="danger"
                        hidden={{ id: t.id }}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <p style={{ margin: 0, fontSize: 13, color: "var(--muted)" }}>
              No upcoming days off.
            </p>
          )}
        </div>
      </Card>
    </PageShell>
  );
}
