/**
 * Pure parser for inbound SMS commands. Keeps the webhook route trivial and
 * lets the command grammar be unit-tested without Twilio.
 */

export type SmsCommand =
  | { readonly kind: "cancel" }
  | { readonly kind: "confirm" }
  /** Get in the walk-in line; the rest of the message is an optional name. */
  | { readonly kind: "join"; readonly name: string | null }
  /** Where am I in the line? */
  | { readonly kind: "status" }
  | { readonly kind: "help" }
  | { readonly kind: "unknown" };

export function parseSmsCommand(body: string): SmsCommand {
  const trimmed = body.trim();
  const parts = trimmed.split(/\s+/);
  const word = (parts[0] ?? "").toUpperCase();
  const rest = parts.slice(1).join(" ").trim();

  switch (word) {
    case "CANCEL":
    case "C":
      return { kind: "cancel" };
    case "CONFIRM":
    case "YES":
    case "Y":
      return { kind: "confirm" };
    case "JOIN":
    case "LINE":
      // "JOIN Malik" names the walk-in; bare "JOIN" falls back to the account.
      return { kind: "join", name: rest.length > 0 ? rest.slice(0, 60) : null };
    case "STATUS":
    case "WAIT":
      return { kind: "status" };
    case "HELP":
    case "INFO":
      return { kind: "help" };
    default:
      return { kind: "unknown" };
  }
}
