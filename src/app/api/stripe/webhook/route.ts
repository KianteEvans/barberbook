import { NextResponse } from "next/server";
import { env } from "@/env";
import { stripe } from "@/stripe/client";
import { handleEvent, recordEventOnce } from "@/stripe/webhooks";

/**
 * Stripe webhook receiver. Raw-body signature verification, event-id dedup,
 * then idempotent handlers. Local dev:
 *   stripe listen --forward-to localhost:3000/api/stripe/webhook
 */
export async function POST(req: Request): Promise<NextResponse> {
  if (!env.STRIPE_WEBHOOK_SECRET) {
    return NextResponse.json({ error: "webhooks not configured" }, { status: 503 });
  }
  const signature = req.headers.get("stripe-signature");
  if (!signature) {
    return NextResponse.json({ error: "missing signature" }, { status: 400 });
  }

  const raw = await req.text();
  let event;
  try {
    event = stripe().webhooks.constructEvent(raw, signature, env.STRIPE_WEBHOOK_SECRET);
  } catch {
    return NextResponse.json({ error: "invalid signature" }, { status: 400 });
  }

  const fresh = await recordEventOnce(event);
  if (!fresh) return NextResponse.json({ received: true, duplicate: true });

  try {
    await handleEvent(event);
  } catch (err) {
    // Log but still 200: handlers are replay-safe and Stripe retries 5xx
    // aggressively; a poisoned event should not wedge the queue. The event id
    // stays in the ledger so a manual replay is deliberate.
    console.error(`[stripe-webhook] handler failed for ${event.type} ${event.id}:`, err);
  }
  return NextResponse.json({ received: true });
}
