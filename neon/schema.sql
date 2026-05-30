-- IFS Program Neon schema
-- Run this in the Neon SQL editor or with psql against DATABASE_URL.

CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS ifs_clients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clerk_user_id TEXT UNIQUE,
  pin VARCHAR(10) UNIQUE,
  name VARCHAR(255),
  email VARCHAR(255),
  phone VARCHAR(50),
  therapist_notes TEXT,
  user_role VARCHAR(20) DEFAULT 'client',
  status VARCHAR(20) DEFAULT 'active',
  onboarding_completed BOOLEAN DEFAULT false,
  access_restrictions JSONB,
  last_active TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS ifs_therapist_clients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  therapist_id VARCHAR(255) NOT NULL,
  therapist_name VARCHAR(255),
  client_id VARCHAR(255) NOT NULL,
  client_name VARCHAR(255),
  status VARCHAR(50) DEFAULT 'active',
  assigned_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  discharged_at TIMESTAMPTZ,
  -- Allows multiple therapists per client; this only prevents duplicate pair rows.
  UNIQUE (therapist_id, client_id)
);

CREATE TABLE IF NOT EXISTS ifs_assessment_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID REFERENCES ifs_clients(id) ON DELETE CASCADE,
  assessment_type VARCHAR(50) DEFAULT 'wound',
  abandonment_score NUMERIC,
  shame_score NUMERIC,
  neglect_score NUMERIC,
  betrayal_score NUMERIC,
  rejection_score NUMERIC,
  helplessness_score NUMERIC,
  primary_wound VARCHAR(50),
  secondary_wound VARCHAR(50),
  tertiary_wounds JSONB DEFAULT '[]',
  wound_scores JSONB,
  answers JSONB,
  responses JSONB,
  protector_types JSONB DEFAULT '[]',
  personalization_data JSONB,
  assessment_date TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS ifs_personalized_curriculum (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID REFERENCES ifs_clients(id) ON DELETE CASCADE,
  assessment_id UUID,
  module_id VARCHAR(100),
  module_order INTEGER,
  module_title TEXT,
  module_description TEXT,
  customized_content JSONB DEFAULT '{}',
  original_module_id VARCHAR(100),
  primary_wound_focus VARCHAR(50),
  customization_notes TEXT,
  estimated_minutes INTEGER DEFAULT 30,
  difficulty_level VARCHAR(20) DEFAULT 'beginner',
  prerequisite_modules JSONB DEFAULT '[]',
  curriculum_data JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (client_id, module_id)
);

CREATE TABLE IF NOT EXISTS ifs_client_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES ifs_clients(id) ON DELETE CASCADE,
  module_id VARCHAR(100) NOT NULL,
  activity_id VARCHAR(100),
  activity_type VARCHAR(100),
  current_step INTEGER DEFAULT 0,
  total_steps INTEGER,
  responses JSONB DEFAULT '{}',
  completed_steps JSONB DEFAULT '[]',
  interactive_data JSONB DEFAULT '{}',
  completed BOOLEAN DEFAULT false,
  is_completed BOOLEAN DEFAULT false,
  client_notes TEXT,
  insights TEXT,
  started_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  time_spent_minutes NUMERIC,
  last_accessed TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (client_id, module_id, activity_id),
  UNIQUE (client_id, module_id)
);

CREATE TABLE IF NOT EXISTS ifs_module_answers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES ifs_clients(id) ON DELETE CASCADE,
  module_id VARCHAR(100) NOT NULL,
  step_id VARCHAR(100) NOT NULL,
  answers JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (client_id, module_id, step_id)
);

CREATE TABLE IF NOT EXISTS ifs_journal_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES ifs_clients(id) ON DELETE CASCADE,
  title VARCHAR(500),
  content TEXT,
  mood VARCHAR(50),
  mood_intensity INTEGER,
  emotions JSONB DEFAULT '[]',
  tags JSONB DEFAULT '[]',
  parts_identified JSONB DEFAULT '[]',
  parts_dialogue JSONB DEFAULT '{}',
  related_wound VARCHAR(50),
  related_module VARCHAR(100),
  is_breakthrough BOOLEAN DEFAULT false,
  is_private BOOLEAN DEFAULT true,
  shared_with_therapist BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS ifs_parts (
  id VARCHAR(100) NOT NULL,
  client_id UUID NOT NULL REFERENCES ifs_clients(id) ON DELETE CASCADE,
  name VARCHAR(255),
  part_name VARCHAR(255),
  type VARCHAR(50),
  part_type VARCHAR(50),
  role TEXT,
  description TEXT,
  age_of_part TEXT,
  visual_representation TEXT,
  triggers JSONB DEFAULT '[]',
  behaviors JSONB DEFAULT '[]',
  positive_intentions JSONB DEFAULT '[]',
  burdens JSONB DEFAULT '[]',
  origin_story TEXT,
  trust_level INTEGER DEFAULT 5,
  willingness_to_unblend INTEGER DEFAULT 5,
  unburdening_status TEXT DEFAULT 'not_started',
  unburdening_date TIMESTAMPTZ,
  transformation_notes TEXT,
  related_wound VARCHAR(50),
  discovered_in_module VARCHAR(100),
  is_active BOOLEAN DEFAULT true,
  x NUMERIC,
  y NUMERIC,
  size NUMERIC DEFAULT 60,
  color VARCHAR(50),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (client_id, id),
  UNIQUE (client_id, part_name)
);

CREATE TABLE IF NOT EXISTS ifs_interactive_data (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES ifs_clients(id) ON DELETE CASCADE,
  module_id VARCHAR(100) NOT NULL,
  data JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (client_id, module_id)
);

