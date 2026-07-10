import { env, smsEnabled } from "@/env";
import type { DeliveryResult } from "./delivery";

/**
 * Outbound SMS adapter (Twilio). Dependency-free: POSTs to the Twilio REST API
 * when TWILIO_* are set, otherwise a no-op ("skipped"). Never throws - SMS is
 * best-effort on top of the in-app notification row.
 */
export async function sendSms(to: string, body: string): Promise<DeliveryResult> {
  if (!smsEnabled) return "skipped";
  try {
    const url = `https://api.twilio.com/2010-04-01/Accounts/${env.TWILIO_ACCOUNT_SID}/Messages.json`;
    const auth = Buffer.from(
      `${env.TWILIO_ACCOUNT_SID}:${env.TWILIO_AUTH_TOKEN}`,
    ).toString("base64");
    const res = await fetch(url, {
      method: "POST",
      headers: {
        authorization: `Basic ${auth}`,
        "content-type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({ To: to, From: env.TWILIO_FROM!, Body: body }),
    });
    return res.ok ? "sent" : "failed";
  } catch (err) {
    console.error("[sms] send failed:", err);
    return "failed";
  }
}
