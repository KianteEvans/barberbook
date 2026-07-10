import type { ReactNode } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { format } from "date-fns";
import { PageShell } from "@/components/ui/PageShell";
import { Card, Badge, Stat, EmptyState, type BadgeTone } from "@/components/ui/primitives";
import { ClientNotes } from "@/components/ui/ClientNotes";
import { loadClientProfile } from "@/domain/clients/operations";
import { formatMoney } from "@/domain/money";
import { NotFoundError } from "@/domain/errors";

export const dynamic = "force-dynamic";

const statusTone: Record<string, BadgeTone> = {
  pending_deposit: "warn",
  confirmed: "info",
  reserved: "warn",
  completed: "ok",
  canceled: "neutral",
  no_show: "danger",
};

export default async function ClientProfilePage({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<ReactNode> {
  const { id } = await params;
  let profile;
  try {
    profile = await loadClientProfile(id);
  } catch (err) {
    if (err instanceof NotFoundError) notFound();
    throw err;
  }

  return (
    <PageShell
      title={profile.name}
      subtitle={`${profile.email}${profile.phone ? ` - ${profile.phone}` : ""}`}
      action={
        <Link
          href="/admin/clients"
          style={{
            fontSize: 13,
            fontWeight: 600,
            color: "var(--text)",
            textDecoration: "none",
            padding: "7px 14px",
            borderRadius: 8,
            border: "1px solid var(--border)",
            background: "var(--panel)",
          }}
        >
          {"< All clients"}
        </Link>
      }
    >
      <Card>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))",
            gap: 16,
          }}
        >
          <Stat label="Completed" value={String(profile.completedCount)} />
          <Stat
            label="No-shows"
            value={
              profile.noShowCount > 0 ? (
                <Badge tone="danger">{profile.noShowCount}</Badge>
              ) : (
                "0"
              )
            }
          />
          <Stat label="Upcoming" value={String(profile.upcomingCount)} />
          <Stat label="Total spend" value={formatMoney(profile.totalSpendCents)} />
          <Stat label="Preferred barber" value={profile.preferredBarber ?? "-"} />
          <Stat label="Member since" value={format(profile.memberSince, "MMM yyyy")} />
        </div>
      </Card>

      <Card title="Notes">
        <ClientNotes clientId={profile.id} notes={profile.notes} />
      </Card>

      <Card title="Visit history">
        {profile.visits.length === 0 ? (
          <EmptyState title="No visits yet" />
        ) : (
          <table>
            <thead>
              <tr>
                <th>Date</th>
                <th>Service</th>
                <th>Barber</th>
                <th>Status</th>
                <th>Value</th>
              </tr>
            </thead>
            <tbody>
              {profile.visits.map((v) => (
                <tr key={v.id}>
                  <td style={{ whiteSpace: "nowrap" }}>{format(v.startAt, "MMM d, yyyy")}</td>
                  <td style={{ color: "var(--muted)" }}>{v.serviceName}</td>
                  <td style={{ color: "var(--muted)" }}>{v.barberName}</td>
                  <td>
                    <Badge tone={statusTone[v.status] ?? "neutral"}>
                      {v.status.replace("_", " ")}
                    </Badge>
                  </td>
                  <td style={{ whiteSpace: "nowrap" }}>
                    {v.status === "completed" ? formatMoney(v.valueCents) : "-"}
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
