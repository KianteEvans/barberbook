-- Customer testimonials shown on the public gallery page. Optional star
-- rating and optional attribution to a barber. ASCII only.
CREATE TABLE testimonials (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  author_name  text NOT NULL,
  quote        text NOT NULL,
  rating       int CHECK (rating BETWEEN 1 AND 5),
  barber_id    uuid REFERENCES barbers(id) ON DELETE SET NULL,
  featured     boolean NOT NULL DEFAULT true,
  sort_order   int NOT NULL DEFAULT 0,
  created_at   timestamptz NOT NULL DEFAULT now()
);
