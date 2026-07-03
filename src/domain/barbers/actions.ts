"use server";

import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db/client";
import { barberPhotos, barberServices, barbers } from "@/db/schema";
import { getAdminIdentity } from "@/auth/session";
import { parseOrThrow, formObject, type ActionState } from "@/domain/forms";
import { toActionError, NotFoundError, ValidationError } from "@/domain/errors";
import { deleteUpload, saveUpload } from "./uploads";

/** Admin actions for barber profiles, offerings, and work photos. */

function revalidateBarberPages(): void {
  revalidatePath("/admin/barbers");
  revalidatePath("/barbers");
  revalidatePath("/");
}

const barberSchema = z.object({
  id: z.string().uuid().optional(),
  displayName: z.string().min(1, "Name is required."),
  tagline: z.string().optional(),
  bio: z.string().optional(),
  specialties: z.string().optional(),
  active: z.string().optional(),
});

export async function upsertBarberAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  try {
    await getAdminIdentity();
    const input = parseOrThrow(barberSchema, formObject(formData));

    // Optional profile photo upload alongside the text fields.
    const photo = formData.get("photo");
    let photoFile: string | undefined;
    if (photo instanceof File && photo.size > 0) {
      photoFile = await saveUpload(photo);
    }

    const values = {
      displayName: input.displayName,
      tagline: input.tagline || null,
      bio: input.bio || null,
      specialties: input.specialties || null,
      active: input.active !== "off",
      ...(photoFile ? { photoFile } : {}),
    };

    if (input.id) {
      const [existing] = await db
        .select({ photoFile: barbers.photoFile })
        .from(barbers)
        .where(eq(barbers.id, input.id));
      if (!existing) throw new NotFoundError("Barber not found.");
      await db.update(barbers).set(values).where(eq(barbers.id, input.id));
      if (photoFile && existing.photoFile) await deleteUpload(existing.photoFile);
    } else {
      await db.insert(barbers).values(values);
    }

    revalidateBarberPages();
    return { ok: true, detail: `Saved ${input.displayName}.` };
  } catch (err) {
    return { ok: false, error: toActionError(err) };
  }
}

const offeringsSchema = z.object({
  barberId: z.string().uuid(),
  // Pipe-separated "serviceId=cents" entries; empty cents = shop price.
  offerings: z.string(),
});

export async function saveBarberServicesAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  try {
    await getAdminIdentity();
    const input = parseOrThrow(offeringsSchema, formObject(formData));

    const rows: Array<{ barberId: string; serviceId: string; priceCents: number | null }> =
      [];
    for (const entry of input.offerings.split("|")) {
      if (!entry.trim()) continue;
      const m = /^([0-9a-f-]{36})=(\d*)$/.exec(entry.trim());
      if (!m) throw new ValidationError("Malformed offerings payload.");
      rows.push({
        barberId: input.barberId,
        serviceId: m[1]!,
        priceCents: m[2] ? Number(m[2]) : null,
      });
    }

    await db.transaction(async (tx) => {
      await tx
        .delete(barberServices)
        .where(eq(barberServices.barberId, input.barberId));
      if (rows.length > 0) await tx.insert(barberServices).values(rows);
    });

    revalidateBarberPages();
    return { ok: true, detail: "Services updated." };
  } catch (err) {
    return { ok: false, error: toActionError(err) };
  }
}

const addPhotoSchema = z.object({
  barberId: z.string().uuid(),
  caption: z.string().optional(),
});

export async function addBarberPhotoAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  try {
    await getAdminIdentity();
    const input = parseOrThrow(addPhotoSchema, formObject(formData));
    const photo = formData.get("photo");
    if (!(photo instanceof File) || photo.size === 0) {
      throw new ValidationError("Choose an image to upload.");
    }
    const fileName = await saveUpload(photo);
    await db.insert(barberPhotos).values({
      barberId: input.barberId,
      fileName,
      caption: input.caption || null,
    });
    revalidateBarberPages();
    return { ok: true, detail: "Photo added." };
  } catch (err) {
    return { ok: false, error: toActionError(err) };
  }
}

const deletePhotoSchema = z.object({ photoId: z.string().uuid() });

export async function deleteBarberPhotoAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  try {
    await getAdminIdentity();
    const input = parseOrThrow(deletePhotoSchema, formObject(formData));
    const [row] = await db
      .delete(barberPhotos)
      .where(eq(barberPhotos.id, input.photoId))
      .returning({ fileName: barberPhotos.fileName });
    if (row) await deleteUpload(row.fileName);
    revalidateBarberPages();
    return { ok: true, detail: "Photo removed." };
  } catch (err) {
    return { ok: false, error: toActionError(err) };
  }
}
