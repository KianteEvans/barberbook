import type { ReactNode } from "react";
import Link from "next/link";
import { and, asc, gte, lt } from "drizzle-orm";
import { eq } from "drizzle-orm";
import { addDays, format } from "date-fns";
import { toZonedTime } from "date-fns-tz";
import { db } from "@/db/client";
import { appointments, barbers, services, users } from "@/db/schema";
import { PageShell } from "@/components/ui/PageShell";
import { Card, EmptyState } from "@/components/ui/primitives";
import { dayRangeUtc, loadSettings, todayInShopTz } from "@/domain/booking/load";
import { formatMoney } from "@/domain/money";
import { AppointmentCard, type AppointmentCardData } from "./AppointmentCard";

export const dynamic = "force-dynamic";

export default async function AdminCalendarPage({
  searchParams,
}: {
  searchParams: Promise<{ week?: string }>;
}): Promise<ReactNode> {
  const query = await searchParams;
  const settings = await loadSettings();
  const today = todayInShopTz(settings.timezone);
  // Week anchor: the given date (YYYY-MM-DD) or today.
  const anchor = query.week ?? today;

  const days: string[] = [];
  for (let i = 0; i < 7; i++) {
    days.push(format(addDays(new Date(`${anchor}T12:00:00Z`), i), "yyyy-MM-dd"));
  }
  const rangeStart = dayRangeUtc(days[0]!, settings.timezone).start;
  const rangeEnd = dayRangeUtc(days[6]!, settings.timezone).end;

  const rows = await db
    .select({
      id: appointments.id,
      startAt: appointments.startAt,
      status: appointments.status,
      depositCents: appointments.depositCents,
      remainderCents: appointments.remainderCents,
      stripePaymentIntentId: appointments.stripePaymentIntentId,
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

  const byDay = new Map<string, AppointmentCardData[]>();
  for (const day of days) byDay.set(day, []);
  for (const r of rows) {
    const local = toZonedTime(r.startAt, settings.timezone);
    const day = format(local, "yyyy-MM-dd");
    byDay.get(day)?.push({
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
    });
  }

  const prevWeek = format(addDays(new Date(`${anchor}T12:00:00Z`), -7), "yyyy-MM-dd");
  const nextWeek = format(addDays(new Date(`${anchor}T12:00:00Z`), 7), "yyyy-MM-dd");
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
      title="Calendar"
      subtitle={`Week of ${format(new Date(`${days[0]}T12:00:00Z`), "MMM d, yyyy")}`}
      maxWidth={1280}
      action={
        <div style={{ display: "flex", gap: 8 }}>
          <Link href={`/admin/calendar?week=${prevWeek}`} style={navStyle}>
            {"< Prev"}
          </Link>
          <Link href="/admin/calendar" style={navStyle}>
            Today
          </Link>
          <Link href={`/admin/calendar?week=${nextWeek}`} style={navStyle}>
            {"Next >"}
          </Link>
        </div>
      }
    >
      {rows.length === 0 ? (
        <Card>
          <EmptyState title="No appointments this week" hint="Bookings will appear here." />
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
