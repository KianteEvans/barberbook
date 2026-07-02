import type { ReactNode } from "react";
import { desc, eq } from "drizzle-orm";
import { format } from "date-fns";
import { toZonedTime } from "date-fns-tz";
import { db } from "@/db/client";
import { payments, users } from "@/db/schema";
import { PageShell } from "@/components/ui/PageShell";
import { Card, Badge, EmptyState, Stat, type BadgeTone } from "@/components/ui/primitives";
import { loadSettings } from "@/domain/booking/load";
import { formatMoney } from "@/domain/money";

export const dynamic = "force-dynamic";

const statusTone: Record<string, BadgeTone> = {
  succeeded: "ok",
  pending: "warn",
  failed: "danger",
  refunded: "info",
};

export default async function AdminPaymentsPage(): Promise<ReactNode> {
  const settings = await loadSettings();
  const rows = await db
    .select({
      id: payments.id,
      createdAt: payments.createdAt,
      type: payments.type,
      amountCents: payments.amountCents,
      status: payments.status,
      failureMessage: payments.failureMessage,
      clientName: users.name,
    })
    .from(payments)
    .leftJoin(users, eq(payments.clientId, users.id))
    .orderBy(desc(payments.createdAt))
    .limit(200);

  const collected = rows
    .filter((r) => r.status === "succeeded" && r.amountCents > 0)
    .reduce((s, r) => s + r.amountCents, 0);
  const refunded = rows
    .filter((r) => r.type === "refund" && r.status === "succeeded")
    .reduce((s, r) => s + Math.abs(r.amountCents), 0);
  const failed = rows.filter((r) => r.status === "failed").length;

  return (
    <PageShell title="Payments" subtitle="Deposits, remainders, fees, refunds, and subscriptions">
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 12 }}>
        <Card><Stat label="Collected" value={formatMoney(collected)} /></Card>
        <Card><Stat label="Refunded" value={formatMoney(refunded)} /></Card>
        <Card><Stat label="Failed charges" value={failed} /></Card>
      </div>

      <Card title="Ledger">
        {rows.length === 0 ? (
          <EmptyState title="No payments yet" hint="Deposits appear here once clients book." />
        ) : (
          <table>
            <thead>
              <tr>
                <th>When</th>
                <th>Client</th>
                <th>Type</th>
                <th style={{ textAlign: "right" }}>Amount</th>
                <th>Status</th>
                <th>Note</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id}>
                  <td style={{ whiteSpace: "nowrap" }}>
                    {format(toZonedTime(r.createdAt, settings.timezone), "MMM d, h:mm a")}
                  </td>
                  <td>{r.clientName ?? "-"}</td>
                  <td style={{ color: "var(--muted)" }}>{r.type.replace("_", " ")}</td>
                  <td style={{ textAlign: "right", fontWeight: 600 }}>
                    {formatMoney(r.amountCents)}
                  </td>
                  <td>
                    <Badge tone={statusTone[r.status] ?? "neutral"}>{r.status}</Badge>
                  </td>
                  <td style={{ color: "var(--muted)", fontSize: 12, maxWidth: 260 }}>
                    {r.failureMessage ?? ""}
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
