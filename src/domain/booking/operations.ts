import { and, eq } from "drizzle-orm";
import { db, isSlotTakenError } from "@/db/client";
import { appointments } from "@/db/schema";
import { computeDeposit, refundEligibility } from "@/domain/payments/deposit";
import { resolveBarberService } from "@/domain/barbers/operations";
import { loadSettings } from "./load";
import { ConflictError, NotFoundError, ValidationError } from "@/domain/errors";
import { paymentsEnabled } from "@/env";
import {
  chooseTier,
  graceForTier,
  statusForTier,
  type HoldTier,
} from "./grace";

/**
 * Booking mutations. The gist exclusion constraint is the double-booking
 * arbiter: we INSERT and translate SQLSTATE 23P01 into a friendly conflict
 * error instead of pre-checking.
 */

export const HOLD_MINUTES = 30;

export interface CreateBookingInput {
  readonly clientId: string;
  readonly barberId: string;
  readonly serviceId: string;
  readonly startAt: Date;
  /** Set when a membership credit covers this visit: no deposit, no balance. */
  readonly creditId?: string;
}

export interface CreatedBooking {
  readonly id: string;
  readonly status: "pending_deposit" | "confirmed" | "reserved";
  readonly tier: HoldTier;
  readonly depositCents: number;
  readonly remainderCents: number;
  readonly startAt: Date;
  readonly endAt: Date;
}

/**
 * Insert the appointment. With Stripe configured it lands as pending_deposit
 * with a hold expiry (the caller then creates a Checkout Session); in
 * "pay at shop" mode it confirms immediately.
 */
export async function createBookingOp(
  input: CreateBookingInput,
): Promise<CreatedBooking> {
  const settings = await loadSettings();
  // Resolves the barber's effective price and rejects (barber, service)
  // pairs the barber does not offer.
  const service = await resolveBarberService(input.barberId, input.serviceId);
  if (input.startAt.getTime() <= Date.now()) {
    throw new ValidationError("That time is in the past.");
  }

  const covered = input.creditId !== undefined;
  const { depositCents, remainderCents } = covered
    ? { depositCents: 0, remainderCents: 0 }
    : computeDeposit(service, settings);
  const endAt = new Date(input.startAt.getTime() + service.durationMin * 60_000);
  const online = !covered && paymentsEnabled && depositCents > 0;

  // Lock tier drives the initial status, grace, and confirmation deadline:
  //   member  -> confirmed, 15-min grace, no confirmation needed
  //   deposit -> pending_deposit (Stripe), 10-min grace, "in the chair"
  //   unconfirmed -> reserved, must confirm by start - confirmation_window
  const tier = chooseTier(covered, online);
  const status = statusForTier(tier);
  const graceMinutes = graceForTier(tier, settings);
  const confirmationDeadline =
    tier === "unconfirmed"
      ? new Date(
          input.startAt.getTime() - settings.confirmationWindowMinutes * 60_000,
        )
      : null;

  try {
    const [row] = await db
      .insert(appointments)
      .values({
        clientId: input.clientId,
        barberId: input.barberId,
        serviceId: input.serviceId,
        startAt: input.startAt,
        endAt,
        status,
        holdExpiresAt:
          status === "pending_deposit"
            ? new Date(Date.now() + HOLD_MINUTES * 60_000)
            : null,
        depositCents,
        remainderCents,
        creditId: input.creditId ?? null,
        holdTier: tier,
        graceMinutes,
        confirmationDeadline,
      })
      .returning();
    if (!row) throw new Error("insert failed");
    return {
      id: row.id,
      status,
      tier,
      depositCents,
      remainderCents,
      startAt: row.startAt,
      endAt: row.endAt,
    };
  } catch (err) {
    if (isSlotTakenError(err)) {
      throw new ConflictError(
        "That slot was just taken. Please pick another time.",
      );
    }
    throw err;
  }
}

export interface CancelOutcome {
  readonly refundDue: boolean;
  readonly depositCents: number;
  readonly stripePaymentIntentId: string | null;
  /** Membership credit to return, when the visit was credit-covered. */
  readonly creditId: string | null;
}

/**
 * Cancel a live appointment. Returns whether the deposit should be refunded
 * per the cancellation window; the caller (action) performs the Stripe refund.
 */
export async function cancelAppointmentOp({
  appointmentId,
  clientId,
  now = new Date(),
}: {
  appointmentId: string;
  /** When set, enforce ownership (client-initiated cancel). Admin passes null. */
  clientId: string | null;
  now?: Date;
}): Promise<CancelOutcome> {
  const settings = await loadSettings();
  const where = clientId
    ? and(eq(appointments.id, appointmentId), eq(appointments.clientId, clientId))
    : eq(appointments.id, appointmentId);
  const [appt] = await db.select().from(appointments).where(where);
  if (!appt) throw new NotFoundError("Appointment not found.");
  if (
    appt.status !== "confirmed" &&
    appt.status !== "pending_deposit" &&
    appt.status !== "reserved"
  ) {
    throw new ValidationError("This appointment can no longer be canceled.");
  }

  await db
    .update(appointments)
    .set({
      status: "canceled",
      canceledAt: now,
      cancelReason: clientId ? "client" : "admin",
    })
    .where(eq(appointments.id, appt.id));

  const refundDue =
    appt.status === "confirmed" &&
    appt.depositCents > 0 &&
    appt.stripePaymentIntentId !== null &&
    refundEligibility(appt.startAt, now, settings.cancellationWindowHours) ===
      "full_refund";

  return {
    refundDue,
    depositCents: appt.depositCents,
    stripePaymentIntentId: appt.stripePaymentIntentId,
    creditId: appt.creditId,
  };
}
