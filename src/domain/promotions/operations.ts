import { desc, eq, sql as dsql } from "drizzle-orm";
import { db } from "@/db/client";
import { discountCodes, loyalty } from "@/db/schema";
import { createNotification } from "@/domain/notifications/operations";
import { codeRedeemable, type DiscountCode } from "./discount";

/** Promo-code reads + loyalty punch-card operations. */

export interface DiscountCodeRow extends DiscountCode {
  readonly id: string;
  readonly code: string;
  readonly active: boolean;
  readonly maxUses: number | null;
  readonly usedCount: number;
  readonly expiresAt: Date | null;
}

export async function loadAllDiscountCodes(): Promise<DiscountCodeRow[]> {
  return db.select().from(discountCodes).orderBy(desc(discountCodes.createdAt));
}

/** A redeemable code by its (case-insensitive) string, or null. */
export async function findRedeemableCode(
  code: string,
  now = new Date(),
): Promise<DiscountCodeRow | null> {
  const [row] = await db
    .select()
    .from(discountCodes)
    .where(eq(discountCodes.code, code.trim().toUpperCase()));
  if (!row) return null;
  return codeRedeemable(row, now) ? row : null;
}

/** Atomically bump a code's redemption count. */
export async function incrementCodeUse(id: string): Promise<void> {
  await db
    .update(discountCodes)
    .set({ usedCount: dsql`${discountCodes.usedCount} + 1` })
    .where(eq(discountCodes.id, id));
}

/** Spendable loyalty free-cut credits for a client. */
export async function loyaltyFreeCredits(clientId: string): Promise<number> {
  const [row] = await db
    .select({ n: loyalty.freeCredits })
    .from(loyalty)
    .where(eq(loyalty.clientId, clientId));
  return row?.n ?? 0;
}

/** Consume one free cut under a row lock; returns true if one was available. */
export async function consumeFreeCredit(clientId: string): Promise<boolean> {
  return db.transaction(async (tx) => {
    const [row] = await tx
      .select()
      .from(loyalty)
      .where(eq(loyalty.clientId, clientId))
      .for("update");
    if (!row || row.freeCredits <= 0) return false;
    await tx
      .update(loyalty)
      .set({ freeCredits: row.freeCredits - 1 })
      .where(eq(loyalty.clientId, clientId));
    return true;
  });
}

/** Return a consumed free credit (e.g. the booking it was spent on failed). */
export async function grantFreeCredit(clientId: string): Promise<void> {
  await db
    .update(loyalty)
    .set({ freeCredits: dsql`${loyalty.freeCredits} + 1` })
    .where(eq(loyalty.clientId, clientId));
}

/**
 * Record a completed visit toward the punch-card. Every `everyN`-th completed
 * visit grants a free cut. No-op when loyalty is disabled (everyN <= 0).
 */
export async function recordLoyaltyVisit(
  clientId: string,
  everyN: number,
): Promise<void> {
  if (everyN <= 0) return;
  const [row] = await db
    .insert(loyalty)
    .values({ clientId, completedCount: 1 })
    .onConflictDoUpdate({
      target: loyalty.clientId,
      set: { completedCount: dsql`${loyalty.completedCount} + 1` },
    })
    .returning({ completedCount: loyalty.completedCount });
  const count = row?.completedCount ?? 0;
  if (count % everyN === 0) {
    await db
      .update(loyalty)
      .set({ freeCredits: dsql`${loyalty.freeCredits} + 1` })
      .where(eq(loyalty.clientId, clientId));
    await createNotification(
      clientId,
      "loyalty",
      "You earned a free cut!",
      `That's ${count} visits - your next cut is on us. Pick "use a free cut" at booking.`,
    );
  }
}
