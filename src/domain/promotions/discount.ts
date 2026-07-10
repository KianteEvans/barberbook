/**
 * Pure discount math for promo codes. A code reduces the service price; the
 * deposit is then recomputed off the discounted price by the caller.
 */

export interface DiscountCode {
  readonly kind: "percent" | "fixed";
  readonly amount: number; // percent (1-100) or cents
}

/** Discount in cents for a given price, clamped to [0, price]. */
export function discountCents(priceCents: number, code: DiscountCode): number {
  const raw =
    code.kind === "percent"
      ? Math.round((priceCents * code.amount) / 100)
      : code.amount;
  return Math.max(0, Math.min(raw, priceCents));
}

/** Price after applying the discount. */
export function discountedPrice(priceCents: number, code: DiscountCode): number {
  return priceCents - discountCents(priceCents, code);
}

export interface CodeUsability {
  readonly active: boolean;
  readonly maxUses: number | null;
  readonly usedCount: number;
  readonly expiresAt: Date | null;
}

/** Whether a code can be redeemed right now. */
export function codeRedeemable(code: CodeUsability, now: Date): boolean {
  if (!code.active) return false;
  if (code.expiresAt !== null && code.expiresAt.getTime() < now.getTime()) return false;
  if (code.maxUses !== null && code.usedCount >= code.maxUses) return false;
  return true;
}
