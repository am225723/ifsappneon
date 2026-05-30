-- =====================================================
-- Migration 003: IFS_ASSESSMENT_RESULTS TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS ifs_assessment_results (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  client_id UUID REFERENCES ifs_clients(id) ON DELETE CASCADE,

  abandonment_score INTEGER CHECK (abandonment_score >= 0 AND abandonment_score <= 24),
  shame_score INTEGER CHECK (shame_score >= 0 AND shame_score <= 24),
  neglect_score INTEGER CHECK (neglect_score >= 0 AND neglect_score <= 24),
  betrayal_score INTEGER CHECK (betrayal_score >= 0 AND betrayal_score <= 24),

  primary_wound VARCHAR(50),
  secondary_wound VARCHAR(50),
  tertiary_wounds TEXT[],

  responses JSONB,

  protector_types TEXT[],

  assessment_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  assessment_version VARCHAR(10) DEFAULT '1.0',

  therapist_interpretation TEXT,

  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ifs_assessment_client ON ifs_assessment_results(client_id);
CREATE INDEX IF NOT EXISTS idx_ifs_assessment_primary_wound ON ifs_assessment_results(primary_wound);
CREATE INDEX IF NOT EXISTS idx_ifs_assessment_date ON ifs_assessment_results(assessment_date DESC);
