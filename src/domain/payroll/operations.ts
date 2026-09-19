import { and, desc, eq, gte, inArray, lt, sql as dsql } from "drizzle-orm";
import { db } from "@/db/client";
import { appointments, barbers, payments, payoutPeriods, sales } from "@/db/schema";
import { NotFoundError, ValidationError } from "@/domain/errors";
import { computePayout, type Compensation, type Payout } from "./compute";

/** Builds a barber's pay for a period from real appointment + register money. */

export interface PeriodBounds {
  /** Inclusive, YYYY-MM-DD in shop-local terms. */
  readonly start: string;
  /** Inclusive. */
  readonly end: string;
  readonly startUtc: Date;
  /** Exclusive upper bound. */
  readonly endUtc: Date;
}

export interface BarberPayout {
  readonly barberId: string;
  readonly barberName: string;
  readonly comp: Compensation;
  readonly payout: Payout;
  /** An already-finalized snapshot for this exact period, if one exists. */
  readonly finalized: { id: string; status: "draft" | "paid"; paidAt: Date | null } | null;
}

/**
 * Gross for a barber over a period: completed appointment value plus register
 * sales rung to their chair. Tips are split by how they were tendered, because
 * cash tips are already in the barber's pocket (see computePayout).
 */
export async function loadPayoutsForPeriod(
  bounds: PeriodBounds,
): Promise<BarberPayout[]> {
  const roster = await db
    .select({
      id: barbers.id,
      name: barbers.displayName,
      compType: barbers.compType,
      commissionPct: barbers.commissionPct,
      boothRentCents: barbers.boothRentCents,
      boothRentPeriod: barbers.boothRentPeriod,
      hourlyCents: barbers.hourlyCents,
    })
    .from(barbers)
    .where(eq(barbers.active, true));
  if (roster.length === 0) return [];

  // Completed appointment revenue.
  const apptRows = await db
    .select({
      barberId: appointments.barberId,
      gross: dsql<number>`coalesce(sum(${appointments.depositCents} + ${appointments.remainderCents}), 0)::int`,
    })
    .from(appointments)
    .where(
      and(
        eq(appointments.status, "completed"),
        gte(appointments.startAt, bounds.startUtc),
        lt(appointments.startAt, bounds.endUtc),
      ),
    )
    .groupBy(appointments.barberId);

  // Register sales rung to a chair (net of discount, excluding the tip).
  const saleRows = await db
    .select({
      barberId: sales.barberId,
      gross: dsql<number>`coalesce(sum(${sales.subtotalCents} - ${sales.discountCents}), 0)::int`,
    })
    .from(sales)
    .where(
      and(
        eq(sales.status, "paid"),
        gte(sales.createdAt, bounds.startUtc),
        lt(sales.createdAt, bounds.endUtc),
      ),
    )
    .groupBy(sales.barberId);

  // Tips split by tender. Appointment tips carry no tender (they predate the
  // register), so they are treated as card - the shop collected them.
  const tipRows = await db
    .select({
      barberId: appointments.barberId,
      tender: payments.tender,
      amount: dsql<number>`coalesce(sum(${payments.amountCents}), 0)::int`,
    })
    .from(payments)
    .innerJoin(appointments, eq(payments.appointmentId, appointments.id))
    .where(
      and(
        eq(payments.type, "tip"),
        eq(payments.status, "succeeded"),
        gte(payments.createdAt, bounds.startUtc),
        lt(payments.createdAt, bounds.endUtc),
      ),
    )
    .groupBy(appointments.barberId, payments.tender);

  const saleTipRows = await db
    .select({
      barberId: sales.barberId,
      tender: payments.tender,
      amount: dsql<number>`coalesce(sum(${payments.amountCents}), 0)::int`,
    })
    .from(payments)
    .innerJoin(sales, eq(payments.saleId, sales.id))
    .where(
      and(
        eq(payments.type, "tip"),
        eq(payments.status, "succeeded"),
        gte(payments.createdAt, bounds.startUtc),
        lt(payments.createdAt, bounds.endUtc),
      ),
    )
    .groupBy(sales.barberId, payments.tender);

  const grossBy = new Map<string, number>();
  for (const r of [...apptRows, ...saleRows]) {
    if (!r.barberId) continue;
    grossBy.set(r.barberId, (grossBy.get(r.barberId) ?? 0) + r.gross);
  }
  const cardTipBy = new Map<string, number>();
  const cashTipBy = new Map<string, number>();
  for (const r of [...tipRows, ...saleTipRows]) {
    if (!r.barberId) continue;
    const bucket = r.tender === "cash" ? cashTipBy : cardTipBy;
    bucket.set(r.barberId, (bucket.get(r.barberId) ?? 0) + r.amount);
  }

  const existing = await db
    .select({
      id: payoutPeriods.id,
      barberId: payoutPeriods.barberId,
      status: payoutPeriods.status,
      paidAt: payoutPeriods.paidAt,
    })
    .from(payoutPeriods)
    .where(
      and(
        eq(payoutPeriods.periodStart, bounds.start),
        eq(payoutPeriods.periodEnd, bounds.end),
        inArray(
          payoutPeriods.barberId,
          roster.map((b) => b.id),
        ),
      ),
    );

  const days =
    (new Date(`${bounds.end}T00:00:00Z`).getTime() -
      new Date(`${bounds.start}T00:00:00Z`).getTime()) /
      86_400_000 +
    1;
  const periodWeeks = days / 7;

  return roster.map((b) => {
    const comp: Compensation = {
      type: b.compType,
      commissionPct: b.commissionPct,
      boothRentCents: b.boothRentCents,
      boothRentPeriod: b.boothRentPeriod,
      hourlyCents: b.hourlyCents,
    };
    const snap = existing.find((e) => e.barberId === b.id);
    return {
      barberId: b.id,
      barberName: b.name,
      comp,
      payout: computePayout({
        grossCents: grossBy.get(b.id) ?? 0,
        cardTipsCents: cardTipBy.get(b.id) ?? 0,
        cashTipsCents: cashTipBy.get(b.id) ?? 0,
        comp,
        periodWeeks,
      }),
      finalized: snap ? { id: snap.id, status: snap.status, paidAt: snap.paidAt } : null,
    };
  });
}

