/**
 * Pure parser for inbound SMS commands. Keeps the webhook route trivial and
 * lets the command grammar be unit-tested without Twilio.
 */

export type SmsCommand =
  | { readonly kind: "cancel" }
  | { readonly kind: "confirm" }
  | { readonly kind: "help" }
  | { readonly kind: "unknown" };

export function parseSmsCommand(body: string): SmsCommand {
  const word = body.trim().toUpperCase().split(/\s+/)[0] ?? "";
  switch (word) {
    case "CANCEL":
    case "C":
      return { kind: "cancel" };
    case "CONFIRM":
    case "YES":
    case "Y":
      return { kind: "confirm" };
    case "HELP":
    case "INFO":
      return { kind: "help" };
    default:
      return { kind: "unknown" };
  }
}