CREATE TABLE IF NOT EXISTS ifs_exercise_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES ifs_clients(id) ON DELETE CASCADE,
  exercise_id VARCHAR(100) NOT NULL,
  completed BOOLEAN DEFAULT false,
  notes TEXT,
  completion_time NUMERIC,
  data JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (client_id, exercise_id)
);

CREATE TABLE IF NOT EXISTS ifs_mood_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES ifs_clients(id) ON DELETE CASCADE,
  mood INTEGER NOT NULL,
  energy INTEGER DEFAULT 5,
  emotions JSONB DEFAULT '[]',
  notes TEXT,
  date TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS ifs_therapy_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES ifs_clients(id) ON DELETE CASCADE,
  session_date DATE NOT NULL,
  therapist_notes TEXT,
  my_notes TEXT,
  parts_discussed TEXT,
  insights TEXT,
  next_session_goals TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS ifs_therapy_homework (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES ifs_clients(id) ON DELETE CASCADE,
  therapist_id UUID,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  category VARCHAR(50) DEFAULT 'general',
  priority VARCHAR(20) DEFAULT 'normal',
  due_date DATE,
  status VARCHAR(30) DEFAULT 'assigned',
  completed BOOLEAN DEFAULT false,
  completed_at TIMESTAMPTZ,
  completion_notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

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

CREATE TABLE IF NOT EXISTS ifs_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  therapist_id UUID NOT NULL,
  client_id UUID NOT NULL REFERENCES ifs_clients(id) ON DELETE CASCADE,
  sender_role VARCHAR(20) NOT NULL DEFAULT 'therapist',
  body TEXT NOT NULL,
  is_urgent BOOLEAN DEFAULT false,
  read_at TIMESTAMPTZ,
  boundary_acknowledged_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS ifs_parts_dialogue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES ifs_clients(id) ON DELETE CASCADE,
  part_id VARCHAR(100) NOT NULL,
  messages JSONB DEFAULT '[]',
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (client_id, part_id)
);

CREATE TABLE IF NOT EXISTS ifs_gamification (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL UNIQUE REFERENCES ifs_clients(id) ON DELETE CASCADE,
  xp INTEGER DEFAULT 0,
  level INTEGER DEFAULT 1,
  badges JSONB DEFAULT '{}',
  weekly_challenges JSONB DEFAULT '[]',
  streak_current INTEGER DEFAULT 0,
  streak_longest INTEGER DEFAULT 0,
  last_login_date DATE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS ifs_client_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL UNIQUE REFERENCES ifs_clients(id) ON DELETE CASCADE,
  theme JSONB DEFAULT '{}',
  animations_enabled BOOLEAN DEFAULT true,
  animation_speed VARCHAR(20) DEFAULT 'normal',
  favorite_affirmations JSONB DEFAULT '[]',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS ifs_therapist_feedback (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  therapist_id UUID NOT NULL,
  client_id UUID NOT NULL REFERENCES ifs_clients(id) ON DELETE CASCADE,
  module_id VARCHAR(100),
  step_id VARCHAR(100),
  feedback TEXT,
  flagged BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS ifs_therapist_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  therapist_id UUID,
  client_id UUID REFERENCES ifs_clients(id) ON DELETE CASCADE,
  note_type VARCHAR(50) DEFAULT 'session',
  content TEXT,
  session_date DATE,
  tagged_parts JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS ifs_therapy_activity_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES ifs_clients(id) ON DELETE CASCADE,
  activity_id VARCHAR(100) NOT NULL,
  progress_data JSONB DEFAULT '{}',
  completed BOOLEAN DEFAULT false,
  reflections JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (client_id, activity_id)
);

CREATE TABLE IF NOT EXISTS ifs_content_library (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title VARCHAR(255) NOT NULL,
  content_type VARCHAR(50),
  body TEXT,
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

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

CREATE TABLE IF NOT EXISTS ifs_uploads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clerk_user_id TEXT NOT NULL,
  client_id UUID REFERENCES ifs_clients(id) ON DELETE SET NULL,
  uploadthing_key TEXT NOT NULL UNIQUE,
  url TEXT NOT NULL,
  name TEXT,
  size BIGINT,
  type TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_clients_clerk_user ON ifs_clients(clerk_user_id);
CREATE INDEX IF NOT EXISTS idx_clients_pin ON ifs_clients(pin);
CREATE INDEX IF NOT EXISTS idx_journal_client ON ifs_journal_entries(client_id);
CREATE INDEX IF NOT EXISTS idx_progress_client ON ifs_client_progress(client_id);
CREATE INDEX IF NOT EXISTS idx_answers_client ON ifs_module_answers(client_id, module_id);
CREATE INDEX IF NOT EXISTS idx_parts_client ON ifs_parts(client_id);
CREATE INDEX IF NOT EXISTS idx_mood_client ON ifs_mood_entries(client_id);
CREATE INDEX IF NOT EXISTS idx_messages_client ON ifs_messages(client_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_uploads_user ON ifs_uploads(clerk_user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_therapist_clients_therapist_status ON ifs_therapist_clients(therapist_id, status);
CREATE INDEX IF NOT EXISTS idx_therapist_clients_client_status ON ifs_therapist_clients(client_id, status);
CREATE INDEX IF NOT EXISTS idx_assigned_homework_client_status ON ifs_assigned_homework(client_id, status);
CREATE INDEX IF NOT EXISTS idx_session_agendas_therapist_date ON ifs_session_agendas(therapist_id, session_date DESC);
CREATE INDEX IF NOT EXISTS idx_generated_reports_client_generated ON ifs_generated_reports(client_id, generated_at DESC);
CREATE INDEX IF NOT EXISTS idx_treatment_plans_client_status ON ifs_treatment_plans(client_id, status);
