import { and, eq, inArray } from "drizzle-orm";
import { db } from "@/db/client";
import { membershipCredits, membershipPlans, memberships } from "@/db/schema";
import { pickCreditRow, creditsAvailable, type CreditRow } from "./credits";
import { ValidationError } from "@/domain/errors";

/** Membership reads + the row-locked credit consumption used by booking. */

export interface ClientMembership {
  readonly membershipId: string;
  readonly planName: string;
  readonly status: string;
  readonly creditsAvailable: number;
}

/** The client's active membership with spendable-credit count, or null. */
export async function loadClientMembership(
  clientId: string,
  now = new Date(),
): Promise<ClientMembership | null> {
  const [m] = await db
    .select({
      id: memberships.id,
      status: memberships.status,
      planName: membershipPlans.name,
    })
    .from(memberships)
    .innerJoin(membershipPlans, eq(memberships.planId, membershipPlans.id))
    .where(
      and(
        eq(memberships.clientId, clientId),
        inArray(memberships.status, ["active", "past_due"]),
      ),
    );
  if (!m) return null;

  const rows = await db
    .select()
    .from(membershipCredits)
    .where(eq(membershipCredits.membershipId, m.id));
  return {
    membershipId: m.id,
    planName: m.planName,
    status: m.status,
    creditsAvailable: creditsAvailable(rows, now),
  };
}

/**
 * Consume one credit inside a transaction. SELECT ... FOR UPDATE serializes
 * concurrent bookings so the CHECK (consumed <= granted) can never be raced.
 * Returns the credit row id the appointment should reference.
 */
export async function consumeCreditOp(
  clientId: string,
  now = new Date(),
): Promise<string> {
  return db.transaction(async (tx) => {
    const [m] = await tx
      .select({ id: memberships.id })
      .from(memberships)
      .where(
        and(eq(memberships.clientId, clientId), eq(memberships.status, "active")),
      );
    if (!m) throw new ValidationError("No active membership.");

    const rows: CreditRow[] = await tx
      .select()
      .from(membershipCredits)
      .where(eq(membershipCredits.membershipId, m.id))
      .for("update");

    const target = pickCreditRow(rows, now);
    if (!target) throw new ValidationError("No membership credits left this period.");

    await tx
      .update(membershipCredits)
      .set({ consumed: target.consumed + 1 })
      .where(eq(membershipCredits.id, target.id));
    return target.id;
  });
}

/** Return a consumed credit (e.g. when a credit-booked appointment cancels). */
export async function refundCreditOp(creditId: string): Promise<void> {
  await db.transaction(async (tx) => {
    const [row] = await tx
      .select()
      .from(membershipCredits)
      .where(eq(membershipCredits.id, creditId))
      .for("update");
    if (!row || row.consumed <= 0) return;
    await tx
      .update(membershipCredits)
      .set({ consumed: row.consumed - 1 })
      .where(eq(membershipCredits.id, creditId));
  });
}
