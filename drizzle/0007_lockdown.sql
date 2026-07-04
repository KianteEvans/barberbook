-- Attendance-confirmation lockdown + per-tier grace periods. ASCII only.

ALTER TABLE appointments
  ADD COLUMN hold_tier text CHECK (hold_tier IN ('member','deposit','unconfirmed')),
  ADD COLUMN grace_minutes int,
  ADD COLUMN attendance_confirmed_at timestamptz,
  ADD COLUMN confirmation_deadline timestamptz,
  ADD COLUMN cancel_reason text
    CHECK (cancel_reason IN ('client','admin','unconfirmed','promoted_out'));

-- Add the new 'reserved' hold status (non-member, awaiting confirmation).
ALTER TABLE appointments DROP CONSTRAINT appointments_status_check;
ALTER TABLE appointments ADD CONSTRAINT appointments_status_check
  CHECK (status IN ('pending_deposit','confirmed','reserved','completed','canceled','no_show'));

-- 'reserved' holds the slot too, so it joins the double-booking guard.
ALTER TABLE appointments DROP CONSTRAINT no_overlap;
ALTER TABLE appointments ADD CONSTRAINT no_overlap
  EXCLUDE USING gist (barber_id WITH =, tstzrange(start_at, end_at) WITH &&)
  WHERE (status IN ('pending_deposit','confirmed','reserved'));

ALTER TABLE shop_settings
  ADD COLUMN member_grace_minutes       int NOT NULL DEFAULT 15,
  ADD COLUMN deposit_grace_minutes      int NOT NULL DEFAULT 10,
  ADD COLUMN confirmation_window_minutes int NOT NULL DEFAULT 15;
