-- =====================================================
-- Migration 008: IFS_EXERCISE_PROGRESS TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS ifs_exercise_progress (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  client_id UUID REFERENCES ifs_clients(id) ON DELETE CASCADE,

  exercise_id VARCHAR(100) NOT NULL,
  exercise_title VARCHAR(255),
  exercise_type VARCHAR(50),

  completed BOOLEAN DEFAULT FALSE,
  completion_date TIMESTAMP WITH TIME ZONE,
  completion_time_minutes INTEGER,

  difficulty_rating INTEGER CHECK (difficulty_rating >= 1 AND difficulty_rating <= 5),
  helpfulness_rating INTEGER CHECK (helpfulness_rating >= 1 AND helpfulness_rating <= 5),
  emotional_intensity INTEGER CHECK (emotional_intensity >= 1 AND emotional_intensity <= 10),

  notes TEXT,
  insights TEXT,
  challenges TEXT,
  breakthroughs TEXT,

  parts_accessed TEXT[],
  self_energy_level INTEGER CHECK (self_energy_level >= 1 AND self_energy_level <= 10),

  wants_to_revisit BOOLEAN DEFAULT FALSE,
  revisit_count INTEGER DEFAULT 0,

  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  UNIQUE(client_id, exercise_id)
);

CREATE INDEX IF NOT EXISTS idx_ifs_exercise_client ON ifs_exercise_progress(client_id);
CREATE INDEX IF NOT EXISTS idx_ifs_exercise_completed ON ifs_exercise_progress(completed);
CREATE INDEX IF NOT EXISTS idx_ifs_exercise_type ON ifs_exercise_progress(exercise_type);
