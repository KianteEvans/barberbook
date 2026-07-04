"use server";

import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db/client";
import { testimonials } from "@/db/schema";
import { getAdminIdentity } from "@/auth/session";
import { parseOrThrow, formObject, type ActionState } from "@/domain/forms";
import { toActionError } from "@/domain/errors";

/** Admin CRUD for customer testimonials shown on the gallery page. */

function revalidateTestimonials(): void {
  revalidatePath("/gallery");
  revalidatePath("/admin/testimonials");
}

const testimonialSchema = z.object({
  id: z.string().uuid().optional(),
  authorName: z.string().trim().min(1, "Author name is required.").max(80),
  quote: z.string().trim().min(1, "Quote is required.").max(600),
  // Empty string -> no rating; otherwise 1-5.
  rating: z
    .string()
    .optional()
    .transform((v) => (v && v.trim() !== "" ? Number(v) : null))
    .refine((v) => v === null || (Number.isInteger(v) && v >= 1 && v <= 5), {
      message: "Rating must be 1 to 5.",
    }),
  barberId: z
    .string()
    .optional()
    .transform((v) => (v && v.trim() !== "" ? v : null)),
  featured: z.string().optional(),
  sortOrder: z.coerce.number().int().min(0).max(999).optional(),
});

export async function upsertTestimonialAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  try {
    await getAdminIdentity();
    const input = parseOrThrow(testimonialSchema, formObject(formData));
    const values = {
      authorName: input.authorName,
      quote: input.quote,
      rating: input.rating,
      barberId: input.barberId,
      featured: input.featured !== "off",
      sortOrder: input.sortOrder ?? 0,
    };
    if (input.id) {
      await db.update(testimonials).set(values).where(eq(testimonials.id, input.id));
    } else {
      await db.insert(testimonials).values(values);
    }
    revalidateTestimonials();
    return { ok: true, detail: `Testimonial from ${input.authorName} saved.` };
  } catch (err) {
    return { ok: false, error: toActionError(err) };
  }
}

const deleteSchema = z.object({ id: z.string().uuid() });

export async function deleteTestimonialAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  try {
    await getAdminIdentity();
    const input = parseOrThrow(deleteSchema, formObject(formData));
    await db.delete(testimonials).where(eq(testimonials.id, input.id));
    revalidateTestimonials();
    return { ok: true, detail: "Testimonial removed." };
  } catch (err) {
    return { ok: false, error: toActionError(err) };
  }
}
