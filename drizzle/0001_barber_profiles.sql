-- Barber profiles: bio/photo columns, per-barber service offerings with an
-- optional price override, and a work-photo gallery. ASCII only.

ALTER TABLE barbers ADD COLUMN bio text;
ALTER TABLE barbers ADD COLUMN tagline text;
ALTER TABLE barbers ADD COLUMN photo_file text;

CREATE TABLE barber_services (
  barber_id   uuid NOT NULL REFERENCES barbers(id) ON DELETE CASCADE,
  service_id  uuid NOT NULL REFERENCES services(id) ON DELETE CASCADE,
  -- NULL = use the shop's standard service price.
  price_cents int CHECK (price_cents >= 0),
  PRIMARY KEY (barber_id, service_id)
);

CREATE TABLE barber_photos (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  barber_id   uuid NOT NULL REFERENCES barbers(id) ON DELETE CASCADE,
  file_name   text NOT NULL,
  caption     text,
  sort_order  int NOT NULL DEFAULT 0,
  created_at  timestamptz NOT NULL DEFAULT now()
);
