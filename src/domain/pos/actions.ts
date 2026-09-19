"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getIdentity, type Identity } from "@/auth/session";
import { parseOrThrow, formObject, type ActionState } from "@/domain/forms";
import { toActionError, ForbiddenError, ValidationError } from "@/domain/errors";
import { resolveBarberForUser } from "@/domain/chair/operations";
import { formatMoney } from "@/domain/money";
import { createSaleOp, voidSaleOp } from "./operations";
import type { CartLine } from "./cart";

/**
 * Register actions. Staff only: an admin can ring up for any chair; a barber
 * always rings up onto their OWN chair (derived from the session).
 */

async function requireStaff(): Promise<Identity> {
  const identity = await getIdentity();
  if (identity.role !== "admin" && identity.role !== "barber") {
    throw new ForbiddenError();
  }
  return identity;
}

const lineSchema = z.object({
  kind: z.enum(["service", "product", "custom"]),
  name: z.string().trim().min(1).max(80),
  unitPriceCents: z.number().int().min(0).max(1_000_000),
  qty: z.number().int().min(1).max(99),
  serviceId: z.string().uuid().nullish(),
  productId: z.string().uuid().nullish(),
});

const saleSchema = z.object({
  // The cart travels as JSON: a variable-length basket does not fit flat
  // form fields cleanly.
  lines: z.string(),
  tender: z.enum(["cash", "card", "other"]),
  discountCents: z.coerce.number().int().min(0).default(0),
  tipCents: z.coerce.number().int().min(0).default(0),
  barberId: z.string().uuid().optional().or(z.literal("")),
  clientId: z.string().uuid().optional().or(z.literal("")),
  appointmentId: z.string().uuid().optional().or(z.literal("")),
  note: z.string().trim().max(200).optional(),
});

export async function createSaleAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  try {
    const identity = await requireStaff();
    const input = parseOrThrow(saleSchema, formObject(formData));

    let parsed: unknown;
    try {
      parsed = JSON.parse(input.lines);
    } catch {
      throw new ValidationError("The cart could not be read. Try again.");
    }
    const lines = parseOrThrow(z.array(lineSchema).min(1).max(50), parsed) as CartLine[];

    // A barber's sale always lands on their own chair, whatever the form says.
    const ownChair =
      identity.role === "barber"
        ? ((await resolveBarberForUser(identity.userId))?.id ?? null)
        : null;
    if (identity.role === "barber" && !ownChair) throw new ForbiddenError();

    const sale = await createSaleOp({
      lines,
      tender: input.tender,
      discountCents: input.discountCents,
      tipCents: input.tipCents,
      barberId: ownChair ?? (input.barberId || null),
      clientId: input.clientId || null,
      appointmentId: input.appointmentId || null,
      note: input.note || null,
    });

    revalidatePath("/admin/pos");
    revalidatePath("/admin/payments");
    revalidatePath("/chair");
    return { ok: true, detail: `Sale complete - ${formatMoney(sale.totalCents)}.` };
  } catch (err) {
    return { ok: false, error: toActionError(err) };
  }
}

const voidSchema = z.object({ saleId: z.string().uuid() });

/** Admin-only: voiding money is not a barber's call. */
export async function voidSaleAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  try {
    const identity = await requireStaff();
    if (identity.role !== "admin") throw new ForbiddenError();
    const input = parseOrThrow(voidSchema, formObject(formData));
    await voidSaleOp(input.saleId);
    revalidatePath("/admin/pos");
    revalidatePath("/admin/payments");
    return { ok: true, detail: "Sale voided." };
  } catch (err) {
    return { ok: false, error: toActionError(err) };
  }
}
