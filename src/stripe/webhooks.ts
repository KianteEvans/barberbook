import type Stripe from "stripe";
import { and, eq } from "drizzle-orm";
import { db } from "@/db/client";
import {
  appointments,
  membershipCredits,
  membershipPlans,
  memberships,
  payments,
  recurringSeries,
  users,
  webhookEvents,
} from "@/db/schema";
import { stripe } from "./client";
import { materializeAllSeries } from "@/domain/series/operations";

/**
 * Stripe event handlers. Every handler is a status-guarded UPDATE (safe to
 * replay); dedup happens at the route via the webhook_events ledger before
 * dispatch. Unknown event types are acknowledged and ignored.
 */

/** Returns false when the event was already processed (dedup). */
export async function recordEventOnce(event: Stripe.Event): Promise<boolean> {
  const inserted = await db
    .insert(webhookEvents)
    .values({ stripeEventId: event.id, type: event.type })
    .onConflictDoNothing()
    .returning({ id: webhookEvents.stripeEventId });
  return inserted.length > 0;
}

export async function handleEvent(event: Stripe.Event): Promise<void> {
  switch (event.type) {
    case "checkout.session.completed":
      await onCheckoutCompleted(event.data.object);
      break;
    case "invoice.paid":
      await onInvoicePaid(event.data.object);
      break;
    case "invoice.payment_failed":
      await onInvoicePaymentFailed(event.data.object);
      break;
    case "customer.subscription.deleted":
      await onSubscriptionDeleted(event.data.object);
      break;
    default:
      break;
  }
}

/** Deposit paid (mode=payment) or card saved (mode=setup). */
async function onCheckoutCompleted(
  session: Stripe.Checkout.Session,
): Promise<void> {
  if (session.mode === "setup") {
    await onCardSetupCompleted(session);
    return;
  }
  if (session.mode !== "payment") return;

  const appointmentId = session.metadata?.appointmentId;
  if (!appointmentId) return;
  const paymentIntentId =
    typeof session.payment_intent === "string"
      ? session.payment_intent
      : (session.payment_intent?.id ?? null);

  // Confirm only if still pending - the status guard makes replays no-ops.
  const updated = await db
    .update(appointments)
    .set({
      status: "confirmed",
      holdExpiresAt: null,
      stripePaymentIntentId: paymentIntentId,
    })
    .where(
      and(
        eq(appointments.id, appointmentId),
        eq(appointments.status, "pending_deposit"),
      ),
    )
    .returning({
      id: appointments.id,
      clientId: appointments.clientId,
      depositCents: appointments.depositCents,
    });

  const appt = updated[0];
  if (appt) {
    await db.insert(payments).values({
      appointmentId: appt.id,
      clientId: appt.clientId,
      type: "deposit",
      amountCents: appt.depositCents,
      status: "succeeded",
      stripePaymentIntentId: paymentIntentId,
    });
    if (paymentIntentId) {
      await stashPaymentMethod(appt.clientId, paymentIntentId);
      // If this deposit anchored a recurring series, book its horizon now
      // that a reusable card exists.
      await materializeAllSeries().catch((err) => {
        console.error("[webhook] series materialization failed:", err);
      });
    }
    return;
  }

  // Late payment: the hold already expired and the cron canceled the row.
  // Refund automatically so the client is never charged for a lost slot.
  const [existing] = await db
    .select({ status: appointments.status })
    .from(appointments)
    .where(eq(appointments.id, appointmentId));
  if (existing?.status === "canceled" && paymentIntentId) {
    const refund = await stripe().refunds.create({
      payment_intent: paymentIntentId,
    });
    await db.insert(payments).values({
      appointmentId,
      type: "refund",
      amountCents: 0,
      status: "succeeded",
      stripePaymentIntentId: paymentIntentId,
      stripeRefundId: refund.id,
      failureMessage: "Deposit auto-refunded: hold expired before payment landed.",
    });
  }
}