/**
 * Freeze what was computed and mark it paid. Snapshotting matters: comp
 * settings change, and last month's payout must not move when they do.
 */
export async function finalizePayoutOp(
  barberId: string,
  bounds: PeriodBounds,
  now = new Date(),
): Promise<void> {
  const all = await loadPayoutsForPeriod(bounds);
  const row = all.find((r) => r.barberId === barberId);
  if (!row) throw new NotFoundError("Barber not found.");
  if (row.finalized?.status === "paid") {
    throw new ValidationError("That period is already marked paid.");
  }

  const p = row.payout;
  await db
    .insert(payoutPeriods)
    .values({
      barberId,
      periodStart: bounds.start,
      periodEnd: bounds.end,
      compType: row.comp.type,
      grossCents: p.grossCents,
      commissionCents: p.commissionCents,
      boothRentCents: p.boothRentCents,
      hourlyCents: p.hourlyCents,
      cardTipsCents: p.cardTipsCents,
      cashTipsCents: p.cashTipsCents,
      adjustmentCents: p.adjustmentCents,
      netCents: p.netCents,
      status: "paid",
      paidAt: now,
    })
    .onConflictDoUpdate({
      target: [payoutPeriods.barberId, payoutPeriods.periodStart, payoutPeriods.periodEnd],
      set: {
        compType: row.comp.type,
        grossCents: p.grossCents,
        commissionCents: p.commissionCents,
        boothRentCents: p.boothRentCents,
        hourlyCents: p.hourlyCents,
        cardTipsCents: p.cardTipsCents,
        cashTipsCents: p.cashTipsCents,
        netCents: p.netCents,
        status: "paid",
        paidAt: now,
      },
    });
}

/** A barber's finalized history, newest first. */
export async function loadPayoutHistory(barberId: string, limit = 12) {
  return db
    .select()
    .from(payoutPeriods)
    .where(eq(payoutPeriods.barberId, barberId))
    .orderBy(desc(payoutPeriods.periodStart))
    .limit(limit);
}
