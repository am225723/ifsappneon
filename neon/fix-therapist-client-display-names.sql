-- Dashboard-safe repair for existing databases where ifs_therapist_clients
-- was created before therapist_name/client_name display columns were added.
-- Run this whole file in Neon SQL Editor or Supabase SQL Editor, then the
-- final SELECT will show readable assignment rows.

ALTER TABLE ifs_therapist_clients
  ADD COLUMN IF NOT EXISTS therapist_name VARCHAR(255),
  ADD COLUMN IF NOT EXISTS client_name VARCHAR(255);

UPDATE ifs_therapist_clients assignment
SET
  therapist_name = COALESCE(
    assignment.therapist_name,
    (
      SELECT therapist.name
      FROM ifs_clients therapist
      WHERE therapist.id::text = assignment.therapist_id
         OR therapist.clerk_user_id = assignment.therapist_id
      LIMIT 1
    )
  ),
  client_name = COALESCE(
    assignment.client_name,
    (
      SELECT client.name
      FROM ifs_clients client
      WHERE client.id::text = assignment.client_id
         OR client.clerk_user_id = assignment.client_id
      LIMIT 1
    )
  )
WHERE assignment.client_name IS NULL OR assignment.therapist_name IS NULL;

SELECT
  therapist_id,
  therapist_name,
  client_id,
  client_name,
  status,
  assigned_at
FROM ifs_therapist_clients
ORDER BY assigned_at DESC;
