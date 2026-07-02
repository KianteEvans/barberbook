"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db/client";
import { membershipPlans } from "@/db/schema";
import { getAdminIdentity, getIdentity } from "@/auth/session";
import { parseOrThrow, formObject, type ActionState } from "@/domain/forms";
import { toActionError, AppError, NotFoundError } from "@/domain/errors";
import { paymentsEnabled } from "@/env";
import { stripe } from "@/stripe/client";
import { createSubscriptionCheckout } from "@/stripe/checkout";

const subscribeSchema = z.object({ planId: z.string().uuid() });

/** Client subscribes to a plan via Stripe subscription checkout. */
export async function subscribeAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  let checkoutUrl: string;
  try {
    const identity = await getIdentity();
    const input = parseOrThrow(subscribeSchema, formObject(formData));
    if (!paymentsEnabled) {
      throw new AppError("Online payments are not configured - ask at the shop.");
    }

    const [plan] = await db
      .select()
      .from(membershipPlans)
      .where(eq(membershipPlans.id, input.planId));
    if (!plan || !plan.active) throw new NotFoundError("Plan not found.");

    const priceId = plan.stripePriceId ?? (await syncPlanToStripe(plan.id));
    checkoutUrl = await createSubscriptionCheckout({
      clientId: identity.userId,
      stripePriceId: priceId,
      planId: plan.id,
    });
  } catch (err) {
    return { ok: false, error: toActionError(err) };
  }
  redirect(checkoutUrl);
}

/** Create the Stripe Product/Price for a plan and persist the ids. */
async function syncPlanToStripe(planId: string): Promise<string> {
  const [plan] = await db
    .select()
    .from(membershipPlans)
    .where(eq(membershipPlans.id, planId));
  if (!plan) throw new NotFoundError("Plan not found.");
  if (plan.stripePriceId) return plan.stripePriceId;

  const product =
    plan.stripeProductId !== null
      ? { id: plan.stripeProductId }
      : await stripe().products.create({
          name: plan.name,
          description: plan.description ?? undefined,
          metadata: { planId: plan.id },
        });
  const price = await stripe().prices.create({
    product: product.id,
    currency: "usd",
    unit_amount: plan.priceCents,
    recurring: { interval: "month" },
    metadata: { planId: plan.id },
  });
  await db
    .update(membershipPlans)
    .set({ stripeProductId: product.id, stripePriceId: price.id })
    .where(eq(membershipPlans.id, plan.id));
  return price.id;
}

const planSchema = z.object({
  id: z.string().uuid().optional(),
  name: z.string().min(1, "Name is required."),
  description: z.string().optional(),
  creditsPerPeriod: z.coerce.number().int().min(1),
  priceCents: z.coerce.number().int().min(0),
});

/** Admin creates/edits a plan. Price changes mint a new Stripe Price lazily. */
export async function upsertPlanAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  try {
    await getAdminIdentity();
    const input = parseOrThrow(planSchema, formObject(formData));
    if (input.id) {
      const [existing] = await db
        .select()
        .from(membershipPlans)
        .where(eq(membershipPlans.id, input.id));
      if (!existing) throw new NotFoundError("Plan not found.");
      await db
        .update(membershipPlans)
        .set({
          name: input.name,
          description: input.description || null,
          creditsPerPeriod: input.creditsPerPeriod,
          priceCents: input.priceCents,
          // A price change invalidates the old Stripe Price; re-sync lazily on
          // the next subscribe.
          ...(existing.priceCents !== input.priceCents
            ? { stripePriceId: null }
            : {}),
        })
        .where(eq(membershipPlans.id, input.id));
    } else {
      await db.insert(membershipPlans).values({
        name: input.name,
        description: input.description || null,
        creditsPerPeriod: input.creditsPerPeriod,
        priceCents: input.priceCents,
      });
    }
    revalidatePath("/admin/memberships");
    revalidatePath("/memberships");
    return { ok: true, detail: `Plan "${input.name}" saved.` };
  } catch (err) {
    return { ok: false, error: toActionError(err) };
  }
}
