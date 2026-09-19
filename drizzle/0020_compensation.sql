-- How each chair gets paid, and a snapshot of what was actually paid out.
-- Barbershops run on commission or booth rent; without this the owner is
-- doing payroll in a spreadsheet. ASCII only.

ALTER TABLE barbers ADD COLUMN comp_type text NOT NULL DEFAULT 'none'
  CHECK (comp_type IN ('none','commission','booth_rent','hourly'));
ALTER TABLE barbers ADD COLUMN commission_pct int
  CHECK (commission_pct IS NULL OR (commission_pct >= 0 AND commission_pct <= 100));
ALTER TABLE barbers ADD COLUMN booth_rent_cents int;
ALTER TABLE barbers ADD COLUMN booth_rent_period text
  CHECK (booth_rent_period IS NULL OR booth_rent_period IN ('weekly','monthly'));
ALTER TABLE barbers ADD COLUMN hourly_cents int;

CREATE TABLE payout_periods (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  barber_id        uuid NOT NULL REFERENCES barbers(id) ON DELETE CASCADE,
  period_start     date NOT NULL,
  period_end       date NOT NULL,
  comp_type        text NOT NULL,
  gross_cents      int NOT NULL DEFAULT 0,
  commission_cents int NOT NULL DEFAULT 0,
  booth_rent_cents int NOT NULL DEFAULT 0,
  hourly_cents     int NOT NULL DEFAULT 0,
  -- Card tips are owed to the barber; cash tips are already in their pocket
  -- and are reported for the record only.
  card_tips_cents  int NOT NULL DEFAULT 0,
  cash_tips_cents  int NOT NULL DEFAULT 0,
  adjustment_cents int NOT NULL DEFAULT 0,
  net_cents        int NOT NULL DEFAULT 0,
  status           text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','paid')),
  note             text,
  created_at       timestamptz NOT NULL DEFAULT now(),
  paid_at          timestamptz,
  UNIQUE (barber_id, period_start, period_end)
);

CREATE INDEX payout_periods_barber_idx ON payout_periods (barber_id, period_start DESC);
