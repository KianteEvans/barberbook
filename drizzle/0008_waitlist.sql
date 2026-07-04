-- Waitlist ("in-line") entries for a specific barber + timeslot. When the slot
-- frees, the highest-priority waiter is auto-booked. ASCII only.
CREATE TABLE waitlist_entries (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id        uuid NOT NULL REFERENCES users(id),
  barber_id        uuid NOT NULL REFERENCES barbers(id),
  service_id       uuid NOT NULL REFERENCES services(id),
  desired_start_at timestamptz NOT NULL,
  status           text NOT NULL DEFAULT 'waiting'
    CHECK (status IN ('waiting','promoted','expired','canceled')),
  created_at       timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX waitlist_lookup_idx
  ON waitlist_entries (barber_id, desired_start_at, status);
