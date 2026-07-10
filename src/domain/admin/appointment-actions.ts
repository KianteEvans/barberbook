"use server";

import { revalidatePath } from "next/cache";
import { and, eq, inArray } from "drizzle-orm";
import { z } from "zod";
import Stripe from "stripe";
import { db } from "@/db/client";
import { appointments, payments, users } from "@/db/schema";
import { getAdminIdentity } from "@/auth/session";
import { parseOrThrow, formObject, type ActionState } from "@/domain/forms";
import { toActionError, NotFoundError, ValidationError, AppError } from "@/domain/errors";
import { formatInTimeZone } from "date-fns-tz";
import { loadSettings } from "@/domain/booking/load";
import { noShowAllowed } from "@/domain/booking/grace";
import { createNotification } from "@/domain/notifications/operations";
import { paymentsEnabled } from "@/env";
import { stripe } from "@/stripe/client";
import { formatMoney } from "@/domain/money";

/** Admin appointment lifecycle: complete, no-show, charge remainder, refund. */

const idSchema = z.object({ appointmentId: z.string().uuid() });

async function requireAppointment(appointmentId: string) {
  const [appt] = await db
    .select()
    .from(appointments)
    .where(eq(appointments.id, appointmentId));
  if (!appt) throw new NotFoundError("Appointment not found.");
  return appt;
}

export async function markCompletedAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  try {
    await getAdminIdentity();
    const input = parseOrThrow(idSchema, formObject(formData));
    const updated = await db
      .update(appointments)
      .set({ status: "completed" })
      .where(
        and(
          eq(appointments.id, input.appointmentId),
          inArray(appointments.status, ["confirmed", "pending_deposit"]),
        ),
      )
      .returning({ id: appointments.id, clientId: appointments.clientId });
    const done = updated[0];
    if (!done) {
      throw new ValidationError("Only a confirmed appointment can be completed.");
    }
    // Invite the client to review the visit (feeds the gallery once approved).
    await createNotification(
      done.clientId,
      "review_request",
      "How was your cut?",
      "Leave a quick rating and review from your appointments page.",
      done.id,
    );
    revalidatePath("/admin");
    revalidatePath("/admin/calendar");
    return { ok: true, detail: "Marked completed." };
  } catch (err) {
    return { ok: false, error: toActionError(err) };
  }
}

/**
 * No-show: deposit is kept; optionally charge the configured no-show fee to
 * the saved card. A failed fee charge still marks the no-show.
 */
export async function markNoShowAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  try {
    await getAdminIdentity();
    const input = parseOrThrow(idSchema, formObject(formData));
    const appt = await requireAppointment(input.appointmentId);
    if (appt.status !== "confirmed" && appt.status !== "reserved") {
      throw new ValidationError("Only a live appointment can be a no-show.");
    }
    const settings = await loadSettings();
    // Grace period must elapse before a no-show may be recorded.
    const grace = appt.graceMinutes ?? 0;
    if (!noShowAllowed(appt.startAt, grace, new Date())) {
      const until = formatInTimeZone(
        new Date(appt.startAt.getTime() + grace * 60_000),
        settings.timezone,
        "h:mm a",
      );
      throw new ValidationError(
        `Grace period runs until ${until}. You can mark a no-show after that.`,
      );
    }

    await db
      .update(appointments)
      .set({ status: "no_show" })
      .where(eq(appointments.id, appt.id));

    let detail = "Marked no-show. Deposit kept.";
    if (paymentsEnabled && settings.noShowFeeCents > 0) {
      const charge = await chargeSavedCard({
        clientId: appt.clientId,
        appointmentId: appt.id,
        amountCents: settings.noShowFeeCents,
        type: "no_show_fee",
        description: "No-show fee",
      });
      detail = charge.ok
        ? `Marked no-show. ${formatMoney(settings.noShowFeeCents)} fee charged.`
        : `Marked no-show. Fee charge failed: ${charge.message}`;
    }

    revalidatePath("/admin");
    revalidatePath("/admin/calendar");
    return { ok: true, detail };
  } catch (err) {
    return { ok: false, error: toActionError(err) };
  }
}

