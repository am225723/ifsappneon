-- =====================================================
-- Migration 018: Enable RLS on ifs_interactive_data with open policies
-- (Same pattern used for every other table in migration 015)
-- =====================================================

ALTER TABLE ifs_interactive_data ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Enable anonymous interactive data access" ON ifs_interactive_data;
CREATE POLICY "Enable anonymous interactive data access" ON ifs_interactive_data
    FOR ALL USING (true) WITH CHECK (true);

GRANT ALL ON ifs_interactive_data TO anon;
GRANT ALL ON ifs_interactive_data TO authenticated;
