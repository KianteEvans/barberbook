"use server";

import { revalidatePath } from "next/cache";
import { and, eq, isNull } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db/client";
import { notifications } from "@/db/schema";
import { getIdentity } from "@/auth/session";
import { parseOrThrow, formObject, type ActionState } from "@/domain/forms";
import { toActionError } from "@/domain/errors";

/** Reader-scoped notification actions (a user only touches their own rows). */

export async function markAllReadAction(
  _prev: ActionState,
  _formData: FormData,
): Promise<ActionState> {
  try {
    const identity = await getIdentity();
    await db
      .update(notifications)
      .set({ readAt: new Date() })
      .where(
        and(
          eq(notifications.userId, identity.userId),
          isNull(notifications.readAt),
        ),
      );
    revalidatePath("/notifications");
    revalidatePath("/", "layout");
    return { ok: true, detail: "All caught up." };
  } catch (err) {
    return { ok: false, error: toActionError(err) };
  }
}

const markReadSchema = z.object({ id: z.string().uuid() });

export async function markReadAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  try {
    const identity = await getIdentity();
    const input = parseOrThrow(markReadSchema, formObject(formData));
    await db
      .update(notifications)
      .set({ readAt: new Date() })
      .where(
        and(
          eq(notifications.id, input.id),
          eq(notifications.userId, identity.userId),
        ),
      );
    revalidatePath("/notifications");
    revalidatePath("/", "layout");
    return { ok: true };
  } catch (err) {
    return { ok: false, error: toActionError(err) };
  }
}
