"use server";

import { revalidatePath } from "next/cache";
import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db/client";
import { availabilityExceptions, availabilityRules } from "@/db/schema";
import { getBarberIdentity } from "@/auth/session";
import { parseOrThrow, formObject, type ActionState } from "@/domain/forms";
import { toActionError, ForbiddenError } from "@/domain/errors";
import { parseWeeklyHours } from "@/domain/availability/hours";
import { resolveBarberForUser } from "./operations";

/**
 * Barber self-service: a barber edits their OWN weekly hours and time off.
 * The barber_id is always derived server-side from the session, never taken
 * from the form, so a barber can never touch another chair's schedule.
 */
async function requireMyBarberId(): Promise<string> {
  const identity = await getBarberIdentity();
  const barber = await resolveBarberForUser(identity.userId);
  if (!barber) throw new ForbiddenError();
  return barber.id;
}

const hoursSchema = z.object({ hours: z.string() });

export async function saveMyHoursAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  try {
    const barberId = await requireMyBarberId();
    const input = parseOrThrow(hoursSchema, formObject(formData));
    const rows = parseWeeklyHours(input.hours).map((r) => ({ barberId, ...r }));
    await db.transaction(async (tx) => {
      await tx.delete(availabilityRules).where(eq(availabilityRules.barberId, barberId));
      if (rows.length > 0) await tx.insert(availabilityRules).values(rows);
    });
    revalidatePath("/chair");
    return { ok: true, detail: "Weekly hours saved." };
  } catch (err) {
    return { ok: false, error: toActionError(err) };
  }
}

const timeOffSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Pick a date."),
});

export async function addMyTimeOffAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  try {
    const barberId = await requireMyBarberId();
    const input = parseOrThrow(timeOffSchema, formObject(formData));
    await db
      .insert(availabilityExceptions)
      .values({ barberId, date: input.date, kind: "off" })
      .onConflictDoNothing();
    revalidatePath("/chair");
    return { ok: true, detail: `Time off added for ${input.date}.` };
  } catch (err) {
    return { ok: false, error: toActionError(err) };
  }
}

const removeSchema = z.object({ id: z.string().uuid() });

export async function removeMyTimeOffAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  try {
    const barberId = await requireMyBarberId();
    const input = parseOrThrow(removeSchema, formObject(formData));
    // Ownership-scoped delete: the row must belong to this barber.
    await db
      .delete(availabilityExceptions)
      .where(
        and(
          eq(availabilityExceptions.id, input.id),
          eq(availabilityExceptions.barberId, barberId),
        ),
      );
    revalidatePath("/chair");
    return { ok: true, detail: "Time off removed." };
  } catch (err) {
    return { ok: false, error: toActionError(err) };
  }
}
