import type { ReactNode } from "react";
import { asc, eq } from "drizzle-orm";
import { format } from "date-fns";
import { toZonedTime } from "date-fns-tz";
import { db } from "@/db/client";
import { barbers, services, users } from "@/db/schema";
import { PageShell } from "@/components/ui/PageShell";
import { Card, Badge, EmptyState, Stat } from "@/components/ui/primitives";
import { loadSettings, todayInShopTz, dayRangeUtc } from "@/domain/booking/load";
import { loadRecentSales, tenderTotals } from "@/domain/pos/operations";
import { formatMoney } from "@/domain/money";
import { Register } from "./Register";
import { VoidSaleButton } from "./VoidSaleButton";

export const dynamic = "force-dynamic";

export default async function AdminPosPage(): Promise<ReactNode> {
  const settings = await loadSettings();
  const dayStart = dayRangeUtc(todayInShopTz(settings.timezone), settings.timezone).start;

  const [serviceRows, barberRows, clientRows, recent, tender] = await Promise.all([
    db
      .select({ id: services.id, name: services.name, priceCents: services.priceCents })
      .from(services)
      .where(eq(services.active, true))
      .orderBy(asc(services.name)),
    db
      .select({ id: barbers.id, name: barbers.displayName })
      .from(barbers)
      .where(eq(barbers.active, true))
      .orderBy(asc(barbers.displayName)),
    db
      .select({ id: users.id, name: users.name })
      .from(users)
      .where(eq(users.role, "client"))
      .orderBy(asc(users.name))
      .limit(200),
    loadRecentSales(40),
    tenderTotals(dayStart),
  ]);

  const takenToday = tender.cashCents + tender.cardCents + tender.otherCents;

  return (
    <PageShell title="Register" subtitle="Ring up a cut, a product, or anything else">
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 12 }}>
        <Card style={{ padding: 16 }}>
          <Stat label="Taken today" value={formatMoney(takenToday)} />
        </Card>
        <Card style={{ padding: 16 }}>
          <Stat label="Cash" value={formatMoney(tender.cashCents)} />
        </Card>
        <Card style={{ padding: 16 }}>
          <Stat label="Card" value={formatMoney(tender.cardCents)} />
        </Card>
        <Card style={{ padding: 16 }}>
          <Stat label="Other" value={formatMoney(tender.otherCents)} />
        </Card>
      </div>

      <Register services={serviceRows} barbers={barberRows} clients={clientRows} />

      <Card title="Recent sales">
        {recent.length === 0 ? (
          <EmptyState title="No sales yet" hint="Ring one up above and it lands here." />
        ) : (
          <table>
            <thead>
              <tr>
                <th>When</th>
                <th>Items</th>
                <th>Chair</th>
                <th>Client</th>
                <th>Tender</th>
                <th style={{ textAlign: "right" }}>Total</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {recent.map((s) => (
                <tr key={s.id} style={{ opacity: s.status === "voided" ? 0.5 : 1 }}>
                  <td style={{ whiteSpace: "nowrap" }}>
                    {format(toZonedTime(s.createdAt, settings.timezone), "MMM d, h:mm a")}
                  </td>
                  <td style={{ color: "var(--muted)", maxWidth: 240 }}>{s.itemSummary}</td>
                  <td style={{ color: "var(--muted)" }}>{s.barberName ?? "-"}</td>
                  <td style={{ color: "var(--muted)" }}>{s.clientName ?? "Walk-up"}</td>
                  <td>
                    <Badge tone={s.tender === "cash" ? "ok" : "info"}>{s.tender}</Badge>
                  </td>
                  <td style={{ textAlign: "right", fontWeight: 600, whiteSpace: "nowrap" }}>
                    {formatMoney(s.totalCents)}
                    {s.tipCents > 0 && (
                      <span style={{ color: "var(--muted)", fontWeight: 400, fontSize: 12 }}>
                        {" "}
                        (+{formatMoney(s.tipCents)} tip)
                      </span>
                    )}
                  </td>
                  <td style={{ textAlign: "right" }}>
                    {s.status === "voided" ? (
                      <Badge tone="neutral">voided</Badge>
                    ) : (
                      <VoidSaleButton saleId={s.id} />
                    )}
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
