-- ============================================================
-- IFS Self-Therapy Program - Complete Database Schema
-- Run this entire file in your Supabase SQL Editor
-- All statements use CREATE TABLE IF NOT EXISTS for safety
-- ============================================================

-- 1. Clients table (users)
CREATE TABLE IF NOT EXISTS ifs_clients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pin VARCHAR(10) NOT NULL UNIQUE,
  name VARCHAR(255),
  email VARCHAR(255),
  user_role VARCHAR(20) DEFAULT 'client',
  status VARCHAR(20) DEFAULT 'active',
  onboarding_completed BOOLEAN DEFAULT false,
  last_active TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Assessment results
CREATE TABLE IF NOT EXISTS ifs_assessment_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID REFERENCES ifs_clients(id) ON DELETE CASCADE,
  assessment_type VARCHAR(50) DEFAULT 'wound',
  abandonment_score NUMERIC,
  shame_score NUMERIC,
  neglect_score NUMERIC,
  betrayal_score NUMERIC,
  rejection_score NUMERIC, -- maps to "Helplessness" wound in the UI
  primary_wound VARCHAR(50),
  secondary_wound VARCHAR(50),
  wound_scores JSONB,
  answers JSONB,
  personalization_data JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  CONSTRAINT unique_client_assessment UNIQUE (client_id, assessment_type)
);

-- 3. Personalized curriculum
CREATE TABLE IF NOT EXISTS ifs_personalized_curriculum (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID REFERENCES ifs_clients(id) ON DELETE CASCADE,
  curriculum_data JSONB NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  CONSTRAINT unique_client_curriculum UNIQUE (client_id)
);

-- 4. Client progress (module completion)
CREATE TABLE IF NOT EXISTS ifs_client_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL,
  module_id VARCHAR(100) NOT NULL,
  current_step INTEGER DEFAULT 0,
  responses JSONB DEFAULT '{}',
  completed_steps JSONB DEFAULT '[]',
  interactive_data JSONB DEFAULT '{}',
  is_completed BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  CONSTRAINT unique_client_module UNIQUE (client_id, module_id)
);

-- 5. Module answers (question responses)
CREATE TABLE IF NOT EXISTS ifs_module_answers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL,
  module_id VARCHAR(100) NOT NULL,
  step_id VARCHAR(100) NOT NULL,
  answers JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  CONSTRAINT unique_client_module_step UNIQUE (client_id, module_id, step_id)
);

-- 6. Journal entries
CREATE TABLE IF NOT EXISTS ifs_journal_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL,
  title VARCHAR(500),
  content TEXT,
  mood VARCHAR(50),
  tags JSONB DEFAULT '[]',
  parts_identified JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 7. Parts mapping
CREATE TABLE IF NOT EXISTS ifs_parts (
  id VARCHAR(100) NOT NULL,
  client_id UUID NOT NULL,
  name VARCHAR(255),
  type VARCHAR(50),
  role TEXT,
  description TEXT,
  triggers JSONB,
  positive_intentions JSONB,
  x NUMERIC,
  y NUMERIC,
  size NUMERIC DEFAULT 60,
  color VARCHAR(50),
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  PRIMARY KEY (client_id, id)
);

-- 8. Interactive data (generic key-value for modules)
CREATE TABLE IF NOT EXISTS ifs_interactive_data (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL,
  module_id VARCHAR(100) NOT NULL,
  data JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  CONSTRAINT unique_interactive UNIQUE (client_id, module_id)
);

-- 9. Exercise progress
CREATE TABLE IF NOT EXISTS ifs_exercise_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL,
  exercise_id VARCHAR(100) NOT NULL,
  completed BOOLEAN DEFAULT false,
  notes TEXT,
  completion_time NUMERIC,
  data JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  CONSTRAINT unique_exercise UNIQUE (client_id, exercise_id)
);

-- 10. Therapist notes
CREATE TABLE IF NOT EXISTS ifs_therapist_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  therapist_id UUID REFERENCES ifs_clients(id) ON DELETE CASCADE,
  client_id UUID REFERENCES ifs_clients(id) ON DELETE CASCADE,
  note_type VARCHAR(50) DEFAULT 'session',
  content TEXT,
  session_date DATE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 11. Milestones
