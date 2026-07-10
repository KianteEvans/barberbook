import type { ReactNode } from "react";
import Link from "next/link";
import { and, asc, gte, lt } from "drizzle-orm";
import { eq } from "drizzle-orm";
import { addDays, format } from "date-fns";
import { toZonedTime } from "date-fns-tz";
import { count } from "drizzle-orm";
import { db } from "@/db/client";
import { appointments, barbers, services, users, waitlistEntries } from "@/db/schema";
import { PageShell } from "@/components/ui/PageShell";
import { Card, EmptyState } from "@/components/ui/primitives";
import { dayRangeUtc, loadSettings, todayInShopTz } from "@/domain/booking/load";
import { formatMoney } from "@/domain/money";
import { AppointmentCard, type AppointmentCardData } from "./AppointmentCard";

export const dynamic = "force-dynamic";

export default async function AdminCalendarPage({
  searchParams,
}: {
  searchParams: Promise<{ week?: string; view?: string }>;
}): Promise<ReactNode> {
  const query = await searchParams;
  const settings = await loadSettings();
  const today = todayInShopTz(settings.timezone);
  const isDay = query.view === "day";
  // Anchor: the given date (YYYY-MM-DD) or today.
  const anchor = query.week ?? today;

  const span = isDay ? 1 : 7;
  const days: string[] = [];
  for (let i = 0; i < span; i++) {
    days.push(format(addDays(new Date(`${anchor}T12:00:00Z`), i), "yyyy-MM-dd"));
  }
  const rangeStart = dayRangeUtc(days[0]!, settings.timezone).start;
  const rangeEnd = dayRangeUtc(days[days.length - 1]!, settings.timezone).end;

  const rows = await db
    .select({
      id: appointments.id,
      barberId: appointments.barberId,
      startAt: appointments.startAt,
      status: appointments.status,
      depositCents: appointments.depositCents,
      remainderCents: appointments.remainderCents,
      stripePaymentIntentId: appointments.stripePaymentIntentId,
      holdTier: appointments.holdTier,
      graceMinutes: appointments.graceMinutes,
      confirmationDeadline: appointments.confirmationDeadline,
      attendanceConfirmedAt: appointments.attendanceConfirmedAt,
      clientName: users.name,
      clientPhone: users.phone,
      serviceName: services.name,
      barberName: barbers.displayName,
    })
    .from(appointments)
    .innerJoin(users, eq(appointments.clientId, users.id))
    .innerJoin(services, eq(appointments.serviceId, services.id))
    .innerJoin(barbers, eq(appointments.barberId, barbers.id))
    .where(and(gte(appointments.startAt, rangeStart), lt(appointments.startAt, rangeEnd)))
    .orderBy(asc(appointments.startAt));

  // Waiting counts per (barber, slot), one grouped query -> lookup map.
  const waitRows = await db
    .select({
      barberId: waitlistEntries.barberId,
      desiredStartAt: waitlistEntries.desiredStartAt,
      n: count(),
    })
    .from(waitlistEntries)
    .where(eq(waitlistEntries.status, "waiting"))
    .groupBy(waitlistEntries.barberId, waitlistEntries.desiredStartAt);
  const waitBySlot = new Map<string, number>();
  for (const w of waitRows) {
    waitBySlot.set(`${w.barberId}|${w.desiredStartAt.toISOString()}`, w.n);
  }

  const byDay = new Map<string, AppointmentCardData[]>();
  for (const day of days) byDay.set(day, []);
  // Day view groups the single day's cards by shop-local start hour.
  const byHour = new Map<number, AppointmentCardData[]>();
  for (const r of rows) {
    const local = toZonedTime(r.startAt, settings.timezone);
    const day = format(local, "yyyy-MM-dd");
    const grace = r.graceMinutes ?? 0;
    const isLive = r.status === "confirmed" || r.status === "reserved";
    const card: AppointmentCardData = {
      id: r.id,
      timeLabel: format(local, "h:mm a"),
      clientName: r.clientName,
      clientPhone: r.clientPhone,
      serviceName: r.serviceName,
      barberName: r.barberName,
      status: r.status,
      depositLabel: formatMoney(r.depositCents),
      remainderLabel: formatMoney(r.remainderCents),
      remainderCents: r.remainderCents,
      hasPaymentIntent: r.stripePaymentIntentId !== null,
      tier: r.holdTier,
      graceUntilLabel:
        isLive && r.graceMinutes !== null
          ? format(
              toZonedTime(
                new Date(r.startAt.getTime() + grace * 60_000),
                settings.timezone,
              ),
              "h:mm a",
            )
          : null,
      confirmState:
        r.status === "reserved"
          ? r.attendanceConfirmedAt
            ? "confirmed"
            : r.confirmationDeadline
              ? `confirm by ${format(toZonedTime(r.confirmationDeadline, settings.timezone), "h:mm a")}`
              : "unconfirmed"
          : r.attendanceConfirmedAt
            ? "confirmed"
            : null,
      waitCount: waitBySlot.get(`${r.barberId}|${r.startAt.toISOString()}`) ?? 0,
    };
    byDay.get(day)?.push(card);
    const hour = Number(format(local, "H"));
    (byHour.get(hour) ?? byHour.set(hour, []).get(hour)!).push(card);
  }

  const step = isDay ? 1 : 7;
  const prevAnchor = format(addDays(new Date(`${anchor}T12:00:00Z`), -step), "yyyy-MM-dd");
  const nextAnchor = format(addDays(new Date(`${anchor}T12:00:00Z`), step), "yyyy-MM-dd");
  const viewQs = isDay ? "&view=day" : "";
  const hours = [...byHour.keys()].sort((a, b) => a - b);
  const hourLabel = (h: number): string =>
    format(new Date(`2026-01-01T${String(h).padStart(2, "0")}:00:00`), "h a");
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

  const activeTab = { ...navStyle, color: "var(--accent-ink)", background: "var(--accent)", border: "1px solid var(--accent)" } as const;

  return (
    <PageShell
      title="Calendar"
      subtitle={
        isDay
          ? format(new Date(`${days[0]}T12:00:00Z`), "EEEE, MMM d, yyyy")
          : `Week of ${format(new Date(`${days[0]}T12:00:00Z`), "MMM d, yyyy")}`
      }
      maxWidth={1280}
      action={
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <div style={{ display: "flex", gap: 4, marginRight: 4 }}>
            <Link href={`/admin/calendar?week=${anchor}`} style={isDay ? navStyle : activeTab}>
              Week
            </Link>
            <Link href={`/admin/calendar?week=${anchor}&view=day`} style={isDay ? activeTab : navStyle}>
              Day
            </Link>
          </div>
          <Link href={`/admin/calendar?week=${prevAnchor}${viewQs}`} style={navStyle}>
            {"< Prev"}
          </Link>
          <Link href={`/admin/calendar${isDay ? "?view=day" : ""}`} style={navStyle}>
            Today
          </Link>
          <Link href={`/admin/calendar?week=${nextAnchor}${viewQs}`} style={navStyle}>
            {"Next >"}
          </Link>
        </div>
      }
    >
      {rows.length === 0 ? (
        <Card>
          <EmptyState
            title={isDay ? "No appointments this day" : "No appointments this week"}
            hint="Bookings will appear here."
          />
        </Card>
      ) : isDay ? (
        <Card>
          <div style={{ display: "grid", gap: 4 }}>
            {hours.map((h) => (
              <div
                key={h}
                style={{
                  display: "grid",
                  gridTemplateColumns: "56px 1fr",
                  gap: 12,
                  alignItems: "start",
                  padding: "8px 0",
                  borderTop: "1px solid var(--border)",
                }}
              >
                <span
                  className="display"
                  style={{
                    fontSize: 13,
                    fontWeight: 600,
                    color: "var(--muted)",
                    textTransform: "uppercase",
                    paddingTop: 4,
                  }}
                >
                  {hourLabel(h)}
                </span>
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))",
                    gap: 8,
                  }}
                >
                  {(byHour.get(h) ?? []).map((a) => (
                    <AppointmentCard key={a.id} appt={a} />
                  ))}
                </div>
              </div>
            ))}
          </div>
        </Card>
      ) : (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(7, minmax(140px, 1fr))",
            gap: 8,
            overflowX: "auto",
          }}
        >
          {days.map((day) => {
            const list = byDay.get(day) ?? [];
            const isToday = day === today;
            return (
              <div
                key={day}
                style={{
                  display: "grid",
                  alignContent: "start",
                  gap: 8,
                  background: isToday
                    ? "color-mix(in srgb, var(--accent) 4%, var(--panel))"
                    : "var(--panel)",
                  border: `1px solid ${isToday ? "var(--accent)" : "var(--border)"}`,
                  borderRadius: "var(--radius)",
                  padding: 10,
                  minHeight: 160,
                }}
              >
                <span
                  className="display"
                  style={{
                    fontSize: 13,
                    fontWeight: 600,
                    textTransform: "uppercase",
                    letterSpacing: "0.05em",
                    color: isToday ? "var(--accent)" : "var(--muted)",
                  }}
                >
                  {format(new Date(`${day}T12:00:00Z`), "EEE d")}
                </span>
                {list.map((a) => (
                  <AppointmentCard key={a.id} appt={a} />
                ))}
              </div>
            );
          })}
        </div>
      )}
    </PageShell>
  );
}
