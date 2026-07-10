import type { ReactNode } from "react";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { addDays, format } from "date-fns";
import { toZonedTime } from "date-fns-tz";
import { and, eq } from "drizzle-orm";
import { db } from "@/db/client";
import { appointments, barbers, services } from "@/db/schema";
import { tryGetIdentity } from "@/auth/session";
import { PageShell } from "@/components/ui/PageShell";
import { Card, EmptyState } from "@/components/ui/primitives";
import {
  loadSettings,
  loadSlotsForDay,
  todayInShopTz,
} from "@/domain/booking/load";
import { RescheduleSlots, type SlotOption } from "./RescheduleSlots";

export const dynamic = "force-dynamic";

export default async function ReschedulePage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ date?: string }>;
}): Promise<ReactNode> {
  const { id } = await params;
  const query = await searchParams;

  const identity = await tryGetIdentity();
  if (!identity) redirect(`/login?next=/account/reschedule/${id}`);

  const [appt] = await db
    .select({
      id: appointments.id,
      status: appointments.status,
      startAt: appointments.startAt,
      barberId: appointments.barberId,
      serviceId: appointments.serviceId,
      serviceName: services.name,
      barberName: barbers.displayName,
    })
    .from(appointments)
    .innerJoin(services, eq(appointments.serviceId, services.id))
    .innerJoin(barbers, eq(appointments.barberId, barbers.id))
    .where(
      identity.role === "admin"
        ? eq(appointments.id, id)
        : and(eq(appointments.id, id), eq(appointments.clientId, identity.userId)),
    );
  if (!appt) notFound();

  const live =
    appt.status === "confirmed" ||
    appt.status === "pending_deposit" ||
    appt.status === "reserved";
  if (!live) {
    return (
      <PageShell title="Reschedule" maxWidth={640}>
        <EmptyState
          title="This appointment can't be rescheduled"
          hint="It is already completed or canceled."
        />
      </PageShell>
    );
  }

  const settings = await loadSettings();
  const today = todayInShopTz(settings.timezone);
  const date = query.date ?? today;
  const slots = await loadSlotsForDay({
    barberId: appt.barberId,
    serviceId: appt.serviceId,
    date,
  });
  const slotOptions: SlotOption[] = slots.map((s) => ({
    startIso: s.startUtc.toISOString(),
    label: format(toZonedTime(s.startUtc, settings.timezone), "h:mm a"),
  }));

  const days: string[] = [];
  for (let i = 0; i < 14; i++) {
    days.push(format(addDays(new Date(`${today}T12:00:00Z`), i), "yyyy-MM-dd"));
  }

  return (
    <PageShell
      title="Reschedule"
      subtitle={`${appt.serviceName} with ${appt.barberName} - currently ${format(toZonedTime(appt.startAt, settings.timezone), "EEE, MMM d - h:mm a")}`}
      maxWidth={640}
    >
      <div style={{ display: "flex", gap: 8, overflowX: "auto", paddingBottom: 4 }}>
        {days.map((d) => {
          const selected = d === date;
          const dayDate = new Date(`${d}T12:00:00Z`);
          return (
            <Link
              key={d}
              href={`/account/reschedule/${id}?date=${d}`}
              className={selected ? undefined : "chip"}
              style={{
                display: "grid",
                justifyItems: "center",
                gap: 2,
                padding: "8px 14px",
                borderRadius: "var(--radius)",
                textDecoration: "none",
                whiteSpace: "nowrap",
                color: selected ? "var(--accent-ink)" : "var(--text)",
                background: selected ? "var(--accent)" : "var(--panel)",
                border: `1px solid ${selected ? "var(--accent)" : "var(--border)"}`,
              }}
            >
              <span style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", opacity: 0.75 }}>
                {format(dayDate, "EEE")}
              </span>
              <span className="display" style={{ fontSize: 17, fontWeight: 600, lineHeight: 1 }}>
                {format(dayDate, "d")}
              </span>
            </Link>
          );
        })}
      </div>

      <Card title="Pick a new time">
        <RescheduleSlots appointmentId={appt.id} slots={slotOptions} />
      </Card>
    </PageShell>
  );
}
