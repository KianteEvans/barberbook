-- Flexible ("any time that day") waitlist entries + open-slot alert throttle.
-- For flexible rows desired_start_at stores the END of the shop-local day so
-- the existing expiry sweep works unchanged; desired_date carries the day.
-- ASCII only.

ALTER TABLE waitlist_entries ADD COLUMN flexible boolean NOT NULL DEFAULT false;
ALTER TABLE waitlist_entries ADD COLUMN desired_date date;
ALTER TABLE waitlist_entries ADD COLUMN last_notified_at timestamptz;

-- Harden join idempotency (was app-level only).
CREATE UNIQUE INDEX waitlist_waiting_unique
  ON waitlist_entries (client_id, barber_id, desired_start_at)
  WHERE status = 'waiting';
