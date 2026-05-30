-- =====================================================
-- Migration 016: Add user_role column to ifs_clients
-- =====================================================

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'ifs_clients' AND column_name = 'user_role'
    ) THEN
        ALTER TABLE ifs_clients ADD COLUMN user_role VARCHAR(20) DEFAULT 'client';
    END IF;
END
$$;

CREATE INDEX IF NOT EXISTS idx_ifs_clients_user_role ON ifs_clients(user_role);
