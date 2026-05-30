-- =====================================================
-- Migration 006: IFS_JOURNAL_ENTRIES TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS ifs_journal_entries (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  client_id UUID REFERENCES ifs_clients(id) ON DELETE CASCADE,

  title VARCHAR(255),
  content TEXT NOT NULL,

  mood VARCHAR(50),
  mood_intensity INTEGER CHECK (mood_intensity >= 1 AND mood_intensity <= 10),
  emotions TEXT[],

  parts_identified TEXT[],
  parts_dialogue JSONB,

  related_wound VARCHAR(50),
  related_module VARCHAR(100),

  tags TEXT[],
  is_breakthrough BOOLEAN DEFAULT FALSE,

  is_private BOOLEAN DEFAULT TRUE,
  shared_with_therapist BOOLEAN DEFAULT FALSE,

  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ifs_journal_client ON ifs_journal_entries(client_id);
CREATE INDEX IF NOT EXISTS idx_ifs_journal_date ON ifs_journal_entries(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ifs_journal_wound ON ifs_journal_entries(related_wound);
CREATE INDEX IF NOT EXISTS idx_ifs_journal_breakthrough ON ifs_journal_entries(is_breakthrough);
