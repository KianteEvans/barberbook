"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getIdentity } from "@/auth/session";
import { parseOrThrow, formObject, type ActionState } from "@/domain/forms";
import { toActionError, ValidationError } from "@/domain/errors";
import {
  joinFlexibleWaitlistOp,
  joinWaitlistOp,
  leaveWaitlistOp,
} from "./operations";

const joinSchema = z.object({
  barberId: z.string().uuid(),
  serviceId: z.string().uuid(),
  /** Exact-slot join: the slot instant. */
  desiredStartAt: z
    .string()
    .datetime({ offset: true })
    .or(z.string().datetime())
    .optional(),
  /** Flexible join: a shop-local day (any opening that day). */
  date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
});

export async function joinWaitlistAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  try {
    const identity = await getIdentity();
    const input = parseOrThrow(joinSchema, formObject(formData));
    if (input.date) {
      await joinFlexibleWaitlistOp({
        clientId: identity.userId,
        barberId: input.barberId,
        serviceId: input.serviceId,
        date: input.date,
      });
      revalidatePath("/account");
      return {
        ok: true,
        detail: "You're on the list - we'll ping you when a time opens that day.",
      };
    }
    if (!input.desiredStartAt) {
      throw new ValidationError("Pick a time or a day to wait for.");
    }
    await joinWaitlistOp({
      clientId: identity.userId,
      barberId: input.barberId,
      serviceId: input.serviceId,
      desiredStartAt: new Date(input.desiredStartAt),
    });
    revalidatePath("/account");
    return {
      ok: true,
      detail: "You're in line - we'll book you if the slot opens up.",
    };
  } catch (err) {
    return { ok: false, error: toActionError(err) };
  }
}

const leaveSchema = z.object({ entryId: z.string().uuid() });

export async function leaveWaitlistAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  try {
    const identity = await getIdentity();
    const input = parseOrThrow(leaveSchema, formObject(formData));
    await leaveWaitlistOp(input.entryId, identity.userId);
    revalidatePath("/account");
    return { ok: true, detail: "Left the line." };
  } catch (err) {
    return { ok: false, error: toActionError(err) };
  }
}
