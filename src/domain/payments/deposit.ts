/**
 * Pure deposit/refund policy math. Deposit source of truth:
 *   1. service.depositCents when set,
 *   2. otherwise shop policy (fixed cents, or whole-percent of price).
 * Deposit is always clamped to the service price.
 */

export interface DepositPolicy {
  readonly depositMode: "fixed" | "percent";
  readonly depositValue: number;
}

export interface ServicePricing {
  readonly priceCents: number;
  readonly depositCents: number | null;
}

export interface DepositSplit {
  readonly depositCents: number;
  readonly remainderCents: number;
}

export function computeDeposit(
  service: ServicePricing,
  policy: DepositPolicy,
): DepositSplit {
  let deposit: number;
  if (service.depositCents !== null) {
    deposit = service.depositCents;
  } else if (policy.depositMode === "percent") {
    deposit = Math.round((service.priceCents * policy.depositValue) / 100);
  } else {
    deposit = policy.depositValue;
  }
  deposit = Math.max(0, Math.min(deposit, service.priceCents));
  return { depositCents: deposit, remainderCents: service.priceCents - deposit };
}

export type RefundEligibility = "full_refund" | "no_refund";

/** Cancelling at least `windowHours` before start refunds the deposit. */
export function refundEligibility(
  appointmentStartUtc: Date,
  now: Date,
  windowHours: number,
): RefundEligibility {
  const cutoff = appointmentStartUtc.getTime() - windowHours * 3600_000;
  return now.getTime() <= cutoff ? "full_refund" : "no_refund";
}
