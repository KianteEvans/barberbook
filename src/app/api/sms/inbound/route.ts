import { createHmac, timingSafeEqual } from "node:crypto";
import { and, asc, eq, gt, inArray } from "drizzle-orm";
import { db } from "@/db/client";
import { appointments, users } from "@/db/schema";
import { env, smsEnabled } from "@/env";
import { parseSmsCommand } from "@/domain/sms/commands";
import { cancelAppointmentOp } from "@/domain/booking/operations";
import { promoteForSlot } from "@/domain/waitlist/operations";

/**
 * Inbound SMS webhook (Twilio). Clients text CANCEL / CONFIRM about their next
 * appointment. Requires TWILIO_* env; untestable locally without a public URL
 * and a Twilio number, so this is scaffolded and signature-verified but only
 * exercised in a real deployment.
 */

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
    .select({ id: users.id })
    .from(users)
    .where(eq(users.phone, from));
  if (!user) {
    return twiml("We could not find your account. Please call the shop.");
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
    return twiml("Reply CANCEL to cancel your next appointment, or CONFIRM to confirm it.");
  }
  if (!next) {
    return twiml("You have no upcoming appointments.");
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

  return twiml("Reply CANCEL to cancel your next appointment, or CONFIRM to confirm it.");
}
