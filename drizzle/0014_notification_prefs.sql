-- Per-user channel opt-outs + re-engagement nudge bookkeeping. ASCII only.

ALTER TABLE users ADD COLUMN email_opt_out boolean NOT NULL DEFAULT false;
ALTER TABLE users ADD COLUMN sms_opt_out   boolean NOT NULL DEFAULT false;

-- One row per (client, nudge kind); the tick upserts last_sent_at for cooldown.
CREATE TABLE client_nudges (
  client_id    uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  kind         text NOT NULL,
  last_sent_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (client_id, kind)
);

-- Admin-tunable nudge timing (0 = that nudge is off).
ALTER TABLE shop_settings ADD COLUMN rebook_after_days  int NOT NULL DEFAULT 0;
ALTER TABLE shop_settings ADD COLUMN winback_after_days int NOT NULL DEFAULT 0;
