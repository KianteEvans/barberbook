import {
  pgTable,
  uuid,
  text,
  integer,
  boolean,
  timestamp,
  date,
  primaryKey,
} from "drizzle-orm/pg-core";

/**
 * Drizzle schema mirroring drizzle/0000_init.sql. The raw SQL migration is the
 * source of truth (it carries the gist exclusion constraint); this file exists
 * for typed query building only.
 */

export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  name: text("name").notNull(),
  phone: text("phone"),
  role: text("role", { enum: ["admin", "client", "barber"] })
    .notNull()
    .default("client"),
  stripeCustomerId: text("stripe_customer_id").unique(),
  emailOptOut: boolean("email_opt_out").notNull().default(false),
  smsOptOut: boolean("sms_opt_out").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const shopSettings = pgTable("shop_settings", {
  id: integer("id").primaryKey(),
  shopName: text("shop_name").notNull().default("BarberBook"),
  timezone: text("timezone").notNull().default("America/New_York"),
  cancellationWindowHours: integer("cancellation_window_hours").notNull().default(24),
  depositMode: text("deposit_mode", { enum: ["fixed", "percent"] })
    .notNull()
    .default("fixed"),
  depositValue: integer("deposit_value").notNull().default(1000),
  noShowFeeCents: integer("no_show_fee_cents").notNull().default(0),
  slotGranularityMin: integer("slot_granularity_min").notNull().default(15),
  bufferMin: integer("buffer_min").notNull().default(0),
  heroFile: text("hero_file"),
  backdrop: text("backdrop").notNull().default("skyline"),
  memberGraceMinutes: integer("member_grace_minutes").notNull().default(15),
  depositGraceMinutes: integer("deposit_grace_minutes").notNull().default(10),
  confirmationWindowMinutes: integer("confirmation_window_minutes")
    .notNull()
    .default(15),
  loyaltyEveryN: integer("loyalty_every_n").notNull().default(0),
  rebookAfterDays: integer("rebook_after_days").notNull().default(0),
  winbackAfterDays: integer("winback_after_days").notNull().default(0),
});

