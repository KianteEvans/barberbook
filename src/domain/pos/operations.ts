import { and, desc, eq, gte, sql as dsql } from "drizzle-orm";
import { db } from "@/db/client";
import { barbers, payments, sales, saleItems, users } from "@/db/schema";
import { NotFoundError, ValidationError } from "@/domain/errors";
import { cartTotals, type CartLine } from "./cart";

/** The register: sell a service, a product, or anything else. */

export type Tender = "cash" | "card" | "other";

export interface CreateSaleInput {
  readonly lines: readonly CartLine[];
  readonly tender: Tender;
  readonly discountCents?: number;
  readonly tipCents?: number;
  readonly barberId?: string | null;
  readonly clientId?: string | null;
  readonly appointmentId?: string | null;
  readonly note?: string | null;
}

export interface CreatedSale {
  readonly id: string;
  readonly totalCents: number;
}

/**
 * Write a sale, its lines, and the matching ledger entries in ONE transaction -
 * a register that can half-record a sale is worse than no register.
 *
 * `tender` records how money changed hands at the counter; it does not run a
 * gateway. Card means the shop's own reader. Deliberately NOT wired to
 * `chargeSavedCard`, which writes its own payments row - doing both would
 * double-count the sale in the ledger.
 */
export async function createSaleOp(input: CreateSaleInput): Promise<CreatedSale> {
  if (input.lines.length === 0) {
    throw new ValidationError("Add something to the sale first.");
  }
  const totals = cartTotals(input.lines, {
    discountCents: input.discountCents ?? 0,
    tipCents: input.tipCents ?? 0,
  });
  if (totals.totalCents === 0 && totals.tipCents === 0) {
    throw new ValidationError("That sale comes to nothing - check the prices.");
  }

  const saleId = await db.transaction(async (tx) => {
    const [sale] = await tx
      .insert(sales)
      .values({
        barberId: input.barberId ?? null,
        clientId: input.clientId ?? null,
        appointmentId: input.appointmentId ?? null,
        subtotalCents: totals.subtotalCents,
        discountCents: totals.discountCents,
        tipCents: totals.tipCents,
        totalCents: totals.totalCents,
        tender: input.tender,
        note: input.note ?? null,
      })
      .returning({ id: sales.id });
    if (!sale) throw new Error("sale insert failed");

    await tx.insert(saleItems).values(
      input.lines.map((l) => ({
        saleId: sale.id,
        kind: l.kind,
        serviceId: l.serviceId ?? null,
        productId: l.productId ?? null,
        nameSnapshot: l.name,
        unitPriceCents: l.unitPriceCents,
        qty: l.qty,
        lineTotalCents: Math.max(0, l.unitPriceCents) * Math.max(0, l.qty),
      })),
    );

    // The sale money and the tip are separate ledger lines so tip reporting
    // and payroll can tell them apart.
    if (totals.netSalesCents > 0) {
      await tx.insert(payments).values({
        saleId: sale.id,
        appointmentId: input.appointmentId ?? null,
        clientId: input.clientId ?? null,
        type: "sale",
        amountCents: totals.netSalesCents,
        status: "succeeded",
        tender: input.tender,
      });
    }
    if (totals.tipCents > 0) {
      await tx.insert(payments).values({
        saleId: sale.id,
        appointmentId: input.appointmentId ?? null,
        clientId: input.clientId ?? null,
        type: "tip",
        amountCents: totals.tipCents,
        status: "succeeded",
        tender: input.tender,
      });
    }
    return sale.id;
  });

  return { id: saleId, totalCents: totals.totalCents };
}

/**
 * Void a sale: flip its status and reverse its ledger lines. Kept as a
 * reversal rather than a delete so the day's history stays auditable.
 */
export async function voidSaleOp(saleId: string, now = new Date()): Promise<void> {
  const [sale] = await db.select().from(sales).where(eq(sales.id, saleId));
  if (!sale) throw new NotFoundError("Sale not found.");
  if (sale.status === "voided") throw new ValidationError("That sale is already voided.");

  await db.transaction(async (tx) => {
    await tx
      .update(sales)
      .set({ status: "voided", voidedAt: now })
      .where(eq(sales.id, saleId));
    await tx
      .update(payments)
      .set({ status: "refunded" })
      .where(eq(payments.saleId, saleId));
  });
}

export interface SaleRow {
  readonly id: string;
  readonly createdAt: Date;
  readonly barberName: string | null;
  readonly clientName: string | null;
  readonly totalCents: number;
  readonly tipCents: number;
  readonly tender: Tender;
  readonly status: "paid" | "voided";
  readonly itemSummary: string;
}

/** Recent register activity, newest first. */
export async function loadRecentSales(limit = 50): Promise<SaleRow[]> {
  const rows = await db
    .select({
      id: sales.id,
      createdAt: sales.createdAt,
      barberName: barbers.displayName,
      clientName: users.name,
      totalCents: sales.totalCents,
      tipCents: sales.tipCents,
      tender: sales.tender,
      status: sales.status,
    })
    .from(sales)
    .leftJoin(barbers, eq(sales.barberId, barbers.id))
    .leftJoin(users, eq(sales.clientId, users.id))
    .orderBy(desc(sales.createdAt))
    .limit(limit);
  if (rows.length === 0) return [];

  const items = await db
    .select({
      saleId: saleItems.saleId,
      name: saleItems.nameSnapshot,
      qty: saleItems.qty,
    })
    .from(saleItems);
  const bySale = new Map<string, string[]>();
  for (const it of items) {
    const list = bySale.get(it.saleId) ?? [];
    list.push(it.qty > 1 ? `${it.name} x${it.qty}` : it.name);
    bySale.set(it.saleId, list);
  }

  return rows.map((r) => ({ ...r, itemSummary: (bySale.get(r.id) ?? []).join(", ") }));
}

/** Cash vs card totals for paid sales since a given instant. */
export async function tenderTotals(
  since: Date,
): Promise<{ cashCents: number; cardCents: number; otherCents: number }> {
  const rows = await db
    .select({
      tender: sales.tender,
      total: dsql<number>`coalesce(sum(${sales.totalCents}), 0)::int`,
    })
    .from(sales)
    .where(and(eq(sales.status, "paid"), gte(sales.createdAt, since)))
    .groupBy(sales.tender);
  const get = (t: Tender): number => rows.find((r) => r.tender === t)?.total ?? 0;
  return { cashCents: get("cash"), cardCents: get("card"), otherCents: get("other") };
}