CREATE TABLE IF NOT EXISTS ifs_milestones (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL,
  type VARCHAR(50) NOT NULL,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  details TEXT,
  date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 12. Content library
CREATE TABLE IF NOT EXISTS ifs_content_library (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title VARCHAR(255) NOT NULL,
  content_type VARCHAR(50),
  body TEXT,
  metadata JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================================
-- NEW TABLES (for removing all localStorage)
-- ============================================================

-- 13. Mood & Energy entries
CREATE TABLE IF NOT EXISTS ifs_mood_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL,
  mood INTEGER NOT NULL,
  energy INTEGER DEFAULT 5,
  emotions JSONB DEFAULT '[]',
  notes TEXT,
  date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 14. Therapy sessions (client-recorded)
CREATE TABLE IF NOT EXISTS ifs_therapy_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL,
  session_date DATE NOT NULL,
  therapist_notes TEXT,
  my_notes TEXT,
  parts_discussed TEXT,
  insights TEXT,
  next_session_goals TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 15. Therapy homework
CREATE TABLE IF NOT EXISTS ifs_therapy_homework (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL,
  therapist_id UUID,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  category VARCHAR(50) DEFAULT 'general',
  priority VARCHAR(20) DEFAULT 'normal',
  due_date DATE,
  status VARCHAR(30) DEFAULT 'assigned',
  completed BOOLEAN DEFAULT false,
  completed_at TIMESTAMP WITH TIME ZONE,
  completion_notes TEXT,
  activity_blocks JSONB DEFAULT '[]'::jsonb,
  interactive_responses JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 15b. Messages
CREATE TABLE IF NOT EXISTS ifs_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  therapist_id UUID NOT NULL,
  client_id UUID NOT NULL,
  sender_role VARCHAR(20) NOT NULL DEFAULT 'therapist',
  body TEXT NOT NULL,
  read_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_messages_client ON ifs_messages(client_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_messages_therapist ON ifs_messages(therapist_id, created_at DESC);

-- 16. Parts dialogue history
CREATE TABLE IF NOT EXISTS ifs_parts_dialogue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL,
  part_id VARCHAR(100) NOT NULL,
  messages JSONB DEFAULT '[]',
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  CONSTRAINT unique_dialogue UNIQUE (client_id, part_id)
);

-- 17. Gamification data (XP, badges, streaks, challenges)
CREATE TABLE IF NOT EXISTS ifs_gamification (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL UNIQUE,
  xp INTEGER DEFAULT 0,
  level INTEGER DEFAULT 1,
  badges JSONB DEFAULT '{}',
  weekly_challenges JSONB DEFAULT '[]',
  streak_current INTEGER DEFAULT 0,
  streak_longest INTEGER DEFAULT 0,
  last_login_date DATE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 18. Client preferences (theme, animations, favorites)
CREATE TABLE IF NOT EXISTS ifs_client_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL UNIQUE,
  theme JSONB DEFAULT '{}',
  animations_enabled BOOLEAN DEFAULT true,
  animation_speed VARCHAR(20) DEFAULT 'normal',
  favorite_affirmations JSONB DEFAULT '[]',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 19. Therapist feedback on client answers
CREATE TABLE IF NOT EXISTS ifs_therapist_feedback (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  therapist_id UUID NOT NULL,
  client_id UUID NOT NULL,
  module_id VARCHAR(100),
  step_id VARCHAR(100),
  feedback TEXT,
  flagged BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 20. Therapy activity progress
CREATE TABLE IF NOT EXISTS ifs_therapy_activity_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL,
  activity_id VARCHAR(100) NOT NULL,
  progress_data JSONB DEFAULT '{}',
  completed BOOLEAN DEFAULT false,
  reflections JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  CONSTRAINT unique_therapy_activity UNIQUE (client_id, activity_id)
);

-- ============================================================
-- INDEXES for performance
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_journal_client ON ifs_journal_entries(client_id);
CREATE INDEX IF NOT EXISTS idx_journal_date ON ifs_journal_entries(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_progress_client ON ifs_client_progress(client_id);
CREATE INDEX IF NOT EXISTS idx_answers_client ON ifs_module_answers(client_id, module_id);
CREATE INDEX IF NOT EXISTS idx_parts_client ON ifs_parts(client_id);
CREATE INDEX IF NOT EXISTS idx_exercise_client ON ifs_exercise_progress(client_id);
CREATE INDEX IF NOT EXISTS idx_mood_client ON ifs_mood_entries(client_id);
CREATE INDEX IF NOT EXISTS idx_mood_date ON ifs_mood_entries(date DESC);
CREATE INDEX IF NOT EXISTS idx_milestones_client ON ifs_milestones(client_id);
CREATE INDEX IF NOT EXISTS idx_therapy_sessions_client ON ifs_therapy_sessions(client_id);
CREATE INDEX IF NOT EXISTS idx_gamification_client ON ifs_gamification(client_id);
CREATE INDEX IF NOT EXISTS idx_dialogue_client ON ifs_parts_dialogue(client_id);
CREATE INDEX IF NOT EXISTS idx_preferences_client ON ifs_client_preferences(client_id);
CREATE INDEX IF NOT EXISTS idx_assessment_client ON ifs_assessment_results(client_id);
CREATE INDEX IF NOT EXISTS idx_feedback_client ON ifs_therapist_feedback(client_id);
CREATE INDEX IF NOT EXISTS idx_activity_progress_client ON ifs_therapy_activity_progress(client_id);

-- ============================================================
-- ROW LEVEL SECURITY (RLS) - Enable for all tables
-- ============================================================
ALTER TABLE ifs_clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE ifs_assessment_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE ifs_personalized_curriculum ENABLE ROW LEVEL SECURITY;
ALTER TABLE ifs_client_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE ifs_module_answers ENABLE ROW LEVEL SECURITY;
ALTER TABLE ifs_journal_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE ifs_parts ENABLE ROW LEVEL SECURITY;
ALTER TABLE ifs_interactive_data ENABLE ROW LEVEL SECURITY;
ALTER TABLE ifs_exercise_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE ifs_therapist_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE ifs_milestones ENABLE ROW LEVEL SECURITY;
ALTER TABLE ifs_content_library ENABLE ROW LEVEL SECURITY;
ALTER TABLE ifs_mood_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE ifs_therapy_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE ifs_therapy_homework ENABLE ROW LEVEL SECURITY;
ALTER TABLE ifs_parts_dialogue ENABLE ROW LEVEL SECURITY;
ALTER TABLE ifs_gamification ENABLE ROW LEVEL SECURITY;
ALTER TABLE ifs_client_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE ifs_therapist_feedback ENABLE ROW LEVEL SECURITY;
ALTER TABLE ifs_therapy_activity_progress ENABLE ROW LEVEL SECURITY;

-- RLS Policies: Allow anon key full access (PIN-based auth, not Supabase Auth)
-- Since this app uses PIN-based auth (not Supabase Auth), we allow anon access
-- The app handles authorization via PIN validation in the frontend

DO $$ 
DECLARE
  t TEXT;
BEGIN
  FOR t IN 
    SELECT unnest(ARRAY[
      'ifs_clients', 'ifs_assessment_results', 'ifs_personalized_curriculum',
      'ifs_client_progress', 'ifs_module_answers', 'ifs_journal_entries',
      'ifs_parts', 'ifs_interactive_data', 'ifs_exercise_progress',
      'ifs_therapist_notes', 'ifs_milestones', 'ifs_content_library',
      'ifs_mood_entries', 'ifs_therapy_sessions', 'ifs_therapy_homework',
      'ifs_parts_dialogue', 'ifs_gamification', 'ifs_client_preferences',
      'ifs_therapist_feedback', 'ifs_therapy_activity_progress'
    ])
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS "Allow anon access" ON %I', t);
    EXECUTE format('CREATE POLICY "Allow anon access" ON %I FOR ALL USING (true) WITH CHECK (true)', t);
  END LOOP;
END $$;

-- ============================================================
-- EDGE FUNCTION: create-client (deploy via Supabase CLI)
-- File: supabase/functions/create-client/index.ts
-- Generates a new client with a unique 6-digit PIN
-- ============================================================
-- Note: Edge functions must be deployed separately via Supabase CLI
-- See supabase/functions/create-client/index.ts for the function code
