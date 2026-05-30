-- Add display-name snapshots to therapist/client assignment rows so the table is readable in Neon.

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

COMMENT ON COLUMN ifs_therapist_clients.client_name IS
  'Display snapshot of the assigned client name for readable assignment tables.';
COMMENT ON COLUMN ifs_therapist_clients.therapist_name IS
  'Display snapshot of the assigned therapist name for readable assignment tables.';
