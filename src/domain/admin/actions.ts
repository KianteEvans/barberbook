"use server";

import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db/client";
import {
  availabilityExceptions,
  availabilityRules,
  services,
  shopSettings,
} from "@/db/schema";
import { getAdminIdentity } from "@/auth/session";
import { parseOrThrow, formObject, type ActionState } from "@/domain/forms";
import { toActionError, ValidationError } from "@/domain/errors";

/** Admin CRUD actions: services, weekly hours, time off, shop policy. */

const serviceSchema = z.object({
  id: z.string().uuid().optional(),
  name: z.string().min(1, "Name is required."),
  description: z.string().optional(),
  durationMin: z.coerce.number().int().min(5, "Duration must be at least 5 minutes."),
  priceCents: z.coerce.number().int().min(0),
  depositCents: z.coerce.number().int().min(0).optional(),
  active: z.string().optional(),
});

export async function upsertServiceAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  try {
    await getAdminIdentity();
    const input = parseOrThrow(serviceSchema, formObject(formData));
    const values = {
      name: input.name,
      description: input.description || null,
      durationMin: input.durationMin,
      priceCents: input.priceCents,
      depositCents: input.depositCents ?? null,
      active: input.active !== "off",
    };
    if (input.id) {
      await db.update(services).set(values).where(eq(services.id, input.id));
    } else {
      await db.insert(services).values(values);
    }
    revalidatePath("/admin/services");
    return { ok: true, detail: `Service "${input.name}" saved.` };
  } catch (err) {
    return { ok: false, error: toActionError(err) };
  }
}

const weeklyHoursSchema = z.object({
  barberId: z.string().uuid(),
  // Six pipe-separated "start-end" ranges in minutes, empty = closed, keyed
  // by weekday order Sun..Sat (see the hours form).
  hours: z.string(),
});

export async function saveWeeklyHoursAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  try {
    await getAdminIdentity();
    const raw = formObject(formData);
    const input = parseOrThrow(weeklyHoursSchema, raw);

    const rows: Array<{ barberId: string; weekday: number; startMin: number; endMin: number }> =
      [];
    const dayFields = input.hours.split("|");
    if (dayFields.length !== 7) throw new ValidationError("Malformed hours payload.");
    dayFields.forEach((field, weekday) => {
      const trimmed = field.trim();
      if (!trimmed) return;
      const m = /^(\d{1,2}):(\d{2})-(\d{1,2}):(\d{2})$/.exec(trimmed);
      if (!m) {
        throw new ValidationError(
          "Hours must look like 9:00-18:00 (or be blank for closed).",
        );
      }
      const startMin = Number(m[1]) * 60 + Number(m[2]);
      const endMin = Number(m[3]) * 60 + Number(m[4]);
      if (endMin <= startMin) throw new ValidationError("End must be after start.");
      rows.push({ barberId: input.barberId, weekday, startMin, endMin });
    });

    await db.transaction(async (tx) => {
      await tx
        .delete(availabilityRules)
        .where(eq(availabilityRules.barberId, input.barberId));
      if (rows.length > 0) await tx.insert(availabilityRules).values(rows);
    });

    revalidatePath("/admin/hours");
    return { ok: true, detail: "Weekly hours saved." };
  } catch (err) {
    return { ok: false, error: toActionError(err) };
  }
}

const timeOffSchema = z.object({
  barberId: z.string().uuid(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Pick a date."),
});

export async function addTimeOffAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  try {
    await getAdminIdentity();
    const input = parseOrThrow(timeOffSchema, formObject(formData));
    await db
      .insert(availabilityExceptions)
      .values({ barberId: input.barberId, date: input.date, kind: "off" })
      .onConflictDoNothing();
    revalidatePath("/admin/hours");
    return { ok: true, detail: `Time off added for ${input.date}.` };
  } catch (err) {
    return { ok: false, error: toActionError(err) };
  }
}

const removeTimeOffSchema = z.object({ id: z.string().uuid() });

export async function removeTimeOffAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  try {
    await getAdminIdentity();
    const input = parseOrThrow(removeTimeOffSchema, formObject(formData));
    await db.delete(availabilityExceptions).where(eq(availabilityExceptions.id, input.id));
    revalidatePath("/admin/hours");
    return { ok: true, detail: "Time off removed." };
  } catch (err) {
    return { ok: false, error: toActionError(err) };
  }
}

const policySchema = z.object({
  cancellationWindowHours: z.coerce.number().int().min(0).max(168),
  depositMode: z.enum(["fixed", "percent"]),
  depositValue: z.coerce.number().int().min(0),
  noShowFeeCents: z.coerce.number().int().min(0),
});

export async function savePolicyAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  try {
    await getAdminIdentity();
    const input = parseOrThrow(policySchema, formObject(formData));
    await db.update(shopSettings).set(input).where(eq(shopSettings.id, 1));
    revalidatePath("/admin");
    return { ok: true, detail: "Policy saved." };
  } catch (err) {
    return { ok: false, error: toActionError(err) };
  }
}
