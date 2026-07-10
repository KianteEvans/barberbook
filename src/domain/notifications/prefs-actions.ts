"use server";

import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db/client";
import { users } from "@/db/schema";
import { getIdentity } from "@/auth/session";
import { parseOrThrow, formObject, type ActionState } from "@/domain/forms";
import { toActionError } from "@/domain/errors";

/** A client manages their own reminder channels. Checkbox present = opted in. */
const prefsSchema = z.object({
  email: z.string().optional(),
  sms: z.string().optional(),
});

export async function updateNotificationPrefsAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  try {
    const identity = await getIdentity();
    const input = parseOrThrow(prefsSchema, formObject(formData));
    await db
      .update(users)
      .set({
        emailOptOut: input.email !== "on",
        smsOptOut: input.sms !== "on",
      })
      .where(eq(users.id, identity.userId));
    revalidatePath("/account");
    return { ok: true, detail: "Notification preferences saved." };
  } catch (err) {
    return { ok: false, error: toActionError(err) };
  }
}
