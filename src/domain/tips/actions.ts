"use server";

import { revalidatePath } from "next/cache";
import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db/client";
import { appointments, payments } from "@/db/schema";
import { getIdentity } from "@/auth/session";
import { parseOrThrow, formObject, type ActionState } from "@/domain/forms";
import { toActionError, NotFoundError, ValidationError } from "@/domain/errors";
import { paymentsEnabled } from "@/env";
import { chargeSavedCard } from "@/domain/admin/appointment-actions";
import { formatMoney } from "@/domain/money";

const tipSchema = z.object({
  appointmentId: z.string().uuid(),
  amountCents: z.coerce.number().int().min(100, "Tip must be at least $1.").max(100000),
});

/**
 * Client adds a tip after a completed visit. With Stripe + a saved card it is
 * charged off-session; otherwise it is recorded as collected at the shop.
 * One tip per appointment.
 */
export async function addTipAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  try {
    const identity = await getIdentity();
    const input = parseOrThrow(tipSchema, formObject(formData));

    const [appt] = await db
      .select({ id: appointments.id })
      .from(appointments)
      .where(
        and(
          eq(appointments.id, input.appointmentId),
          eq(appointments.clientId, identity.userId),
          eq(appointments.status, "completed"),
        ),
      );
    if (!appt) throw new NotFoundError("No completed visit to tip here.");

    const [existing] = await db
      .select({ id: payments.id })
      .from(payments)
      .where(
        and(eq(payments.appointmentId, appt.id), eq(payments.type, "tip")),
      );
    if (existing) throw new ValidationError("You already tipped this visit.");

    if (paymentsEnabled) {
      const charge = await chargeSavedCard({
        clientId: identity.userId,
        appointmentId: appt.id,
        amountCents: input.amountCents,
        type: "tip",
        description: "Tip",
      });
      if (!charge.ok) {
        // Fall back to recording it as collected at the shop.
        await db.insert(payments).values({
          appointmentId: appt.id,
          clientId: identity.userId,
          type: "tip",
          amountCents: input.amountCents,
          status: "succeeded",
          failureMessage: "Collected at shop (card charge unavailable).",
        });
      }
    } else {
      await db.insert(payments).values({
        appointmentId: appt.id,
        clientId: identity.userId,
        type: "tip",
        amountCents: input.amountCents,
        status: "succeeded",
      });
    }

    revalidatePath("/account");
    revalidatePath("/admin/payments");
    return { ok: true, detail: `Thanks for the ${formatMoney(input.amountCents)} tip!` };
  } catch (err) {
    return { ok: false, error: toActionError(err) };
  }
}
