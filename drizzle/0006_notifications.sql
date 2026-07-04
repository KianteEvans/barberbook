-- In-app notifications + a reminder dedup ledger. ASCII only.

CREATE TABLE notifications (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id        uuid NOT NULL REFERENCES users(id),
  kind           text NOT NULL,   -- reminder | confirm_needed | released | promoted
  title          text NOT NULL,
  body           text NOT NULL,
  appointment_id uuid REFERENCES appointments(id),
  read_at        timestamptz,
  created_at     timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX notifications_user_idx ON notifications (user_id, created_at DESC);

-- One row per (appointment, offset, recipient) reminder actually sent, so the
-- tick worker is re-entrant at any cadence: a reminder is sent at most once.
CREATE TABLE reminder_log (
  appointment_id uuid NOT NULL REFERENCES appointments(id),
  offset_minutes int  NOT NULL,   -- 30 | 15
  recipient_kind text NOT NULL,   -- client | barber
  sent_at        timestamptz NOT NULL DEFAULT now(),
  UNIQUE (appointment_id, offset_minutes, recipient_kind)
);
