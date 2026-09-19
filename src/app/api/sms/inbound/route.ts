import { createHmac, timingSafeEqual } from "node:crypto";
import { and, asc, eq, gt, inArray } from "drizzle-orm";
import { db } from "@/db/client";
import { appointments, users } from "@/db/schema";
import { env, smsEnabled } from "@/env";
import { parseSmsCommand } from "@/domain/sms/commands";
import { cancelAppointmentOp } from "@/domain/booking/operations";
import { loadSettings } from "@/domain/booking/load";
import { promoteForSlot } from "@/domain/waitlist/operations";
import { canSelfJoin } from "@/domain/walkins/selfjoin";
import {
  addWalkinOp,
  countWaiting,
  leaveByPhoneOp,
  loadTicketByPhone,
  phoneInLine,
} from "@/domain/walkins/operations";

/**
 * Inbound SMS webhook (Twilio). Clients text CANCEL / CONFIRM about their next
 * appointment, or JOIN / STATUS to work the walk-in line. Requires TWILIO_*
 * env; untestable locally without a public URL and a Twilio number, so this is
 * scaffolded and signature-verified but only exercised in a real deployment.
 */

const HELP =
  "Reply JOIN to get in the walk-in line, STATUS to check your spot, " +
  "CONFIRM to confirm your next appointment, or CANCEL to cancel it.";

function twiml(message: string): Response {
  const xml = `<?xml version="1.0" encoding="UTF-8"?><Response><Message>${message}</Message></Response>`;
  return new Response(xml, {
    headers: { "Content-Type": "text/xml; charset=utf-8" },
  });
}

/** Validate Twilio's X-Twilio-Signature over the URL + sorted POST params. */
function validSignature(
  url: string,
  params: Record<string, string>,
  signature: string,
): boolean {
  const data =
    url +
    Object.keys(params)
      .sort()
      .map((k) => k + params[k])
      .join("");
  const expected = createHmac("sha1", env.TWILIO_AUTH_TOKEN!)
    .update(Buffer.from(data, "utf-8"))
    .digest("base64");
  const a = Buffer.from(expected);
  const b = Buffer.from(signature);
  return a.length === b.length && timingSafeEqual(a, b);
}

export async function POST(req: Request): Promise<Response> {
  if (!smsEnabled) {
    return new Response("sms not configured", { status: 503 });
  }

  const form = await req.formData();
  const params: Record<string, string> = {};
  for (const [k, v] of form.entries()) {
    if (typeof v === "string") params[k] = v;
  }

  const signature = req.headers.get("x-twilio-signature") ?? "";
  const url = `${env.APP_URL}/api/sms/inbound`;
  if (!validSignature(url, params, signature)) {
    return new Response("bad signature", { status: 403 });
  }

  const from = params.From ?? "";
  const command = parseSmsCommand(params.Body ?? "");

  const [user] = await db
    .select({ id: users.id, name: users.name })
    .from(users)
    .where(eq(users.phone, from));
  if (!user) {
    return twiml("We could not find your account. Please call the shop.");
  }

  // The line commands stand on their own - they must be handled before the
  // "no upcoming appointment" guard below, since walking in needs no booking.
  if (command.kind === "join") {
    const settings = await loadSettings();
    const decision = canSelfJoin({
      enabled: settings.selfJoinEnabled,
      waitingCount: await countWaiting(),
      maxWaiting: settings.queueMaxWaiting,
      alreadyInLine: await phoneInLine(from),
    });
    if (!decision.ok) return twiml(decision.message);
    await addWalkinOp({
      name: command.name ?? user.name,
      phone: from,
      source: "sms",
    });
    const ticket = await loadTicketByPhone(from);
    return twiml(
      ticket?.position
        ? `You're #${ticket.position} in line, about ${ticket.estWaitMin} min. Reply STATUS to check, or CANCEL to drop out.`
        : "You're in the line. Reply STATUS to check your spot.",
    );
  }
  if (command.kind === "status") {
    const ticket = await loadTicketByPhone(from);
    if (!ticket) return twiml("You're not in the line. Reply JOIN to get in.");
    return twiml(
      ticket.status === "serving"
        ? `You're up! Head to ${ticket.barberName ?? "the chair"}.`
        : `You're #${ticket.position} in line, about ${ticket.estWaitMin} min.`,
    );
  }

  const [next] = await db
    .select({
      id: appointments.id,
      barberId: appointments.barberId,
      startAt: appointments.startAt,
      status: appointments.status,
    })
    .from(appointments)
    .where(
      and(
        eq(appointments.clientId, user.id),
        inArray(appointments.status, ["confirmed", "pending_deposit", "reserved"]),
        gt(appointments.startAt, new Date()),
      ),
    )
    .orderBy(asc(appointments.startAt))
    .limit(1);

  if (command.kind === "help") {
    return twiml(HELP);
  }
  if (!next) {
    // No booking to act on - but CANCEL should still drop them from the line
    // rather than dead-ending on "no appointments".
    if (command.kind === "cancel" && (await leaveByPhoneOp(from))) {
      return twiml("You're out of the line. Reply JOIN to get back in.");
    }
    return twiml(`You have no upcoming appointments. ${HELP}`);
  }

  if (command.kind === "cancel") {
    const outcome = await cancelAppointmentOp({ appointmentId: next.id, clientId: user.id });
    await promoteForSlot(outcome.barberId, outcome.startAt);
    return twiml("Your appointment has been canceled. Text us to book again.");
  }
  if (command.kind === "confirm") {
    if (next.status !== "reserved") {
      return twiml("Your appointment is already confirmed. See you soon!");
    }
    await db
      .update(appointments)
      .set({ status: "confirmed", attendanceConfirmedAt: new Date() })
      .where(eq(appointments.id, next.id));
    return twiml("Thanks - your spot is locked in. See you soon!");
  }

  return twiml(HELP);
}
