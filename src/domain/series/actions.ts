"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getAdminIdentity, getIdentity } from "@/auth/session";
import { parseOrThrow, formObject, type ActionState } from "@/domain/forms";
import { toActionError } from "@/domain/errors";
import { setSeriesStatusOp, materializeAllSeries } from "./operations";

const statusSchema = z.object({
  seriesId: z.string().uuid(),
  status: z.enum(["active", "paused", "canceled"]),
});

/** Pause/resume/cancel a series (client owns it; admin can manage any). */
export async function setSeriesStatusAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  try {
    const identity = await getIdentity();
    const input = parseOrThrow(statusSchema, formObject(formData));
    await setSeriesStatusOp({
      seriesId: input.seriesId,
      clientId: identity.role === "admin" ? null : identity.userId,
      status: input.status,
    });
    revalidatePath("/admin/series");
    revalidatePath("/account");
    const verb =
      input.status === "active"
        ? "resumed"
        : input.status === "paused"
          ? "paused"
          : "canceled";
    return { ok: true, detail: `Series ${verb}.` };
  } catch (err) {
    return { ok: false, error: toActionError(err) };
  }
}

/** Admin-triggered materialization (same engine the cron runs). */
export async function materializeNowAction(
  _prev: ActionState,
  _formData: FormData,
): Promise<ActionState> {
  try {
    await getAdminIdentity();
    const summary = await materializeAllSeries();
    revalidatePath("/admin/series");
    revalidatePath("/admin/calendar");
    return {
      ok: true,
      detail: `Materialized: ${summary.booked} booked, ${summary.conflicts} conflicts, ${summary.chargeFailures} charge failures.`,
    };
  } catch (err) {
    return { ok: false, error: toActionError(err) };
  }
}
