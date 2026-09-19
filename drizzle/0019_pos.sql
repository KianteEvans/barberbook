-- Point of sale: ring up a service, a product, or anything else, with or
-- without an appointment behind it. Money previously stopped at the
-- appointment; this is the shop's register. ASCII only.

CREATE TABLE sales (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  -- Who rang it and who it was for; both optional (walk-ups are anonymous).
  barber_id      uuid REFERENCES barbers(id),
  client_id      uuid REFERENCES users(id),
  -- Set when checking out a booked visit rather than a bare sale.
  appointment_id uuid REFERENCES appointments(id),
  subtotal_cents int NOT NULL DEFAULT 0,
  discount_cents int NOT NULL DEFAULT 0,
  tip_cents      int NOT NULL DEFAULT 0,
  total_cents    int NOT NULL DEFAULT 0,
  tender         text NOT NULL CHECK (tender IN ('cash','card','other')),
  status         text NOT NULL DEFAULT 'paid' CHECK (status IN ('paid','voided')),
  note           text,
  created_at     timestamptz NOT NULL DEFAULT now(),
  voided_at      timestamptz
);

CREATE INDEX sales_created_idx ON sales (created_at DESC);
CREATE INDEX sales_barber_idx ON sales (barber_id, created_at DESC);

-- Name and price are frozen at sale time so later edits never rewrite history.
CREATE TABLE sale_items (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sale_id          uuid NOT NULL REFERENCES sales(id) ON DELETE CASCADE,
  kind             text NOT NULL CHECK (kind IN ('service','product','custom')),
  service_id       uuid REFERENCES services(id),
  product_id       uuid,
  name_snapshot    text NOT NULL,
  unit_price_cents int NOT NULL,
  qty              int NOT NULL DEFAULT 1 CHECK (qty > 0),
  line_total_cents int NOT NULL
);

CREATE INDEX sale_items_sale_idx ON sale_items (sale_id);

-- The ledger learns about register sales, and how every payment was tendered.
ALTER TABLE payments DROP CONSTRAINT payments_type_check;
ALTER TABLE payments ADD CONSTRAINT payments_type_check
  CHECK (type IN ('deposit','remainder','refund','no_show_fee','subscription','tip','sale'));

ALTER TABLE payments ADD COLUMN sale_id uuid REFERENCES sales(id);
ALTER TABLE payments ADD COLUMN tender text CHECK (tender IN ('cash','card','other'));
