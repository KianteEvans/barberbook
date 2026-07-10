-- Private staff notes about a client (CRM). ASCII only.

CREATE TABLE client_notes (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id  uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  author_id  uuid REFERENCES users(id),          -- staff who wrote it (NULL if removed)
  body       text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX client_notes_client_idx ON client_notes (client_id, created_at DESC);
