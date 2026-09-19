import type { ReactNode } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { PageShell } from "@/components/ui/PageShell";
import { Card, Badge } from "@/components/ui/primitives";
import { loadTicketByToken } from "@/domain/walkins/operations";
import { loadSettings } from "@/domain/booking/load";
import { AutoRefresh } from "../AutoRefresh";
import { LeaveLineButton } from "./LeaveLineButton";

export const dynamic = "force-dynamic";

/**
 * A client's own spot in the line, reachable only with their unguessable
 * token. No auth: the token IS the credential, so we show only their own
 * details and never the rest of the line.
 */
export default async function QueueTicketPage({
  params,
}: {
  params: Promise<{ token: string }>;
}): Promise<ReactNode> {
  const { token } = await params;
  const ticket = await loadTicketByToken(token);
  if (!ticket) notFound();
  const settings = await loadSettings();

  const headline =
    ticket.status === "serving"
      ? "You're up!"
      : ticket.status === "waiting"
        ? ticket.position === 1
          ? "You're next"
          : `You're #${ticket.position} in line`
        : ticket.status === "booked"
          ? "You've got an appointment"
          : "You're not in the line";

  const sub =
    ticket.status === "serving"
      ? `Head to ${ticket.barberName ?? "the chair"} - they're ready for you.`
      : ticket.status === "waiting"
        ? ticket.estWaitMin === 0
          ? "About to be called - stay close."
          : `Roughly ${ticket.estWaitMin} minutes from now.`
        : ticket.status === "canceled"
          ? "You left the line. You can get back in any time."
          : ticket.status === "booked"
            ? "We moved you onto the calendar - check your appointments."
            : "This spot is closed out.";

  const live = ticket.status === "waiting" || ticket.status === "serving";

  return (
    <PageShell title={headline} subtitle={`${settings.shopName} - ${sub}`} maxWidth={520} stripe>
      {live && <AutoRefresh seconds={20} />}
      <Card>
        <div style={{ display: "grid", gap: 16, justifyItems: "center", padding: "8px 0" }}>
          {ticket.status === "waiting" && (
            <span
              className="display"
              style={{ fontSize: 64, fontWeight: 700, lineHeight: 1, color: "var(--accent)" }}
            >
              {ticket.position}
            </span>
          )}
          <Badge tone={ticket.status === "serving" ? "ok" : live ? "warn" : "neutral"}>
            {ticket.status === "serving"
              ? "in the chair"
              : ticket.status === "waiting"
                ? `~${ticket.estWaitMin} min`
                : ticket.status}
          </Badge>
          <div style={{ display: "grid", gap: 2, textAlign: "center" }}>
            <span style={{ fontWeight: 700 }}>{ticket.name}</span>
            <span style={{ fontSize: 13, color: "var(--muted)" }}>
              {ticket.serviceName ?? "Service TBD"}
              {ticket.barberName ? ` with ${ticket.barberName}` : " - first available"}
            </span>
          </div>
          {ticket.status === "waiting" && <LeaveLineButton token={token} />}
        </div>
      </Card>

      <p style={{ margin: 0, fontSize: 12, color: "var(--muted)", textAlign: "center" }}>
        Keep this page - it updates on its own.{" "}
        <Link href="/queue" style={{ color: "var(--accent)" }}>
          See the whole line
        </Link>
      </p>
    </PageShell>
  );
}