export const discountCodes = pgTable("discount_codes", {
  id: uuid("id").primaryKey().defaultRandom(),
  code: text("code").notNull().unique(),
  kind: text("kind", { enum: ["percent", "fixed"] }).notNull(),
  amount: integer("amount").notNull(),
  active: boolean("active").notNull().default(true),
  maxUses: integer("max_uses"),
  usedCount: integer("used_count").notNull().default(0),
  expiresAt: timestamp("expires_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const loyalty = pgTable("loyalty", {
  clientId: uuid("client_id").primaryKey().references(() => users.id),
  completedCount: integer("completed_count").notNull().default(0),
  freeCredits: integer("free_credits").notNull().default(0),
});

export const clientNotes = pgTable("client_notes", {
  id: uuid("id").primaryKey().defaultRandom(),
  clientId: uuid("client_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  authorId: uuid("author_id").references(() => users.id),
  body: text("body").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const services = pgTable("services", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  description: text("description"),
  durationMin: integer("duration_min").notNull(),
  priceCents: integer("price_cents").notNull(),
  depositCents: integer("deposit_cents"),
  active: boolean("active").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const barbers = pgTable("barbers", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").references(() => users.id),
  displayName: text("display_name").notNull(),
  bio: text("bio"),
  tagline: text("tagline"),
  specialties: text("specialties"),
  photoFile: text("photo_file"),
  active: boolean("active").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const barberServices = pgTable(
  "barber_services",
  {
    barberId: uuid("barber_id")
      .notNull()
      .references(() => barbers.id, { onDelete: "cascade" }),
    serviceId: uuid("service_id")
      .notNull()
      .references(() => services.id, { onDelete: "cascade" }),
    // NULL = use the shop's standard service price.
    priceCents: integer("price_cents"),
  },
  (t) => [primaryKey({ columns: [t.barberId, t.serviceId] })],
);

export const barberPhotos = pgTable("barber_photos", {
  id: uuid("id").primaryKey().defaultRandom(),
  barberId: uuid("barber_id")
    .notNull()
    .references(() => barbers.id, { onDelete: "cascade" }),
  fileName: text("file_name").notNull(),
  caption: text("caption"),
  sortOrder: integer("sort_order").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const testimonials = pgTable("testimonials", {
  id: uuid("id").primaryKey().defaultRandom(),
  authorName: text("author_name").notNull(),
  quote: text("quote").notNull(),
  rating: integer("rating"),
  barberId: uuid("barber_id").references(() => barbers.id, {
    onDelete: "set null",
  }),
  featured: boolean("featured").notNull().default(true),
  sortOrder: integer("sort_order").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const reviews = pgTable("reviews", {
  id: uuid("id").primaryKey().defaultRandom(),
  appointmentId: uuid("appointment_id")
    .notNull()
    .unique()
    .references(() => appointments.id, { onDelete: "cascade" }),
  clientId: uuid("client_id").notNull().references(() => users.id),
  barberId: uuid("barber_id").notNull().references(() => barbers.id),
  rating: integer("rating").notNull(),
  comment: text("comment"),
  status: text("status", { enum: ["pending", "approved", "rejected"] })
    .notNull()
    .default("pending"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const availabilityRules = pgTable("availability_rules", {
  id: uuid("id").primaryKey().defaultRandom(),
  barberId: uuid("barber_id")
    .notNull()
    .references(() => barbers.id, { onDelete: "cascade" }),
  weekday: integer("weekday").notNull(),
  startMin: integer("start_min").notNull(),
  endMin: integer("end_min").notNull(),
});

export const availabilityExceptions = pgTable("availability_exceptions", {
  id: uuid("id").primaryKey().defaultRandom(),
  barberId: uuid("barber_id")
    .notNull()
    .references(() => barbers.id, { onDelete: "cascade" }),
  date: date("date").notNull(),
  kind: text("kind", { enum: ["off", "custom"] }).notNull(),
  startMin: integer("start_min"),
  endMin: integer("end_min"),
});

export const membershipPlans = pgTable("membership_plans", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  description: text("description"),
  stripeProductId: text("stripe_product_id"),
  stripePriceId: text("stripe_price_id"),
  creditsPerPeriod: integer("credits_per_period").notNull(),
  priceCents: integer("price_cents").notNull(),
  active: boolean("active").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const memberships = pgTable("memberships", {
  id: uuid("id").primaryKey().defaultRandom(),
  clientId: uuid("client_id").notNull().references(() => users.id),
  planId: uuid("plan_id").notNull().references(() => membershipPlans.id),
  stripeSubscriptionId: text("stripe_subscription_id").unique(),
  status: text("status", { enum: ["active", "past_due", "canceled"] })
    .notNull()
    .default("active"),
  currentPeriodEnd: timestamp("current_period_end", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const membershipCredits = pgTable("membership_credits", {
  id: uuid("id").primaryKey().defaultRandom(),
  membershipId: uuid("membership_id")
    .notNull()
    .references(() => memberships.id, { onDelete: "cascade" }),
  granted: integer("granted").notNull(),
  consumed: integer("consumed").notNull().default(0),
  periodStart: timestamp("period_start", { withTimezone: true }).notNull(),
  periodEnd: timestamp("period_end", { withTimezone: true }).notNull(),
  stripeInvoiceId: text("stripe_invoice_id").unique(),
});

export const appointments = pgTable("appointments", {
  id: uuid("id").primaryKey().defaultRandom(),
  clientId: uuid("client_id").notNull().references(() => users.id),
  barberId: uuid("barber_id").notNull().references(() => barbers.id),
  serviceId: uuid("service_id").notNull().references(() => services.id),
  startAt: timestamp("start_at", { withTimezone: true }).notNull(),
  endAt: timestamp("end_at", { withTimezone: true }).notNull(),
  status: text("status", {
    enum: [
      "pending_deposit",
      "confirmed",
      "reserved",
      "completed",
      "canceled",
      "no_show",
    ],
  })
    .notNull()
    .default("pending_deposit"),
  holdExpiresAt: timestamp("hold_expires_at", { withTimezone: true }),
  depositCents: integer("deposit_cents").notNull().default(0),
  remainderCents: integer("remainder_cents").notNull().default(0),
  stripeCheckoutSessionId: text("stripe_checkout_session_id"),
  stripePaymentIntentId: text("stripe_payment_intent_id"),
  creditId: uuid("credit_id").references(() => membershipCredits.id),
  discountCode: text("discount_code"),
  discountCents: integer("discount_cents").notNull().default(0),
  holdTier: text("hold_tier", {
    enum: ["member", "deposit", "unconfirmed"],
  }),
  graceMinutes: integer("grace_minutes"),
  attendanceConfirmedAt: timestamp("attendance_confirmed_at", { withTimezone: true }),
  confirmationDeadline: timestamp("confirmation_deadline", { withTimezone: true }),
  cancelReason: text("cancel_reason", {
    enum: ["client", "admin", "unconfirmed", "promoted_out"],
  }),
  canceledAt: timestamp("canceled_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const recurringSeries = pgTable("recurring_series", {
  id: uuid("id").primaryKey().defaultRandom(),
  clientId: uuid("client_id").notNull().references(() => users.id),
  barberId: uuid("barber_id").notNull().references(() => barbers.id),
  serviceId: uuid("service_id").notNull().references(() => services.id),
  cadenceWeeks: integer("cadence_weeks").notNull(),
  weekday: integer("weekday").notNull(),
  timeMin: integer("time_min").notNull(),
  status: text("status", { enum: ["active", "paused", "canceled"] })
    .notNull()
    .default("active"),
  anchorDate: date("anchor_date").notNull(),
  nextHorizonDate: date("next_horizon_date").notNull(),
  stripePaymentMethodId: text("stripe_payment_method_id"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const seriesOccurrences = pgTable("series_occurrences", {
  id: uuid("id").primaryKey().defaultRandom(),
  seriesId: uuid("series_id")
    .notNull()
    .references(() => recurringSeries.id, { onDelete: "cascade" }),
  appointmentId: uuid("appointment_id").references(() => appointments.id),
  scheduledDate: date("scheduled_date").notNull(),
  status: text("status", { enum: ["booked", "conflict", "charge_failed", "skipped"] })
    .notNull()
    .default("booked"),
  note: text("note"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const payments = pgTable("payments", {
  id: uuid("id").primaryKey().defaultRandom(),
  appointmentId: uuid("appointment_id").references(() => appointments.id),
  membershipId: uuid("membership_id").references(() => memberships.id),
  clientId: uuid("client_id").references(() => users.id),
  type: text("type", {
    enum: ["deposit", "remainder", "refund", "no_show_fee", "subscription", "tip"],
  }).notNull(),
  amountCents: integer("amount_cents").notNull(),
  status: text("status", { enum: ["pending", "succeeded", "failed", "refunded"] })
    .notNull()
    .default("pending"),
  stripePaymentIntentId: text("stripe_payment_intent_id"),
  stripeRefundId: text("stripe_refund_id"),
  failureMessage: text("failure_message"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const webhookEvents = pgTable("webhook_events", {
  stripeEventId: text("stripe_event_id").primaryKey(),
  type: text("type").notNull(),
  processedAt: timestamp("processed_at", { withTimezone: true }).notNull().defaultNow(),
});

export const notifications = pgTable("notifications", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").notNull().references(() => users.id),
  kind: text("kind", {
    enum: [
      "reminder",
      "confirm_needed",
      "released",
      "promoted",
      "review_request",
      "loyalty",
      "rebook",
      "winback",
    ],
  }).notNull(),
  title: text("title").notNull(),
  body: text("body").notNull(),
  appointmentId: uuid("appointment_id").references(() => appointments.id),
  readAt: timestamp("read_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const clientNudges = pgTable(
  "client_nudges",
  {
    clientId: uuid("client_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    kind: text("kind", { enum: ["rebook", "winback"] }).notNull(),
    lastSentAt: timestamp("last_sent_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({ pk: primaryKey({ columns: [t.clientId, t.kind] }) }),
);

export const reminderLog = pgTable("reminder_log", {
  appointmentId: uuid("appointment_id")
    .notNull()
    .references(() => appointments.id),
  offsetMinutes: integer("offset_minutes").notNull(),
  recipientKind: text("recipient_kind", { enum: ["client", "barber"] }).notNull(),
  sentAt: timestamp("sent_at", { withTimezone: true }).notNull().defaultNow(),
});

export const waitlistEntries = pgTable("waitlist_entries", {
  id: uuid("id").primaryKey().defaultRandom(),
  clientId: uuid("client_id").notNull().references(() => users.id),
  barberId: uuid("barber_id").notNull().references(() => barbers.id),
  serviceId: uuid("service_id").notNull().references(() => services.id),
  desiredStartAt: timestamp("desired_start_at", { withTimezone: true }).notNull(),
  status: text("status", {
    enum: ["waiting", "promoted", "expired", "canceled"],
  })
    .notNull()
    .default("waiting"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});
