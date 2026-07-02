-- BarberBook initial schema. ASCII only (Windows/WIN1252 gotcha).
-- All timestamps are timestamptz (UTC). Money is integer cents.

CREATE EXTENSION IF NOT EXISTS btree_gist;
CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE users (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email               text NOT NULL UNIQUE,
  password_hash       text NOT NULL,
  name                text NOT NULL,
  phone               text,
  role                text NOT NULL DEFAULT 'client' CHECK (role IN ('admin', 'client')),
  stripe_customer_id  text UNIQUE,
  created_at          timestamptz NOT NULL DEFAULT now()
);

-- Single-row table (id always 1) holding shop-wide policy.
CREATE TABLE shop_settings (
  id                        int PRIMARY KEY CHECK (id = 1),
  shop_name                 text NOT NULL DEFAULT 'BarberBook',
  timezone                  text NOT NULL DEFAULT 'America/New_York',
  cancellation_window_hours int NOT NULL DEFAULT 24,
  deposit_mode              text NOT NULL DEFAULT 'fixed' CHECK (deposit_mode IN ('fixed', 'percent')),
  -- fixed: cents; percent: whole percent of service price (e.g. 25).
  deposit_value             int NOT NULL DEFAULT 1000,
  no_show_fee_cents         int NOT NULL DEFAULT 0,
  slot_granularity_min      int NOT NULL DEFAULT 15,
  buffer_min                int NOT NULL DEFAULT 0
);

CREATE TABLE services (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name          text NOT NULL,
  description   text,
  duration_min  int NOT NULL CHECK (duration_min > 0),
  price_cents   int NOT NULL CHECK (price_cents >= 0),
  -- NULL means fall back to the shop-level deposit policy.
  deposit_cents int CHECK (deposit_cents >= 0),
  active        boolean NOT NULL DEFAULT true,
  created_at    timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE barbers (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       uuid REFERENCES users(id),
  display_name  text NOT NULL,
  active        boolean NOT NULL DEFAULT true,
  created_at    timestamptz NOT NULL DEFAULT now()
);

-- Weekly availability template, minutes from shop-timezone midnight.
CREATE TABLE availability_rules (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  barber_id  uuid NOT NULL REFERENCES barbers(id) ON DELETE CASCADE,
  weekday    int NOT NULL CHECK (weekday BETWEEN 0 AND 6),
  start_min  int NOT NULL CHECK (start_min BETWEEN 0 AND 1440),
  end_min    int NOT NULL CHECK (end_min BETWEEN 0 AND 1440),
  CHECK (end_min > start_min)
);

-- Per-date overrides: a day off, or custom hours for one date.
CREATE TABLE availability_exceptions (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  barber_id  uuid NOT NULL REFERENCES barbers(id) ON DELETE CASCADE,
  date       date NOT NULL,
  kind       text NOT NULL CHECK (kind IN ('off', 'custom')),
  start_min  int CHECK (start_min BETWEEN 0 AND 1440),
  end_min    int CHECK (end_min BETWEEN 0 AND 1440),
  UNIQUE (barber_id, date)
);

CREATE TABLE membership_plans (
  id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name               text NOT NULL,
  description        text,
  stripe_product_id  text,
  stripe_price_id    text,
  credits_per_period int NOT NULL CHECK (credits_per_period > 0),
  price_cents        int NOT NULL CHECK (price_cents >= 0),
  active             boolean NOT NULL DEFAULT true,
  created_at         timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE memberships (
  id                     uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id              uuid NOT NULL REFERENCES users(id),
  plan_id                uuid NOT NULL REFERENCES membership_plans(id),
  stripe_subscription_id text UNIQUE,
  status                 text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'past_due', 'canceled')),
  current_period_end     timestamptz,
  created_at             timestamptz NOT NULL DEFAULT now()
);

