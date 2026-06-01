-- P0 therapist-client assignment table for Neon.
-- This table uses ifs_clients.id UUIDs for both therapists and clients.

CREATE TABLE IF NOT EXISTS ifs_therapist_clients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  therapist_id UUID NOT NULL REFERENCES ifs_clients(id) ON DELETE CASCADE,
  client_id UUID NOT NULL REFERENCES ifs_clients(id) ON DELETE CASCADE,
  status VARCHAR(50) DEFAULT 'active',
  assigned_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  discharged_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(therapist_id, client_id)
);

ALTER TABLE ifs_therapist_clients
  ADD COLUMN IF NOT EXISTS therapist_name VARCHAR(255),
  ADD COLUMN IF NOT EXISTS client_name VARCHAR(255),
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP;


-- If an older schema created these columns as text/varchar, convert them to UUID.
-- This assumes legacy values already contain ifs_clients.id UUIDs, not Clerk IDs.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'ifs_therapist_clients'
      AND column_name = 'therapist_id'
      AND data_type <> 'uuid'
  ) THEN
    ALTER TABLE ifs_therapist_clients
      ALTER COLUMN therapist_id TYPE UUID USING therapist_id::uuid;
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'ifs_therapist_clients'
      AND column_name = 'client_id'
      AND data_type <> 'uuid'
  ) THEN
    ALTER TABLE ifs_therapist_clients
      ALTER COLUMN client_id TYPE UUID USING client_id::uuid;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_ifs_therapist_clients_therapist
ON ifs_therapist_clients(therapist_id, status);

CREATE INDEX IF NOT EXISTS idx_ifs_therapist_clients_client
ON ifs_therapist_clients(client_id, status);
