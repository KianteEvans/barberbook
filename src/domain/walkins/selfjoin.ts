/**
 * Pure gate for client self-service queue joins. The line is a public,
 * unauthenticated write, so every reason to say no lives here where it can be
 * tested: the owner's switch, the length cap, and one-entry-per-person.
 */

export type SelfJoinRefusal =
  | "disabled"
  | "full"
  | "already_in_line";

export interface SelfJoinInput {
  /** shop_settings.self_join_enabled */
  readonly enabled: boolean;
  /** How many are currently waiting (excludes those already in a chair). */
  readonly waitingCount: number;
  /** shop_settings.queue_max_waiting; 0 = no cap. */
  readonly maxWaiting: number;
  /** This phone already has a live (waiting/serving) entry. */
  readonly alreadyInLine: boolean;
}

export type SelfJoinDecision =
  | { readonly ok: true }
  | { readonly ok: false; readonly reason: SelfJoinRefusal; readonly message: string };

const MESSAGES: Record<SelfJoinRefusal, string> = {
  disabled: "Online check-in is off right now - give the shop a call or stop by.",
  full: "The line is full at the moment. Try again in a little while.",
  already_in_line: "You're already in the line - check your spot with the link we gave you.",
};

export function canSelfJoin(input: SelfJoinInput): SelfJoinDecision {
  const refuse = (reason: SelfJoinRefusal): SelfJoinDecision => ({
    ok: false,
    reason,
    message: MESSAGES[reason],
  });

  if (!input.enabled) return refuse("disabled");
  if (input.alreadyInLine) return refuse("already_in_line");
  if (input.maxWaiting > 0 && input.waitingCount >= input.maxWaiting) {
    return refuse("full");
  }
  return { ok: true };
}
