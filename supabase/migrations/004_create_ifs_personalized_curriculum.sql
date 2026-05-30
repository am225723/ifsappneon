-- =====================================================
-- Migration 004: IFS_PERSONALIZED_CURRICULUM TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS ifs_personalized_curriculum (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  client_id UUID REFERENCES ifs_clients(id) ON DELETE CASCADE,
  assessment_id UUID REFERENCES ifs_assessment_results(id) ON DELETE CASCADE,

  module_id VARCHAR(100) NOT NULL,
  module_order INTEGER NOT NULL,
  module_title TEXT NOT NULL,
  module_description TEXT,

  customized_content JSONB NOT NULL,
  original_module_id VARCHAR(100),

  primary_wound_focus VARCHAR(50),
  customization_notes TEXT,

  estimated_minutes INTEGER,
  difficulty_level VARCHAR(20),

  prerequisite_modules TEXT[],

  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  UNIQUE(client_id, module_id)
);

CREATE INDEX IF NOT EXISTS idx_ifs_curriculum_client ON ifs_personalized_curriculum(client_id);
CREATE INDEX IF NOT EXISTS idx_ifs_curriculum_module ON ifs_personalized_curriculum(module_id);
CREATE INDEX IF NOT EXISTS idx_ifs_curriculum_order ON ifs_personalized_curriculum(client_id, module_order);
