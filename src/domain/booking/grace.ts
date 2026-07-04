/**
 * Pure lock-tier + grace logic for the three booking tiers:
 *   - member (credit-covered): guaranteed, longer grace, no confirmation.
 *   - deposit (non-member paying a non-refundable deposit): "in the chair".
 *   - unconfirmed (non-member, no deposit): must confirm attendance by
 *     start - confirmation_window, else the slot is released.
 */

export type HoldTier = "member" | "deposit" | "unconfirmed";

/**
 * Reuses the booking op's existing `covered` (credit) / `online` (paying a
 * Stripe deposit) booleans. Anything else is a no-deposit hold that must be
 * confirmed.
 */
export function chooseTier(covered: boolean, online: boolean): HoldTier {
  if (covered) return "member";
  if (online) return "deposit";
  return "unconfirmed";
}

/** Status the appointment lands in at booking time for a tier. */
export function statusForTier(
  tier: HoldTier,
): "confirmed" | "pending_deposit" | "reserved" {
  if (tier === "member") return "confirmed";
  if (tier === "deposit") return "pending_deposit";
  return "reserved";
}

export interface GraceSettings {
  readonly memberGraceMinutes: number;
  readonly depositGraceMinutes: number;
}

/** Grace minutes past start before a barber may mark a no-show. */
export function graceForTier(tier: HoldTier, s: GraceSettings): number {
  return tier === "member" ? s.memberGraceMinutes : s.depositGraceMinutes;
}

/** A no-show may only be marked once the grace period has elapsed. */
export function noShowAllowed(
  startAt: Date,
  graceMinutes: number,
  now: Date,
): boolean {
  return now.getTime() >= startAt.getTime() + graceMinutes * 60_000;
}
