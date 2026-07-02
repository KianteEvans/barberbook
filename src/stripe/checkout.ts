import { env } from "@/env";
import { db } from "@/db/client";
import { appointments } from "@/db/schema";
import { eq } from "drizzle-orm";
import { stripe, ensureStripeCustomer } from "./client";

/**
 * Checkout Session builders. All three money flows go through Stripe Checkout
 * redirects: deposits (mode=payment), saved cards (mode=setup), memberships
 * (mode=subscription).
 */

/** Deposit checkout for a pending_deposit appointment; returns redirect URL. */
export async function createDepositCheckout({
  appointmentId,
  clientId,
  depositCents,
  serviceName,
  holdExpiresAt,
  saveCard,
}: {
  appointmentId: string;
  clientId: string;
  depositCents: number;
  serviceName: string;
  holdExpiresAt: Date;
  saveCard: boolean;
}): Promise<string> {
  const customerId = await ensureStripeCustomer(clientId);

  const session = await stripe().checkout.sessions.create({
    mode: "payment",
    customer: customerId,
    // Stripe requires expires_at >= 30 minutes from creation; align with the
    // slot hold so an abandoned checkout and the hold die together.
    expires_at: Math.floor(holdExpiresAt.getTime() / 1000),
    line_items: [
      {
        quantity: 1,
        price_data: {
          currency: "usd",
          unit_amount: depositCents,
          product_data: { name: `Deposit - ${serviceName}` },
        },
      },
    ],
    payment_intent_data: {
      metadata: { appointmentId },
      ...(saveCard ? { setup_future_usage: "off_session" as const } : {}),
    },
    metadata: { appointmentId, kind: "deposit" },
    success_url: `${env.APP_URL}/book/confirmation?appointment=${appointmentId}`,
    cancel_url: `${env.APP_URL}/book/confirmation?appointment=${appointmentId}&canceled=1`,
  });

  if (!session.url) throw new Error("Stripe did not return a checkout URL.");
  await db
    .update(appointments)
    .set({ stripeCheckoutSessionId: session.id })
    .where(eq(appointments.id, appointmentId));
  return session.url;
}

/** Setup-mode checkout to save a card for off-session charges. */
export async function createCardSetupCheckout({
  clientId,
  returnPath,
}: {
  clientId: string;
  returnPath: string;
}): Promise<string> {
  const customerId = await ensureStripeCustomer(clientId);
  const session = await stripe().checkout.sessions.create({
    mode: "setup",
    customer: customerId,
    payment_method_types: ["card"],
    metadata: { kind: "card_setup", clientId },
    success_url: `${env.APP_URL}${returnPath}?setup=success`,
    cancel_url: `${env.APP_URL}${returnPath}?setup=canceled`,
  });
  if (!session.url) throw new Error("Stripe did not return a checkout URL.");
  return session.url;
}

/** Subscription checkout for a membership plan. */
export async function createSubscriptionCheckout({
  clientId,
  stripePriceId,
  planId,
}: {
  clientId: string;
  stripePriceId: string;
  planId: string;
}): Promise<string> {
  const customerId = await ensureStripeCustomer(clientId);
  const session = await stripe().checkout.sessions.create({
    mode: "subscription",
    customer: customerId,
    line_items: [{ price: stripePriceId, quantity: 1 }],
    metadata: { kind: "membership", planId, clientId },
    subscription_data: { metadata: { planId, clientId } },
    success_url: `${env.APP_URL}/account?membership=pending`,
    cancel_url: `${env.APP_URL}/memberships?canceled=1`,
  });
  if (!session.url) throw new Error("Stripe did not return a checkout URL.");
  return session.url;
}
