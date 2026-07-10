import type { ReactNode } from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { desc, eq } from "drizzle-orm";
import { format } from "date-fns";
import { toZonedTime } from "date-fns-tz";
import { db } from "@/db/client";
import { appointments, barbers, services } from "@/db/schema";
import { tryGetIdentity } from "@/auth/session";
import { PageShell } from "@/components/ui/PageShell";
import { Card, Badge, EmptyState, ButtonLink, type BadgeTone } from "@/components/ui/primitives";
import { loadSettings } from "@/domain/booking/load";
import { formatMoney } from "@/domain/money";
import { loadClientWaitlist } from "@/domain/waitlist/operations";
import { CancelButton } from "./CancelButton";
import { ConfirmAttendanceButton } from "./ConfirmAttendanceButton";
import { LeaveWaitlistButton } from "./LeaveWaitlistButton";

export const dynamic = "force-dynamic";

const statusTone: Record<string, BadgeTone> = {
  pending_deposit: "warn",
  confirmed: "info",
  reserved: "warn",
  completed: "ok",
  canceled: "neutral",
  no_show: "danger",
};

const statusLabel: Record<string, string> = {
  pending_deposit: "awaiting deposit",
  confirmed: "confirmed",
  reserved: "confirm needed",
  completed: "completed",
  canceled: "canceled",
  no_show: "no show",
};

export default async function AccountPage(): Promise<ReactNode> {
  const identity = await tryGetIdentity();
  if (!identity) redirect("/login?next=/account");

  const settings = await loadSettings();
  const mine = await db
    .select({
      id: appointments.id,
      startAt: appointments.startAt,
      status: appointments.status,
      depositCents: appointments.depositCents,
      remainderCents: appointments.remainderCents,
      confirmationDeadline: appointments.confirmationDeadline,
      serviceId: appointments.serviceId,
      barberId: appointments.barberId,
      serviceName: services.name,
      barberName: barbers.displayName,
    })
    .from(appointments)
    .innerJoin(services, eq(appointments.serviceId, services.id))
    .innerJoin(barbers, eq(appointments.barberId, barbers.id))
    .where(eq(appointments.clientId, identity.userId))
    .orderBy(desc(appointments.startAt))
    .limit(50);

  const waitlist = await loadClientWaitlist(identity.userId);
  const now = Date.now();
  const upcoming = mine.filter(
    (a) =>
      a.startAt.getTime() > now &&
      (a.status === "confirmed" ||
        a.status === "pending_deposit" ||
        a.status === "reserved"),
  );
  const past = mine.filter((a) => !upcoming.includes(a));

  return (
    <PageShell
      title="My appointments"
      subtitle={identity.email}
      action={<ButtonLink href="/book">Book an appointment</ButtonLink>}
      maxWidth={760}
    >
      <Card title="Upcoming">
        {upcoming.length === 0 ? (
          <EmptyState
            title="Nothing booked"
            hint="Grab a slot before they fill up."
            action={<ButtonLink href="/book">Book now</ButtonLink>}
          />
        ) : (
          <div style={{ display: "grid", gap: 12 }}>
            {upcoming.map((a) => {
              const local = toZonedTime(a.startAt, settings.timezone);
              return (
                <div
                  key={a.id}
                  style={{
                    display: "flex",
                    flexWrap: "wrap",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: 12,
                    border: "1px solid var(--border)",
                    borderRadius: 10,
                    padding: "12px 16px",
                  }}
                >
                  <div style={{ display: "grid", gap: 2 }}>
                    <span style={{ fontWeight: 700, fontSize: 14 }}>
                      {a.serviceName} with {a.barberName}
                    </span>
                    <span style={{ color: "var(--muted)", fontSize: 13 }}>
                      {format(local, "EEEE, MMM d - h:mm a")}
                      {a.remainderCents > 0 &&
                        ` - ${formatMoney(a.remainderCents)} due at the shop`}
                    </span>
                    {a.status === "reserved" && a.confirmationDeadline && (
                      <span style={{ color: "var(--warn)", fontSize: 12, fontWeight: 600 }}>
                        Confirm by{" "}
                        {format(
                          toZonedTime(a.confirmationDeadline, settings.timezone),
                          "h:mm a",
                        )}{" "}
                        or your slot is released.
                      </span>
                    )}
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <Badge tone={statusTone[a.status] ?? "neutral"}>
                      {statusLabel[a.status] ?? a.status.replace("_", " ")}
                    </Badge>
                    <a
                      href={`/api/appointments/${a.id}/calendar`}
                      style={{ fontSize: 12, fontWeight: 600, color: "var(--accent)", textDecoration: "none" }}
                    >
                      + Calendar
                    </a>
                    <Link
                      href={`/account/reschedule/${a.id}`}
                      style={{ fontSize: 12, fontWeight: 600, color: "var(--text)", textDecoration: "none" }}
                    >
                      Reschedule
                    </Link>
                    {a.status === "reserved" && (
                      <ConfirmAttendanceButton appointmentId={a.id} />
                    )}
                    <CancelButton appointmentId={a.id} />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Card>

      {waitlist.length > 0 && (
        <Card title="In line">
          <div style={{ display: "grid", gap: 12 }}>
            {waitlist.map((w) => (
              <div
                key={w.id}
                style={{
                  display: "flex",
                  flexWrap: "wrap",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: 12,
                  border: "1px solid var(--border)",
                  borderRadius: 10,
                  padding: "12px 16px",
                }}
              >
                <div style={{ display: "grid", gap: 2 }}>
                  <span style={{ fontWeight: 700, fontSize: 14 }}>
                    {w.serviceName} with {w.barberName}
                  </span>
                  <span style={{ color: "var(--muted)", fontSize: 13 }}>
                    {format(toZonedTime(w.desiredStartAt, settings.timezone), "EEEE, MMM d - h:mm a")}
                    {" - we'll book you automatically if it opens"}
                  </span>
                </div>
                <LeaveWaitlistButton entryId={w.id} />
              </div>
            ))}
          </div>
        </Card>
      )}

      {past.length > 0 && (
        <Card title="History">
          <table>
            <thead>
              <tr>
                <th>Date</th>
                <th>Service</th>
                <th>Status</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {past.map((a) => (
                <tr key={a.id}>
                  <td>{format(toZonedTime(a.startAt, settings.timezone), "MMM d, yyyy - h:mm a")}</td>
                  <td>{a.serviceName}</td>
                  <td>
                    <Badge tone={statusTone[a.status] ?? "neutral"}>
                      {a.status.replace("_", " ")}
                    </Badge>
                  </td>
                  <td style={{ textAlign: "right" }}>
                    <div style={{ display: "flex", gap: 12, justifyContent: "flex-end" }}>
                      {a.status === "completed" && (
                        <Link
                          href={`/account/review/${a.id}`}
                          style={{ fontSize: 12, fontWeight: 600, color: "var(--text)", textDecoration: "none" }}
                        >
                          Review
                        </Link>
                      )}
                      <Link
                        href={`/book/${a.serviceId}?barber=${a.barberId}`}
                        style={{ fontSize: 12, fontWeight: 600, color: "var(--accent)", textDecoration: "none" }}
                      >
                        Book again
                      </Link>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}
    </PageShell>
  );
}
