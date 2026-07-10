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
import { deleteUpload, saveUpload } from "@/domain/barbers/uploads";
import { BACKDROPS } from "@/domain/backdrops";
import { parseWeeklyHours } from "@/domain/availability/hours";
import { SLOT_GRANULARITIES, TIMEZONES } from "@/domain/shop-options";

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

    const rows = parseWeeklyHours(input.hours).map((r) => ({
      barberId: input.barberId,
      ...r,
    }));

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

const shopDetailsSchema = z.object({
  shopName: z.string().trim().min(1, "Shop name is required.").max(60),
  timezone: z.enum(TIMEZONES),
  slotGranularityMin: z.coerce
    .number()
    .int()
    .refine((v) => (SLOT_GRANULARITIES as readonly number[]).includes(v), {
      message: "Pick a supported slot interval.",
    }),
  bufferMin: z.coerce.number().int().min(0).max(60),
});

/** Shop identity + scheduling grain (name, timezone, slot size, buffer). */
export async function saveShopDetailsAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  try {
    await getAdminIdentity();
    const input = parseOrThrow(shopDetailsSchema, formObject(formData));
    await db.update(shopSettings).set(input).where(eq(shopSettings.id, 1));
    // Shop name shows in the footer/hero everywhere; slot grain affects booking.
    revalidatePath("/", "layout");
    revalidatePath("/admin/settings");
    return { ok: true, detail: "Shop details saved." };
  } catch (err) {
    return { ok: false, error: toActionError(err) };
  }
}

const policySchema = z.object({
  cancellationWindowHours: z.coerce.number().int().min(0).max(168),
  depositMode: z.enum(["fixed", "percent"]),
  depositValue: z.coerce.number().int().min(0),
  noShowFeeCents: z.coerce.number().int().min(0),
  backdrop: z.enum(BACKDROPS),
  memberGraceMinutes: z.coerce.number().int().min(0).max(120),
  depositGraceMinutes: z.coerce.number().int().min(0).max(120),
  confirmationWindowMinutes: z.coerce.number().int().min(0).max(240),
  loyaltyEveryN: z.coerce.number().int().min(0).max(50),
});

export async function savePolicyAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  try {
    await getAdminIdentity();
    const input = parseOrThrow(policySchema, formObject(formData));
    await db.update(shopSettings).set(input).where(eq(shopSettings.id, 1));
    revalidatePath("/");
    revalidatePath("/admin");
    revalidatePath("/admin/settings");
    return { ok: true, detail: "Settings saved." };
  } catch (err) {
    return { ok: false, error: toActionError(err) };
  }
}

/** Upload/replace the landing hero photo (reuses the barber-photo storage). */
export async function saveHeroAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  try {
    await getAdminIdentity();
    const photo = formData.get("photo");
    if (!(photo instanceof File) || photo.size === 0) {
      throw new ValidationError("Choose an image to upload.");
    }
    const fileName = await saveUpload(photo);
    const [existing] = await db
      .select({ heroFile: shopSettings.heroFile })
      .from(shopSettings)
      .where(eq(shopSettings.id, 1));
    await db
      .update(shopSettings)
      .set({ heroFile: fileName })
      .where(eq(shopSettings.id, 1));
    if (existing?.heroFile) await deleteUpload(existing.heroFile);
    revalidatePath("/");
    revalidatePath("/admin/settings");
    return { ok: true, detail: "Hero photo updated." };
  } catch (err) {
    return { ok: false, error: toActionError(err) };
  }
}

export async function removeHeroAction(
  _prev: ActionState,
  _formData: FormData,
): Promise<ActionState> {
  try {
    await getAdminIdentity();
    const [existing] = await db
      .select({ heroFile: shopSettings.heroFile })
      .from(shopSettings)
      .where(eq(shopSettings.id, 1));
    await db
      .update(shopSettings)
      .set({ heroFile: null })
      .where(eq(shopSettings.id, 1));
    if (existing?.heroFile) await deleteUpload(existing.heroFile);
    revalidatePath("/");
    revalidatePath("/admin/settings");
    return { ok: true, detail: "Hero photo removed." };
  } catch (err) {
    return { ok: false, error: toActionError(err) };
  }
}