-- One credits row per billing period (granted on invoice.paid). Consumption
-- happens under SELECT ... FOR UPDATE so granted >= consumed always holds.
CREATE TABLE membership_credits (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  membership_id uuid NOT NULL REFERENCES memberships(id) ON DELETE CASCADE,
  granted       int NOT NULL CHECK (granted > 0),
  consumed      int NOT NULL DEFAULT 0 CHECK (consumed >= 0),
  period_start  timestamptz NOT NULL,
  period_end    timestamptz NOT NULL,
  stripe_invoice_id text UNIQUE,
  CHECK (consumed <= granted)
);

CREATE TABLE appointments (
  id                         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id                  uuid NOT NULL REFERENCES users(id),
  barber_id                  uuid NOT NULL REFERENCES barbers(id),
  service_id                 uuid NOT NULL REFERENCES services(id),
  start_at                   timestamptz NOT NULL,
  end_at                     timestamptz NOT NULL,
  status                     text NOT NULL DEFAULT 'pending_deposit'
    CHECK (status IN ('pending_deposit', 'confirmed', 'completed', 'canceled', 'no_show')),
  hold_expires_at            timestamptz,
  deposit_cents              int NOT NULL DEFAULT 0,
  remainder_cents            int NOT NULL DEFAULT 0,
  stripe_checkout_session_id text,
  stripe_payment_intent_id   text,
  credit_id                  uuid REFERENCES membership_credits(id),
  canceled_at                timestamptz,
  created_at                 timestamptz NOT NULL DEFAULT now(),
  CHECK (end_at > start_at)
);

-- The double-booking arbiter: two live appointments for the same barber can
-- never overlap. App code catches SQLSTATE 23P01 and reports "slot taken".
ALTER TABLE appointments ADD CONSTRAINT no_overlap
  EXCLUDE USING gist (barber_id WITH =, tstzrange(start_at, end_at) WITH &&)
  WHERE (status IN ('pending_deposit', 'confirmed'));

CREATE INDEX appointments_start_idx ON appointments (start_at);
CREATE INDEX appointments_client_idx ON appointments (client_id);

CREATE TABLE recurring_series (
  id                       uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id                uuid NOT NULL REFERENCES users(id),
  barber_id                uuid NOT NULL REFERENCES barbers(id),
  service_id               uuid NOT NULL REFERENCES services(id),
  cadence_weeks            int NOT NULL CHECK (cadence_weeks BETWEEN 1 AND 12),
  weekday                  int NOT NULL CHECK (weekday BETWEEN 0 AND 6),
  time_min                 int NOT NULL CHECK (time_min BETWEEN 0 AND 1440),
  status                   text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'paused', 'canceled')),
  anchor_date              date NOT NULL,
  next_horizon_date        date NOT NULL,
  stripe_payment_method_id text,
  created_at               timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE series_occurrences (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  series_id      uuid NOT NULL REFERENCES recurring_series(id) ON DELETE CASCADE,
  appointment_id uuid REFERENCES appointments(id),
  scheduled_date date NOT NULL,
  status         text NOT NULL DEFAULT 'booked'
    CHECK (status IN ('booked', 'conflict', 'charge_failed', 'skipped')),
  note           text,
  created_at     timestamptz NOT NULL DEFAULT now(),
  UNIQUE (series_id, scheduled_date)
);

CREATE TABLE payments (
  id                       uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  appointment_id           uuid REFERENCES appointments(id),
  membership_id            uuid REFERENCES memberships(id),
  client_id                uuid REFERENCES users(id),
  type                     text NOT NULL
    CHECK (type IN ('deposit', 'remainder', 'refund', 'no_show_fee', 'subscription')),
  amount_cents             int NOT NULL,
  status                   text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'succeeded', 'failed', 'refunded')),
  stripe_payment_intent_id text,
  stripe_refund_id         text,
  failure_message          text,
  created_at               timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX payments_appointment_idx ON payments (appointment_id);

-- Stripe webhook dedup ledger: INSERT ... ON CONFLICT DO NOTHING; if the row
-- already exists the event was processed (or is being processed) - skip.
CREATE TABLE webhook_events (
  stripe_event_id text PRIMARY KEY,
  type            text NOT NULL,
  processed_at    timestamptz NOT NULL DEFAULT now()
);
