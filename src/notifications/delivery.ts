import { emailEnabled, env } from "@/env";

/**
 * Outbound email adapter. Dependency-free: POSTs to Resend when both
 * RESEND_API_KEY and EMAIL_FROM are set, otherwise a no-op ("skipped") so the
 * app runs fully in-app-only in dev. Never throws - callers treat email as
 * best-effort on top of the in-app notification row.
 */
export type DeliveryResult = "sent" | "skipped" | "failed";

export async function sendEmail(
  to: string,
  subject: string,
  body: string,
): Promise<DeliveryResult> {
  if (!emailEnabled) return "skipped";
  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        authorization: `Bearer ${env.RESEND_API_KEY}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        from: env.EMAIL_FROM,
        to,
        subject,
        text: body,
      }),
    });
    return res.ok ? "sent" : "failed";
  } catch (err) {
    console.error("[email] send failed:", err);
    return "failed";
  }
}
