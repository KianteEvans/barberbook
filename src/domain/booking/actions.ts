"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db/client";
import { appointments, payments, services } from "@/db/schema";
import { getIdentity } from "@/auth/session";
import { parseOrThrow, formObject, type ActionState } from "@/domain/forms";
import { toActionError, NotFoundError, ValidationError } from "@/domain/errors";
import { paymentsEnabled } from "@/env";
import {
  createBookingOp,
  cancelAppointmentOp,
  rescheduleAppointmentOp,
} from "./operations";
import { createSeriesOp, materializeAllSeries } from "@/domain/series/operations";
import { consumeCreditOp, refundCreditOp } from "@/domain/memberships/operations";
import { promoteForSlot } from "@/domain/waitlist/operations";
import { createDepositCheckout } from "@/stripe/checkout";
import { stripe } from "@/stripe/client";

const createBookingSchema = z.object({
  barberId: z.string().uuid(),
  serviceId: z.string().uuid(),
  startAt: z.string().datetime({ offset: true }).or(z.string().datetime()),
  saveCard: z.string().optional(),
  /** "0" = one-off; otherwise repeat every N weeks. */
  cadenceWeeks: z.coerce.number().int().min(0).max(12).default(0),
  useCredit: z.string().optional(),
});

/**
 * Client booking action: insert the hold (the exclusion constraint is the
 * lock), then either redirect to Stripe Checkout for the deposit or - in
 * pay-at-shop mode - straight to the confirmation page.
 */
export async function createBookingAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  let redirectTo: string;
  try {
    const identity = await getIdentity();
    const input = parseOrThrow(createBookingSchema, formObject(formData));

    // Membership path: consume a credit first (row-locked, overdraft-guarded),
    // then insert. A slot conflict returns the credit.
    let creditId: string | undefined;
    if (input.useCredit === "on") {
      creditId = await consumeCreditOp(identity.userId);
    }

    let booking;
    try {
      booking = await createBookingOp({
        clientId: identity.userId,
        barberId: input.barberId,
        serviceId: input.serviceId,
        startAt: new Date(input.startAt),
        ...(creditId ? { creditId } : {}),
      });
    } catch (err) {
      if (creditId) await refundCreditOp(creditId);
      throw err;
    }

    if (input.cadenceWeeks > 0) {
      await createSeriesOp({
        clientId: identity.userId,
        barberId: input.barberId,
        serviceId: input.serviceId,
        cadenceWeeks: input.cadenceWeeks,
        anchorStartUtc: new Date(input.startAt),
      });
      // Any non-Stripe booking (confirmed member or reserved non-member)
      // books the horizon immediately. The Stripe deposit path materializes
      // from the webhook after the card is saved.
      if (booking.status !== "pending_deposit") {
        await materializeAllSeries();
      }
    }

    if (booking.status === "pending_deposit") {
      const [service] = await db
        .select()
        .from(services)
        .where(eq(services.id, input.serviceId));
      if (!service) throw new NotFoundError("Service not found.");
      redirectTo = await createDepositCheckout({
        appointmentId: booking.id,
        clientId: identity.userId,
        depositCents: booking.depositCents,
        serviceName: service.name,
        holdExpiresAt: new Date(Date.now() + 31 * 60_000),
        // A repeating booking always saves the card - the series engine needs
        // it for off-session deposits on future occurrences.
        saveCard: input.saveCard === "on" || input.cadenceWeeks > 0,
      });
    } else {
      redirectTo = `/book/confirmation?appointment=${booking.id}`;
    }
  } catch (err) {
    return { ok: false, error: toActionError(err) };
  }
  redirect(redirectTo);
}

const cancelSchema = z.object({ appointmentId: z.string().uuid() });

/** Client-initiated cancel; refunds the deposit when inside policy. */
export async function cancelBookingAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  try {
    const identity = await getIdentity();
    const input = parseOrThrow(cancelSchema, formObject(formData));

    const outcome = await cancelAppointmentOp({
      appointmentId: input.appointmentId,
      clientId: identity.role === "admin" ? null : identity.userId,
    });

    let detail = "Appointment canceled.";
    if (outcome.creditId) {
      await refundCreditOp(outcome.creditId);
      detail = "Appointment canceled - your membership credit was returned.";
    }
    if (outcome.refundDue && paymentsEnabled && outcome.stripePaymentIntentId) {
      const refund = await stripe().refunds.create({
        payment_intent: outcome.stripePaymentIntentId,
      });
      await db.insert(payments).values({
        appointmentId: input.appointmentId,
        clientId: identity.role === "admin" ? null : identity.userId,
        type: "refund",
        amountCents: -outcome.depositCents,
        status: "succeeded",
        stripePaymentIntentId: outcome.stripePaymentIntentId,
        stripeRefundId: refund.id,
      });
      detail = "Appointment canceled - your deposit will be refunded.";
    } else if (outcome.depositCents > 0 && outcome.stripePaymentIntentId) {
      detail = "Appointment canceled. The deposit is not refundable this close to the appointment.";
    }

    // The slot is now free - auto-book the highest-priority waiter, if any.
    await promoteForSlot(outcome.barberId, outcome.startAt);

    revalidatePath("/account");
    revalidatePath("/admin");
    return { ok: true, detail };
  } catch (err) {
    return { ok: false, error: toActionError(err) };
  }
}

const rescheduleSchema = z.object({
  appointmentId: z.string().uuid(),
  startAt: z.string().datetime({ offset: true }).or(z.string().datetime()),
});

/** Client moves an appointment to a new time; the old slot auto-promotes. */
export async function rescheduleBookingAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  try {
    const identity = await getIdentity();
    const input = parseOrThrow(rescheduleSchema, formObject(formData));
    const outcome = await rescheduleAppointmentOp({
      appointmentId: input.appointmentId,
      clientId: identity.role === "admin" ? null : identity.userId,
      newStartAt: new Date(input.startAt),
    });
    // The vacated slot is now free - auto-book the next waiter.
    await promoteForSlot(outcome.oldBarberId, outcome.oldStartAt);
    revalidatePath("/account");
    revalidatePath("/admin");
    return { ok: true, detail: "Appointment rescheduled." };
  } catch (err) {
    return { ok: false, error: toActionError(err) };
  }
}

const confirmSchema = z.object({ appointmentId: z.string().uuid() });

/**
 * Client confirms they will attend a `reserved` (non-member, no-deposit) slot,
 * locking it down. Only the owner, only before start, only while reserved.
 */
export async function confirmAttendanceAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  try {
    const identity = await getIdentity();
    const input = parseOrThrow(confirmSchema, formObject(formData));
    const [appt] = await db
      .select()
      .from(appointments)
      .where(
        and(
          eq(appointments.id, input.appointmentId),
          eq(appointments.clientId, identity.userId),
        ),
      );
    if (!appt) throw new NotFoundError("Appointment not found.");
    if (appt.status !== "reserved") {
      throw new ValidationError("This appointment does not need confirmation.");
    }
    if (appt.startAt.getTime() <= Date.now()) {
      throw new ValidationError("This appointment has already started.");
    }
    await db
      .update(appointments)
      .set({ status: "confirmed", attendanceConfirmedAt: new Date() })
      .where(eq(appointments.id, appt.id));

    revalidatePath("/account");
    revalidatePath("/admin");
    return { ok: true, detail: "Attendance confirmed - your spot is locked in." };
  } catch (err) {
    return { ok: false, error: toActionError(err) };
  }
}
