-- Post-visit customer reviews (rating + comment), admin-moderated before they
-- appear on the public gallery. ASCII only.
CREATE TABLE reviews (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  appointment_id uuid NOT NULL UNIQUE REFERENCES appointments(id) ON DELETE CASCADE,
  client_id      uuid NOT NULL REFERENCES users(id),
  barber_id      uuid NOT NULL REFERENCES barbers(id),
  rating         int NOT NULL CHECK (rating BETWEEN 1 AND 5),
  comment        text,
  status         text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending','approved','rejected')),
  created_at     timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX reviews_status_idx ON reviews (status, created_at DESC);
