-- Promo/discount codes + loyalty punch-card. ASCII only.

CREATE TABLE discount_codes (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code        text NOT NULL UNIQUE,
  kind        text NOT NULL CHECK (kind IN ('percent','fixed')),
  amount      int NOT NULL CHECK (amount >= 0),   -- percent (1-100) or cents
  active      boolean NOT NULL DEFAULT true,
  max_uses    int,                                -- NULL = unlimited
  used_count  int NOT NULL DEFAULT 0,
  expires_at  timestamptz,
  created_at  timestamptz NOT NULL DEFAULT now()
);

-- Discount applied to a booking (for the ledger / receipt).
ALTER TABLE appointments ADD COLUMN discount_code text;
ALTER TABLE appointments ADD COLUMN discount_cents int NOT NULL DEFAULT 0;

-- Loyalty punch-card: one row per client, granting a free cut every Nth visit.
CREATE TABLE loyalty (
  client_id       uuid PRIMARY KEY REFERENCES users(id),
  completed_count int NOT NULL DEFAULT 0,
  free_credits    int NOT NULL DEFAULT 0
);

ALTER TABLE shop_settings ADD COLUMN loyalty_every_n int NOT NULL DEFAULT 0;
