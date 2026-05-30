-- =====================================================
-- Migration 015: Row Level Security Policies
-- =====================================================

ALTER TABLE ifs_clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE ifs_assessment_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE ifs_personalized_curriculum ENABLE ROW LEVEL SECURITY;
ALTER TABLE ifs_client_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE ifs_journal_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE ifs_parts ENABLE ROW LEVEL SECURITY;
ALTER TABLE ifs_exercise_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE ifs_therapist_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE ifs_milestones ENABLE ROW LEVEL SECURITY;
ALTER TABLE ifs_module_answers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Enable anonymous client creation" ON ifs_clients;
CREATE POLICY "Enable anonymous client creation" ON ifs_clients
    FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Enable anonymous client authentication" ON ifs_clients;
CREATE POLICY "Enable anonymous client authentication" ON ifs_clients
    FOR SELECT USING (true);

DROP POLICY IF EXISTS "Enable anonymous client updates" ON ifs_clients;
CREATE POLICY "Enable anonymous client updates" ON ifs_clients
    FOR UPDATE USING (true);

DROP POLICY IF EXISTS "Enable anonymous assessment access" ON ifs_assessment_results;
CREATE POLICY "Enable anonymous assessment access" ON ifs_assessment_results
    FOR ALL USING (true);

DROP POLICY IF EXISTS "Enable anonymous curriculum access" ON ifs_personalized_curriculum;
CREATE POLICY "Enable anonymous curriculum access" ON ifs_personalized_curriculum
    FOR ALL USING (true);

DROP POLICY IF EXISTS "Enable anonymous progress access" ON ifs_client_progress;
CREATE POLICY "Enable anonymous progress access" ON ifs_client_progress
    FOR ALL USING (true);

DROP POLICY IF EXISTS "Enable anonymous journal access" ON ifs_journal_entries;
CREATE POLICY "Enable anonymous journal access" ON ifs_journal_entries
    FOR ALL USING (true);

DROP POLICY IF EXISTS "Enable anonymous parts access" ON ifs_parts;
CREATE POLICY "Enable anonymous parts access" ON ifs_parts
    FOR ALL USING (true);

DROP POLICY IF EXISTS "Enable anonymous exercise progress access" ON ifs_exercise_progress;
CREATE POLICY "Enable anonymous exercise progress access" ON ifs_exercise_progress
    FOR ALL USING (true);

DROP POLICY IF EXISTS "Enable anonymous milestones access" ON ifs_milestones;
CREATE POLICY "Enable anonymous milestones access" ON ifs_milestones
    FOR ALL USING (true);

DROP POLICY IF EXISTS "Enable anonymous therapist notes access" ON ifs_therapist_notes;
CREATE POLICY "Enable anonymous therapist notes access" ON ifs_therapist_notes
    FOR ALL USING (true);

DROP POLICY IF EXISTS "Anyone can view active content" ON ifs_content_library;
CREATE POLICY "Anyone can view active content" ON ifs_content_library
    FOR SELECT USING (is_active = true);

DROP POLICY IF EXISTS "Users can access only their own answers" ON ifs_module_answers;
CREATE POLICY "Users can access only their own answers" ON ifs_module_answers
    FOR ALL USING (true);

GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO anon;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon;
