/**
 * Pure decision logic for flexible ("any time that day") waitlist alerts.
 * A flexible waiter is told about a freed slot when the slot falls inside
 * their desired day and they have not been pinged within the throttle window.
 */

export const NOTIFY_THROTTLE_MIN = 60;

export interface FlexibleNotifyInput {
  /** The freed slot instant. */
  readonly freedAt: Date;
  /** UTC range of the waiter's desired shop-local day. */
  readonly dayStart: Date;
  readonly dayEnd: Date;
  /** When this waiter was last alerted, or null if never. */
  readonly lastNotifiedAt: Date | null;
  readonly now: Date;
}

export function shouldNotifyFlexible(input: FlexibleNotifyInput): boolean {
  // The slot must still be bookable and inside the waiter's day.
  if (input.freedAt.getTime() <= input.now.getTime()) return false;
  if (input.freedAt.getTime() < input.dayStart.getTime()) return false;
  if (input.freedAt.getTime() >= input.dayEnd.getTime()) return false;
  // Throttle: at most one alert per window.
  if (input.lastNotifiedAt !== null) {
    const elapsedMin =
      (input.now.getTime() - input.lastNotifiedAt.getTime()) / 60_000;
    if (elapsedMin < NOTIFY_THROTTLE_MIN) return false;
  }
  return true;
}
