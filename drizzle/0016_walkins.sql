-- In-shop walk-in queue. barber_id NULL = "first available chair". ASCII only.

CREATE TABLE walk_ins (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  barber_id  uuid REFERENCES barbers(id),
  name       text NOT NULL,
  phone      text,
  service_id uuid REFERENCES services(id),
  status     text NOT NULL DEFAULT 'waiting'
    CHECK (status IN ('waiting','serving','done','no_show','canceled')),
  created_at timestamptz NOT NULL DEFAULT now(),
  called_at  timestamptz,
  done_at    timestamptz
);

CREATE INDEX walk_ins_queue_idx ON walk_ins (status, created_at);
