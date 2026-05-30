-- =====================================================
-- Migration 005: IFS_CLIENT_PROGRESS TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS ifs_client_progress (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  client_id UUID REFERENCES ifs_clients(id) ON DELETE CASCADE,
  module_id VARCHAR(100) NOT NULL,

  current_step INTEGER DEFAULT 0,
  total_steps INTEGER,
  completed_steps INTEGER[] DEFAULT '{}',

  activity_id VARCHAR(100),
  activity_type VARCHAR(50),
  completed BOOLEAN DEFAULT FALSE,

  responses JSONB,
  client_notes TEXT,
  insights TEXT,

  started_at TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE,
  time_spent_minutes INTEGER,

  revisit_count INTEGER DEFAULT 0,
  last_accessed TIMESTAMP WITH TIME ZONE,

  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ifs_progress_client ON ifs_client_progress(client_id);
CREATE INDEX IF NOT EXISTS idx_ifs_progress_module ON ifs_client_progress(client_id, module_id);
CREATE INDEX IF NOT EXISTS idx_ifs_progress_completed ON ifs_client_progress(completed);
CREATE INDEX IF NOT EXISTS idx_ifs_progress_activity ON ifs_client_progress(activity_id);
