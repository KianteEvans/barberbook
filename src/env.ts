import { z } from "zod";

/**
 * Zod-validated environment. Local-dev defaults match scripts/dev-db.ts so the
 * app boots with zero configuration; production must set everything.
 *
 * Stripe keys are OPTIONAL: when STRIPE_SECRET_KEY is unset the app runs in
 * "pay at shop" mode - bookings confirm immediately with no online deposit.
 */
const schema = z.object({
  DATABASE_URL: z
    .string()
    .default("postgres://postgres:password@localhost:54331/barberbook"),
  SESSION_SECRET: z
    .string()
    .min(16)
    .default("dev-only-secret-change-me-0123456789abcdef"),
  APP_URL: z.string().url().default("http://localhost:3000"),
  CRON_TOKEN: z.string().min(8).default("dev-cron-token"),
  STRIPE_SECRET_KEY: z.string().optional(),
  STRIPE_PUBLISHABLE_KEY: z.string().optional(),
  STRIPE_WEBHOOK_SECRET: z.string().optional(),
  // Email delivery (Resend). Optional: unset = notifications stay in-app only.
  RESEND_API_KEY: z.string().optional(),
  EMAIL_FROM: z.string().optional(),
});

function clean(v: string | undefined): string | undefined {
  return v === undefined || v.trim() === "" ? undefined : v;
}

export const env = schema.parse({
  DATABASE_URL: clean(process.env.DATABASE_URL),
  SESSION_SECRET: clean(process.env.SESSION_SECRET),
  APP_URL: clean(process.env.APP_URL),
  CRON_TOKEN: clean(process.env.CRON_TOKEN),
  STRIPE_SECRET_KEY: clean(process.env.STRIPE_SECRET_KEY),
  STRIPE_PUBLISHABLE_KEY: clean(process.env.STRIPE_PUBLISHABLE_KEY),
  STRIPE_WEBHOOK_SECRET: clean(process.env.STRIPE_WEBHOOK_SECRET),
  RESEND_API_KEY: clean(process.env.RESEND_API_KEY),
  EMAIL_FROM: clean(process.env.EMAIL_FROM),
});

/** True when online payments are configured; false = "pay at shop" dev mode. */
export const paymentsEnabled = env.STRIPE_SECRET_KEY !== undefined;

/** True when outbound email is configured; false = in-app notifications only. */
export const emailEnabled =
  env.RESEND_API_KEY !== undefined && env.EMAIL_FROM !== undefined;
