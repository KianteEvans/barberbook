import { z } from "zod";
import { ValidationError } from "./errors";

/**
 * Shared form/action plumbing used by every domain's server actions and the
 * MutationForm client island.
 */

/** The shape every domain server action returns for useActionState. */
export interface ActionState {
  readonly ok: boolean;
  readonly error?: string;
  /** Optional success detail; overrides the form's static successMessage toast. */
  readonly detail?: string;
}

export const IDLE_STATE: ActionState = { ok: false };

/** Parse with a Zod schema or throw a ValidationError carrying the first issue. */
export function parseOrThrow<T>(
  schema: z.ZodType<T, z.ZodTypeDef, unknown>,
  data: unknown,
): T {
  const parsed = schema.safeParse(data);
  if (!parsed.success) {
    const first = parsed.error.issues[0];
    throw new ValidationError(first ? first.message : "Invalid request");
  }
  return parsed.data;
}

/** Pull named fields out of a FormData into a plain object for Zod. */
export function formObject(formData: FormData): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [k, v] of formData.entries()) {
    if (typeof v === "string") out[k] = v;
  }
  return out;
}
