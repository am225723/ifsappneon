-- =====================================================
-- Migration 010: IFS_MILESTONES TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS ifs_milestones (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  client_id UUID REFERENCES ifs_clients(id) ON DELETE CASCADE,

  milestone_type VARCHAR(50),
  title VARCHAR(255) NOT NULL,
  description TEXT,

  related_module VARCHAR(100),
  related_wound VARCHAR(50),
  related_part VARCHAR(255),

  achieved_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  celebration_message TEXT,

  badge_earned VARCHAR(100),
  points_earned INTEGER DEFAULT 0,

  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ifs_milestones_client ON ifs_milestones(client_id);
CREATE INDEX IF NOT EXISTS idx_ifs_milestones_type ON ifs_milestones(milestone_type);
CREATE INDEX IF NOT EXISTS idx_ifs_milestones_date ON ifs_milestones(achieved_at DESC);
