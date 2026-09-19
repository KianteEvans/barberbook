/**
 * Pure register math. Every total the client is shown and every cent written
 * to the ledger comes from here, so rounding and clamping live in one place.
 */

export interface CartLine {
  readonly kind: "service" | "product" | "custom";
  readonly name: string;
  readonly unitPriceCents: number;
  readonly qty: number;
  readonly serviceId?: string | null;
  readonly productId?: string | null;
}

export interface CartTotals {
  readonly subtotalCents: number;
  /** Never more than the subtotal. */
  readonly discountCents: number;
  readonly tipCents: number;
  /** subtotal - discount + tip, floored at zero. */
  readonly totalCents: number;
  /** What the shop earned before the tip; the barber's gross. */
  readonly netSalesCents: number;
}

export function lineTotal(line: CartLine): number {
  return Math.max(0, Math.round(line.unitPriceCents)) * Math.max(0, Math.trunc(line.qty));
}

export function cartTotals(
  lines: readonly CartLine[],
  { discountCents = 0, tipCents = 0 }: { discountCents?: number; tipCents?: number } = {},
): CartTotals {
  const subtotalCents = lines.reduce((sum, l) => sum + lineTotal(l), 0);
  // A discount can zero a sale but never turn it into a payout.
  const discount = Math.min(Math.max(0, Math.round(discountCents)), subtotalCents);
  const tip = Math.max(0, Math.round(tipCents));
  const netSalesCents = subtotalCents - discount;
  return {
    subtotalCents,
    discountCents: discount,
    tipCents: tip,
    totalCents: netSalesCents + tip,
    netSalesCents,
  };
}

/** Tip presets are a percentage of what's actually owed, not the list price. */
export function tipForPercent(netSalesCents: number, percent: number): number {
  return Math.max(0, Math.round((netSalesCents * percent) / 100));
}
