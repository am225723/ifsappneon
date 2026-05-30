-- Make the assignment cardinality explicit: one client can have multiple active therapists.
-- Only duplicate therapist/client pairs are prevented.

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conrelid = 'ifs_therapist_clients'::regclass
      AND conname = 'ifs_therapist_clients_client_id_key'
  ) THEN
    ALTER TABLE ifs_therapist_clients
      DROP CONSTRAINT ifs_therapist_clients_client_id_key;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conrelid = 'ifs_therapist_clients'::regclass
      AND contype = 'u'
      AND conkey = ARRAY[
        (SELECT attnum FROM pg_attribute WHERE attrelid = 'ifs_therapist_clients'::regclass AND attname = 'therapist_id'),
        (SELECT attnum FROM pg_attribute WHERE attrelid = 'ifs_therapist_clients'::regclass AND attname = 'client_id')
      ]::smallint[]
  ) THEN
    ALTER TABLE ifs_therapist_clients
      ADD CONSTRAINT ifs_therapist_clients_therapist_id_client_id_key
      UNIQUE (therapist_id, client_id);
  END IF;
END $$;

COMMENT ON TABLE ifs_therapist_clients IS
  'Assignment join table. Allows multiple therapists per client and multiple clients per therapist.';
COMMENT ON COLUMN ifs_therapist_clients.client_id IS
  'Client identifier. This column is intentionally not unique so a client can be assigned to multiple therapists.';
COMMENT ON COLUMN ifs_therapist_clients.therapist_id IS
  'Therapist identifier. Pair uniqueness is enforced with client_id to avoid duplicate assignments only.';
