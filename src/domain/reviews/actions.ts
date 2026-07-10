"use server";

import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db/client";
import { reviews } from "@/db/schema";
import { getIdentity, getAdminIdentity } from "@/auth/session";
import { parseOrThrow, formObject, type ActionState } from "@/domain/forms";
import { toActionError, NotFoundError, ValidationError } from "@/domain/errors";
import { hasReview, loadReviewableAppointment } from "./operations";

const submitSchema = z.object({
  appointmentId: z.string().uuid(),
  rating: z.coerce.number().int().min(1).max(5),
  comment: z.string().trim().max(600).optional(),
});

/** Client submits a review for a completed appointment (one per visit). */
export async function submitReviewAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  try {
    const identity = await getIdentity();
    const input = parseOrThrow(submitSchema, formObject(formData));
    const appt = await loadReviewableAppointment(input.appointmentId, identity.userId);
    if (!appt) throw new NotFoundError("No completed visit to review here.");
    if (await hasReview(input.appointmentId)) {
      throw new ValidationError("You already reviewed this visit.");
    }
    await db.insert(reviews).values({
      appointmentId: input.appointmentId,
      clientId: identity.userId,
      barberId: appt.barberId,
      rating: input.rating,
      comment: input.comment || null,
    });
    revalidatePath("/account");
    revalidatePath("/admin/testimonials");
    return { ok: true, detail: "Thanks - your review is pending approval." };
  } catch (err) {
    return { ok: false, error: toActionError(err) };
  }
}

const moderateSchema = z.object({ reviewId: z.string().uuid() });

async function setStatus(
  formData: FormData,
  status: "approved" | "rejected",
): Promise<ActionState> {
  await getAdminIdentity();
  const input = parseOrThrow(moderateSchema, formObject(formData));
  await db.update(reviews).set({ status }).where(eq(reviews.id, input.reviewId));
  revalidatePath("/admin/testimonials");
  revalidatePath("/gallery");
  return { ok: true, detail: `Review ${status}.` };
}

export async function approveReviewAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  try {
    return await setStatus(formData, "approved");
  } catch (err) {
    return { ok: false, error: toActionError(err) };
  }
}

export async function rejectReviewAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  try {
    return await setStatus(formData, "rejected");
  } catch (err) {
    return { ok: false, error: toActionError(err) };
  }
}
