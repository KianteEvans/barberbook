/**
 * Pure re-engagement nudge policy. Given how long since a client's last visit,
 * whether they already have something booked, the admin thresholds, and when
 * each nudge was last sent, decide which (if any) nudge to send now.
 */

export type NudgeKind = "rebook" | "winback";

export interface NudgeInput {
  readonly daysSinceLastVisit: number;
  readonly hasUpcoming: boolean;
  readonly rebookAfterDays: number; // 0 = off
  readonly winbackAfterDays: number; // 0 = off
  /** Days since each nudge was last sent, or null if never. */
  readonly rebookSentDaysAgo: number | null;
  readonly winbackSentDaysAgo: number | null;
}

/**
 * Win-back takes priority once a client is deeply lapsed; otherwise a rebook
 * nudge fires. Each kind respects a cooldown equal to its own threshold so a
 * client is never nudged twice inside one window. Clients with an upcoming
 * booking are never nudged.
 */
export function decideNudge(input: NudgeInput): NudgeKind | null {
  if (input.hasUpcoming) return null;

  const winbackOn = input.winbackAfterDays > 0;
  const rebookOn = input.rebookAfterDays > 0;

  if (winbackOn && input.daysSinceLastVisit >= input.winbackAfterDays) {
    const fresh =
      input.winbackSentDaysAgo === null ||
      input.winbackSentDaysAgo >= input.winbackAfterDays;
    return fresh ? "winback" : null;
  }

  if (rebookOn && input.daysSinceLastVisit >= input.rebookAfterDays) {
    const fresh =
      input.rebookSentDaysAgo === null ||
      input.rebookSentDaysAgo >= input.rebookAfterDays;
    return fresh ? "rebook" : null;
  }

  return null;
}
