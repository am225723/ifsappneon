-- =====================================================
-- Migration 017: Add helplessness_score to ifs_assessment_results
-- =====================================================

ALTER TABLE ifs_assessment_results
  ADD COLUMN IF NOT EXISTS helplessness_score INTEGER CHECK (helplessness_score >= 0 AND helplessness_score <= 24);