/** If the deposit saved a reusable payment method, remember it for series. */
async function stashPaymentMethod(
  clientId: string,
  paymentIntentId: string,
): Promise<void> {
  try {
    const pi = await stripe().paymentIntents.retrieve(paymentIntentId);
    const pm =
      typeof pi.payment_method === "string"
        ? pi.payment_method
        : pi.payment_method?.id;
    if (!pm || pi.setup_future_usage !== "off_session") return;
    await db
      .update(recurringSeries)
      .set({ stripePaymentMethodId: pm })
      .where(
        and(
          eq(recurringSeries.clientId, clientId),
          eq(recurringSeries.status, "active"),
        ),
      );
  } catch (err) {
    console.error("[webhook] failed to stash payment method:", err);
  }
}

/** Card saved via setup-mode checkout: attach to any active series. */
async function onCardSetupCompleted(
  session: Stripe.Checkout.Session,
): Promise<void> {
  const clientId = session.metadata?.clientId;
  if (!clientId) return;
  const setupIntentId =
    typeof session.setup_intent === "string"
      ? session.setup_intent
      : session.setup_intent?.id;
  if (!setupIntentId) return;
  const si = await stripe().setupIntents.retrieve(setupIntentId);
  const pm =
    typeof si.payment_method === "string"
      ? si.payment_method
      : si.payment_method?.id;
  if (!pm) return;
  await db
    .update(recurringSeries)
    .set({ stripePaymentMethodId: pm })
    .where(
      and(
        eq(recurringSeries.clientId, clientId),
        eq(recurringSeries.status, "active"),
      ),
    );
}

/** Membership invoice paid: activate + grant this period's credits. */
async function onInvoicePaid(invoice: Stripe.Invoice): Promise<void> {
  const subId =
    typeof invoice.subscription === "string"
      ? invoice.subscription
      : invoice.subscription?.id;
  if (!subId) return;

  const sub = await stripe().subscriptions.retrieve(subId);
  const planId = sub.metadata.planId;
  const clientId = sub.metadata.clientId;
  if (!planId || !clientId) return;

  const periodStart = new Date(sub.current_period_start * 1000);
  const periodEnd = new Date(sub.current_period_end * 1000);

  const [plan] = await db
    .select()
    .from(membershipPlans)
    .where(eq(membershipPlans.id, planId));
  if (!plan) return;

  // Upsert the membership row keyed by the Stripe subscription id.
  const [existing] = await db
    .select()
    .from(memberships)
    .where(eq(memberships.stripeSubscriptionId, subId));
  let membershipId: string;
  if (existing) {
    membershipId = existing.id;
    await db
      .update(memberships)
      .set({ status: "active", currentPeriodEnd: periodEnd })
      .where(eq(memberships.id, existing.id));
  } else {
    const [created] = await db
      .insert(memberships)
      .values({
        clientId,
        planId,
        stripeSubscriptionId: subId,
        status: "active",
        currentPeriodEnd: periodEnd,
      })
      .returning({ id: memberships.id });
    if (!created) return;
    membershipId = created.id;
  }

  // One credits row per invoice (unique stripe_invoice_id = replay-safe).
  await db
    .insert(membershipCredits)
    .values({
      membershipId,
      granted: plan.creditsPerPeriod,
      periodStart,
      periodEnd,
      stripeInvoiceId: invoice.id,
    })
    .onConflictDoNothing();

  const [client] = await db.select().from(users).where(eq(users.id, clientId));
  await db.insert(payments).values({
    membershipId,
    clientId: client?.id ?? null,
    type: "subscription",
    amountCents: invoice.amount_paid,
    status: "succeeded",
  });
}

async function onInvoicePaymentFailed(invoice: Stripe.Invoice): Promise<void> {
  const subId =
    typeof invoice.subscription === "string"
      ? invoice.subscription
      : invoice.subscription?.id;
  if (!subId) return;
  await db
    .update(memberships)
    .set({ status: "past_due" })
    .where(eq(memberships.stripeSubscriptionId, subId));
}

async function onSubscriptionDeleted(sub: Stripe.Subscription): Promise<void> {
  await db
    .update(memberships)
    .set({ status: "canceled" })
    .where(eq(memberships.stripeSubscriptionId, sub.id));
}
