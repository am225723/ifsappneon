-- =====================================================
-- Migration 011: IFS_CONTENT_LIBRARY TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS ifs_content_library (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

  content_type VARCHAR(50),
  title VARCHAR(255) NOT NULL,
  description TEXT,

  content JSONB,
  url TEXT,
  file_path TEXT,

  wound_types TEXT[],
  module_ids TEXT[],
  tags TEXT[],
  difficulty_level VARCHAR(20),

  author VARCHAR(255),
  source VARCHAR(255),
  evidence_based BOOLEAN DEFAULT FALSE,
  research_citations TEXT[],

  view_count INTEGER DEFAULT 0,
  average_rating DECIMAL(3,2),

  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ifs_content_type ON ifs_content_library(content_type);
CREATE INDEX IF NOT EXISTS idx_ifs_content_wounds ON ifs_content_library USING GIN(wound_types);
CREATE INDEX IF NOT EXISTS idx_ifs_content_modules ON ifs_content_library USING GIN(module_ids);
CREATE INDEX IF NOT EXISTS idx_ifs_content_active ON ifs_content_library(is_active);
