-- Therapist-client integration, assignments, reporting, and clinical planning foundation.

CREATE TABLE IF NOT EXISTS ifs_therapist_clients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  therapist_id VARCHAR(255) NOT NULL,
  therapist_name VARCHAR(255),
  client_id VARCHAR(255) NOT NULL,
  client_name VARCHAR(255),
  status VARCHAR(50) DEFAULT 'active',
  assigned_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  discharged_at TIMESTAMPTZ,
  UNIQUE (therapist_id, client_id)
);

CREATE INDEX IF NOT EXISTS idx_therapist_clients_therapist_status
  ON ifs_therapist_clients(therapist_id, status);
CREATE INDEX IF NOT EXISTS idx_therapist_clients_client_status
  ON ifs_therapist_clients(client_id, status);


INSERT INTO ifs_therapist_clients (therapist_id, therapist_name, client_id, client_name, status, assigned_at)
SELECT DISTINCT m.therapist_id::text, therapist.name, m.client_id::text, client.name, 'active', COALESCE(MIN(m.created_at), CURRENT_TIMESTAMP)
FROM ifs_messages m
LEFT JOIN ifs_clients therapist ON therapist.id::text = m.therapist_id::text OR therapist.clerk_user_id = m.therapist_id::text
LEFT JOIN ifs_clients client ON client.id::text = m.client_id::text OR client.clerk_user_id = m.client_id::text
WHERE m.therapist_id IS NOT NULL AND m.client_id IS NOT NULL
GROUP BY m.therapist_id, therapist.name, m.client_id, client.name
ON CONFLICT (therapist_id, client_id) DO NOTHING;

INSERT INTO ifs_therapist_clients (therapist_id, therapist_name, client_id, client_name, status, assigned_at)
SELECT DISTINCT h.therapist_id::text, therapist.name, h.client_id::text, client.name, 'active', COALESCE(MIN(h.created_at), CURRENT_TIMESTAMP)
FROM ifs_therapy_homework h
LEFT JOIN ifs_clients therapist ON therapist.id::text = h.therapist_id::text OR therapist.clerk_user_id = h.therapist_id::text
LEFT JOIN ifs_clients client ON client.id::text = h.client_id::text OR client.clerk_user_id = h.client_id::text
WHERE h.therapist_id IS NOT NULL AND h.client_id IS NOT NULL
GROUP BY h.therapist_id, therapist.name, h.client_id, client.name
ON CONFLICT (therapist_id, client_id) DO NOTHING;

INSERT INTO ifs_therapist_clients (therapist_id, therapist_name, client_id, client_name, status, assigned_at)
SELECT DISTINCT n.therapist_id::text, therapist.name, n.client_id::text, client.name, 'active', COALESCE(MIN(n.created_at), CURRENT_TIMESTAMP)
FROM ifs_therapist_notes n
LEFT JOIN ifs_clients therapist ON therapist.id::text = n.therapist_id::text OR therapist.clerk_user_id = n.therapist_id::text
LEFT JOIN ifs_clients client ON client.id::text = n.client_id::text OR client.clerk_user_id = n.client_id::text
WHERE n.therapist_id IS NOT NULL AND n.client_id IS NOT NULL
GROUP BY n.therapist_id, therapist.name, n.client_id, client.name
ON CONFLICT (therapist_id, client_id) DO NOTHING;

CREATE TABLE IF NOT EXISTS ifs_assigned_homework (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  therapist_id VARCHAR(255) NOT NULL,
  client_id VARCHAR(255) NOT NULL,
  module_id VARCHAR(255) NOT NULL,
  status VARCHAR(50) DEFAULT 'assigned',
  therapist_feedback TEXT,
  assigned_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  completed_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_assigned_homework_client_status
  ON ifs_assigned_homework(client_id, status);
CREATE INDEX IF NOT EXISTS idx_assigned_homework_therapist_client
  ON ifs_assigned_homework(therapist_id, client_id);

CREATE TABLE IF NOT EXISTS ifs_session_agendas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id VARCHAR(255) NOT NULL,
  therapist_id VARCHAR(255) NOT NULL,
  topics TEXT NOT NULL,
  active_parts JSONB DEFAULT '[]'::jsonb,
  stuck_points TEXT,
  session_date DATE,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_session_agendas_therapist_date
  ON ifs_session_agendas(therapist_id, session_date DESC);
CREATE INDEX IF NOT EXISTS idx_session_agendas_client_date
  ON ifs_session_agendas(client_id, session_date DESC);

ALTER TABLE ifs_messages
  ADD COLUMN IF NOT EXISTS is_urgent BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS boundary_acknowledged_at TIMESTAMPTZ;

ALTER TABLE ifs_therapist_notes
  ADD COLUMN IF NOT EXISTS tagged_parts JSONB DEFAULT '[]'::jsonb;

CREATE TABLE IF NOT EXISTS ifs_generated_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  therapist_id VARCHAR(255) NOT NULL,
  client_id VARCHAR(255) NOT NULL,
  report_type VARCHAR(100) DEFAULT 'clinical',
  options JSONB DEFAULT '{}'::jsonb,
  storage_url TEXT NOT NULL,
  generated_by VARCHAR(255),
  generated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_generated_reports_client_generated
  ON ifs_generated_reports(client_id, generated_at DESC);
CREATE INDEX IF NOT EXISTS idx_generated_reports_therapist_generated
  ON ifs_generated_reports(therapist_id, generated_at DESC);

CREATE TABLE IF NOT EXISTS ifs_treatment_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id VARCHAR(255) NOT NULL,
  therapist_id VARCHAR(255) NOT NULL,
  goal_title VARCHAR(255) NOT NULL,
  target_wounds JSONB DEFAULT '[]'::jsonb,
  status VARCHAR(50) DEFAULT 'active',
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_treatment_plans_client_status
  ON ifs_treatment_plans(client_id, status);
CREATE INDEX IF NOT EXISTS idx_treatment_plans_therapist_status
  ON ifs_treatment_plans(therapist_id, status);