/** Charge the remaining balance to the client's saved card, off-session. */
export async function chargeRemainderAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  try {
    await getAdminIdentity();
    const input = parseOrThrow(idSchema, formObject(formData));
    const appt = await requireAppointment(input.appointmentId);
    if (appt.status !== "confirmed" && appt.status !== "completed") {
      throw new ValidationError("This appointment cannot be charged.");
    }
    if (appt.remainderCents <= 0) {
      throw new ValidationError("There is no remaining balance.");
    }
    if (!paymentsEnabled) {
      throw new AppError("Online payments are not configured - collect in person.");
    }

    const [already] = await db
      .select()
      .from(payments)
      .where(
        and(
          eq(payments.appointmentId, appt.id),
          eq(payments.type, "remainder"),
          eq(payments.status, "succeeded"),
        ),
      );
    if (already) throw new ValidationError("The remainder was already collected.");

    const charge = await chargeSavedCard({
      clientId: appt.clientId,
      appointmentId: appt.id,
      amountCents: appt.remainderCents,
      type: "remainder",
      description: "Remaining balance",
    });
    if (!charge.ok) {
      return {
        ok: false,
        error: `Charge failed: ${charge.message} Collect in person instead.`,
      };
    }

    revalidatePath("/admin");
    revalidatePath("/admin/calendar");
    revalidatePath("/admin/payments");
    return { ok: true, detail: `Charged ${formatMoney(appt.remainderCents)}.` };
  } catch (err) {
    return { ok: false, error: toActionError(err) };
  }
}

/** Refund the deposit regardless of the window (admin override). */
export async function refundDepositAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  try {
    await getAdminIdentity();
    const input = parseOrThrow(idSchema, formObject(formData));
    const appt = await requireAppointment(input.appointmentId);
    if (!appt.stripePaymentIntentId || appt.depositCents <= 0) {
      throw new ValidationError("No online deposit to refund.");
    }
    const refund = await stripe().refunds.create({
      payment_intent: appt.stripePaymentIntentId,
    });
    await db.insert(payments).values({
      appointmentId: appt.id,
      clientId: appt.clientId,
      type: "refund",
      amountCents: -appt.depositCents,
      status: "succeeded",
      stripePaymentIntentId: appt.stripePaymentIntentId,
      stripeRefundId: refund.id,
    });
    revalidatePath("/admin/payments");
    return { ok: true, detail: `Refunded ${formatMoney(appt.depositCents)}.` };
  } catch (err) {
    return { ok: false, error: toActionError(err) };
  }
}

/**
 * Off-session charge against the customer's saved card. Failures are expected
 * (authentication_required, expired cards): record them and report cleanly.
 */
export async function chargeSavedCard({
  clientId,
  appointmentId,
  amountCents,
  type,
  description,
}: {
  clientId: string;
  appointmentId: string;
  amountCents: number;
  type: "remainder" | "no_show_fee" | "tip";
  description: string;
}): Promise<{ ok: boolean; message: string }> {
  const [client] = await db.select().from(users).where(eq(users.id, clientId));
  if (!client?.stripeCustomerId) {
    return { ok: false, message: "Client has no saved card." };
  }

  const methods = await stripe().paymentMethods.list({
    customer: client.stripeCustomerId,
    type: "card",
    limit: 1,
  });
  const card = methods.data[0];
  if (!card) return { ok: false, message: "Client has no saved card." };

  try {
    const pi = await stripe().paymentIntents.create({
      amount: amountCents,
      currency: "usd",
      customer: client.stripeCustomerId,
      payment_method: card.id,
      off_session: true,
      confirm: true,
      description,
      metadata: { appointmentId, kind: type },
    });
    await db.insert(payments).values({
      appointmentId,
      clientId,
      type,
      amountCents,
      status: "succeeded",
      stripePaymentIntentId: pi.id,
    });
    return { ok: true, message: "charged" };
  } catch (err) {
    const message =
      err instanceof Stripe.errors.StripeError
        ? (err.message ?? err.code ?? "card error")
        : "unexpected error";
    await db.insert(payments).values({
      appointmentId,
      clientId,
      type,
      amountCents,
      status: "failed",
      failureMessage: message,
    });
    return { ok: false, message };
  }
}
