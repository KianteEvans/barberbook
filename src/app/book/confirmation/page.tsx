import type { ReactNode } from "react";
import { notFound, redirect } from "next/navigation";
import { format } from "date-fns";
import { toZonedTime } from "date-fns-tz";
import { and, eq } from "drizzle-orm";
import { db } from "@/db/client";
import { appointments, barbers, services } from "@/db/schema";
import { tryGetIdentity } from "@/auth/session";
import { PageShell } from "@/components/ui/PageShell";
import { Card, Stat, ButtonLink } from "@/components/ui/primitives";
import { loadSettings } from "@/domain/booking/load";
import { formatMoney } from "@/domain/money";
import { StatusPoller } from "./StatusPoller";

export const dynamic = "force-dynamic";

export default async function ConfirmationPage({
  searchParams,
}: {
  searchParams: Promise<{ appointment?: string }>;
}): Promise<ReactNode> {
  const query = await searchParams;
  if (!query.appointment) notFound();

  const identity = await tryGetIdentity();
  if (!identity) redirect("/login");

  const [appt] = await db
    .select({
      id: appointments.id,
      status: appointments.status,
      startAt: appointments.startAt,
      depositCents: appointments.depositCents,
      remainderCents: appointments.remainderCents,
      serviceName: services.name,
      barberName: barbers.displayName,
    })
    .from(appointments)
    .innerJoin(services, eq(appointments.serviceId, services.id))
    .innerJoin(barbers, eq(appointments.barberId, barbers.id))
    .where(
      identity.role === "admin"
        ? eq(appointments.id, query.appointment)
        : and(
            eq(appointments.id, query.appointment),
            eq(appointments.clientId, identity.userId),
          ),
    );
  if (!appt) notFound();

  const settings = await loadSettings();
  const local = toZonedTime(appt.startAt, settings.timezone);

  return (
    <PageShell title="Your booking" maxWidth={560}>
      <Card>
        <div style={{ display: "grid", gap: 20 }}>
          <StatusPoller appointmentId={appt.id} initialStatus={appt.status} />
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))",
              gap: 16,
              borderTop: "1px solid var(--border)",
              paddingTop: 16,
            }}
          >
            <Stat label="Service" value={appt.serviceName} />
            <Stat label="Barber" value={appt.barberName} />
            <Stat label="When" value={format(local, "EEE, MMM d - h:mm a")} />
            {appt.depositCents > 0 && (
              <Stat label="Deposit" value={formatMoney(appt.depositCents)} />
            )}
            {appt.remainderCents > 0 && (
              <Stat label="Due at the shop" value={formatMoney(appt.remainderCents)} />
            )}
          </div>
          <div style={{ display: "grid", gap: 10, justifyItems: "center" }}>
            <a
              href={`/api/appointments/${appt.id}/calendar`}
              style={{ fontSize: 13, fontWeight: 600, color: "var(--accent)", textDecoration: "none" }}
            >
              + Add to calendar
            </a>
            <div style={{ display: "flex", gap: 10, justifyContent: "center" }}>
              <ButtonLink href="/account" variant="secondary">
                My appointments
              </ButtonLink>
              <ButtonLink href="/book">Book another</ButtonLink>
            </div>
          </div>
        </div>
      </Card>
    </PageShell>
  );
}
