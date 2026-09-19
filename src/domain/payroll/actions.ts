"use server";

import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db/client";
import { barbers } from "@/db/schema";
import { getAdminIdentity } from "@/auth/session";
import { parseOrThrow, formObject, type ActionState } from "@/domain/forms";
import { toActionError, ValidationError } from "@/domain/errors";
import { finalizePayoutOp, type PeriodBounds } from "./operations";

/** Compensation setup and payout finalization. Admin only - this is payroll. */

const compSchema = z.object({
  barberId: z.string().uuid(),
  compType: z.enum(["none", "commission", "booth_rent", "hourly"]),
  commissionPct: z.coerce.number().int().min(0).max(100).optional(),
  boothRentDollars: z.coerce.number().min(0).max(100_000).optional(),
  boothRentPeriod: z.enum(["weekly", "monthly"]).optional(),
  hourlyDollars: z.coerce.number().min(0).max(1_000).optional(),
});

export async function saveCompensationAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  try {
    await getAdminIdentity();
    const input = parseOrThrow(compSchema, formObject(formData));

    // Only keep the numbers that belong to the chosen model, so a leftover
    // value from a previous setup can never quietly affect pay.
    await db
      .update(barbers)
      .set({
        compType: input.compType,
        commissionPct: input.compType === "commission" ? (input.commissionPct ?? 0) : null,
        boothRentCents:
          input.compType === "booth_rent"
            ? Math.round((input.boothRentDollars ?? 0) * 100)
            : null,
        boothRentPeriod:
          input.compType === "booth_rent" ? (input.boothRentPeriod ?? "weekly") : null,
        hourlyCents:
          input.compType === "hourly" ? Math.round((input.hourlyDollars ?? 0) * 100) : null,
      })
      .where(eq(barbers.id, input.barberId));

    revalidatePath("/admin/payouts");
    revalidatePath("/admin/barbers");
    return { ok: true, detail: "Pay setup saved." };
  } catch (err) {
    return { ok: false, error: toActionError(err) };
  }
}

const DATE = /^\d{4}-\d{2}-\d{2}$/;
const finalizeSchema = z.object({
  barberId: z.string().uuid(),
  start: z.string().regex(DATE),
  end: z.string().regex(DATE),
});

export async function finalizePayoutAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  try {
    await getAdminIdentity();
    const input = parseOrThrow(finalizeSchema, formObject(formData));
    if (input.end < input.start) throw new ValidationError("That period ends before it starts.");

    const bounds: PeriodBounds = {
      start: input.start,
      end: input.end,
      startUtc: new Date(`${input.start}T00:00:00.000Z`),
      // Exclusive upper bound: the day after the last day.
      endUtc: new Date(new Date(`${input.end}T00:00:00.000Z`).getTime() + 86_400_000),
    };
    await finalizePayoutOp(input.barberId, bounds);

    revalidatePath("/admin/payouts");
    revalidatePath("/chair");
    return { ok: true, detail: "Payout marked paid." };
  } catch (err) {
    return { ok: false, error: toActionError(err) };
  }
}
