/**
 * Pure waitlist priority: active members jump ahead of non-members; within a
 * group, earliest-joined wins. Membership is passed in as a set so this stays
 * a pure, DB-free ordering used by the promotion engine.
 */

export interface WaitlistCandidate {
  readonly id: string;
  readonly clientId: string;
  readonly createdAt: Date;
}

export function orderWaitlist<T extends WaitlistCandidate>(
  entries: readonly T[],
  memberClientIds: ReadonlySet<string>,
): T[] {
  return [...entries].sort((a, b) => {
    const aRank = memberClientIds.has(a.clientId) ? 0 : 1;
    const bRank = memberClientIds.has(b.clientId) ? 0 : 1;
    if (aRank !== bRank) return aRank - bRank;
    return a.createdAt.getTime() - b.createdAt.getTime();
  });
}
