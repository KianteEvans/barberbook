import Stripe from "stripe";
import { eq } from "drizzle-orm";
import { env } from "@/env";
import { db } from "@/db/client";
import { users } from "@/db/schema";
import { AppError } from "@/domain/errors";

/**
 * Stripe singleton + customer helper. Only import this module from code paths
 * already gated on `paymentsEnabled`; calling without keys throws.
 */

let cached: Stripe | null = null;

export function stripe(): Stripe {
  if (!env.STRIPE_SECRET_KEY) {
    throw new AppError("Online payments are not configured.");
  }
  cached ??= new Stripe(env.STRIPE_SECRET_KEY, {
    apiVersion: "2025-02-24.acacia",
  });
  return cached;
}

/** Get or lazily create the Stripe customer for a user, persisting the id. */
export async function ensureStripeCustomer(userId: string): Promise<string> {
  const [user] = await db.select().from(users).where(eq(users.id, userId));
  if (!user) throw new AppError("User not found.");
  if (user.stripeCustomerId) return user.stripeCustomerId;

  const customer = await stripe().customers.create({
    email: user.email,
    name: user.name,
    metadata: { userId: user.id },
  });
  await db
    .update(users)
    .set({ stripeCustomerId: customer.id })
    .where(eq(users.id, userId));
  return customer.id;
}
