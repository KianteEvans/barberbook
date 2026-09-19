-- Let clients put themselves in the walk-in line from their phone. The token
-- is an unguessable handle so an unauthenticated client can check their spot
-- and leave the line without an account. ASCII only.

ALTER TABLE walk_ins ADD COLUMN join_token uuid NOT NULL DEFAULT gen_random_uuid();
ALTER TABLE walk_ins ADD COLUMN source text NOT NULL DEFAULT 'staff'
  CHECK (source IN ('staff','self','sms'));

CREATE UNIQUE INDEX walk_ins_join_token_idx ON walk_ins (join_token);

-- Owner controls: turn self-join off, and cap how long the line can get
-- (0 = no cap).
ALTER TABLE shop_settings ADD COLUMN self_join_enabled boolean NOT NULL DEFAULT true;
ALTER TABLE shop_settings ADD COLUMN queue_max_waiting int NOT NULL DEFAULT 20;
