"use server";

import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db/client";
import { discountCodes } from "@/db/schema";
import { getAdminIdentity } from "@/auth/session";
import { parseOrThrow, formObject, type ActionState } from "@/domain/forms";
import { toActionError, ValidationError } from "@/domain/errors";

/** Admin promo-code CRUD. Codes are stored uppercased for case-insensitivity. */

const codeSchema = z.object({
  code: z
    .string()
    .trim()
    .min(2, "Code is required.")
    .max(40)
    .regex(/^[A-Za-z0-9]+$/, "Use letters and numbers only."),
  kind: z.enum(["percent", "fixed"]),
  // Percent (1-100) or dollars; converted to the stored unit below.
  amountValue: z.coerce.number().positive("Enter an amount."),
  maxUses: z.coerce.number().int().min(1).optional(),
  expiresAt: z.string().optional(),
});

export async function createDiscountCodeAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  try {
    await getAdminIdentity();
    const input = parseOrThrow(codeSchema, formObject(formData));

    const amount =
      input.kind === "fixed"
        ? Math.round(input.amountValue * 100) // dollars -> cents
        : Math.round(input.amountValue); // whole percent
    if (input.kind === "percent" && (amount < 1 || amount > 100)) {
      throw new ValidationError("Percent must be between 1 and 100.");
    }

    const code = input.code.toUpperCase();
    const expiresAt = input.expiresAt ? new Date(input.expiresAt) : null;
    if (expiresAt && Number.isNaN(expiresAt.getTime())) {
      throw new ValidationError("Expiry date is invalid.");
    }

    try {
      await db.insert(discountCodes).values({
        code,
        kind: input.kind,
        amount,
        maxUses: input.maxUses ?? null,
        expiresAt,
      });
    } catch {
      throw new ValidationError(`Code "${code}" already exists.`);
    }

    revalidatePath("/admin/promotions");
    return { ok: true, detail: `Code "${code}" created.` };
  } catch (err) {
    return { ok: false, error: toActionError(err) };
  }
}

const toggleSchema = z.object({ id: z.string().uuid(), active: z.string() });

export async function toggleDiscountCodeAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  try {
    await getAdminIdentity();
    const input = parseOrThrow(toggleSchema, formObject(formData));
    const active = input.active === "true";
    await db
      .update(discountCodes)
      .set({ active })
      .where(eq(discountCodes.id, input.id));
    revalidatePath("/admin/promotions");
    return { ok: true, detail: active ? "Code enabled." : "Code disabled." };
  } catch (err) {
    return { ok: false, error: toActionError(err) };
  }
}

const deleteSchema = z.object({ id: z.string().uuid() });

export async function deleteDiscountCodeAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  try {
    await getAdminIdentity();
    const input = parseOrThrow(deleteSchema, formObject(formData));
    await db.delete(discountCodes).where(eq(discountCodes.id, input.id));
    revalidatePath("/admin/promotions");
    return { ok: true, detail: "Code deleted." };
  } catch (err) {
    return { ok: false, error: toActionError(err) };
  }
}
