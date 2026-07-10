"use server";

import { revalidatePath } from "next/cache";
import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db/client";
import { clientNotes, users } from "@/db/schema";
import { getIdentity } from "@/auth/session";
import { parseOrThrow, formObject, type ActionState } from "@/domain/forms";
import { toActionError, ForbiddenError, ValidationError, NotFoundError } from "@/domain/errors";
import type { Identity } from "@/auth/session";

/** Client CRM note mutations. Notes are staff-only (admin or barber). */

async function requireStaff(): Promise<Identity> {
  const identity = await getIdentity();
  if (identity.role !== "admin" && identity.role !== "barber") {
    throw new ForbiddenError();
  }
  return identity;
}

const addSchema = z.object({
  clientId: z.string().uuid(),
  body: z.string().trim().min(1, "Note can't be empty.").max(2000),
});

export async function addClientNoteAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  try {
    const identity = await requireStaff();
    const input = parseOrThrow(addSchema, formObject(formData));
    // Guard the note target is actually a client.
    const [client] = await db
      .select({ role: users.role })
      .from(users)
      .where(eq(users.id, input.clientId));
    if (!client || client.role !== "client") {
      throw new ValidationError("That client does not exist.");
    }
    await db.insert(clientNotes).values({
      clientId: input.clientId,
      authorId: identity.userId,
      body: input.body,
    });
    revalidatePath(`/admin/clients/${input.clientId}`);
    revalidatePath("/chair");
    return { ok: true, detail: "Note added." };
  } catch (err) {
    return { ok: false, error: toActionError(err) };
  }
}

const deleteSchema = z.object({ id: z.string().uuid() });

export async function deleteClientNoteAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  try {
    const identity = await requireStaff();
    const input = parseOrThrow(deleteSchema, formObject(formData));
    const [note] = await db
      .select({ clientId: clientNotes.clientId, authorId: clientNotes.authorId })
      .from(clientNotes)
      .where(eq(clientNotes.id, input.id));
    if (!note) throw new NotFoundError("Note not found.");
    // Admin may delete any note; a barber may delete only their own.
    if (identity.role !== "admin" && note.authorId !== identity.userId) {
      throw new ForbiddenError();
    }
    await db.delete(clientNotes).where(eq(clientNotes.id, input.id));
    revalidatePath(`/admin/clients/${note.clientId}`);
    revalidatePath("/chair");
    return { ok: true, detail: "Note removed." };
  } catch (err) {
    return { ok: false, error: toActionError(err) };
  }
}
