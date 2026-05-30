-- =====================================================
-- Migration 009: IFS_THERAPIST_NOTES TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS ifs_therapist_notes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  client_id UUID REFERENCES ifs_clients(id) ON DELETE CASCADE,

  note_type VARCHAR(50),
  title VARCHAR(255),
  content TEXT NOT NULL,

  related_module VARCHAR(100),
  related_wound VARCHAR(50),

  requires_follow_up BOOLEAN DEFAULT FALSE,
  follow_up_date DATE,
  follow_up_completed BOOLEAN DEFAULT FALSE,

  visible_to_client BOOLEAN DEFAULT FALSE,

  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by VARCHAR(255),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ifs_therapist_notes_client ON ifs_therapist_notes(client_id);
CREATE INDEX IF NOT EXISTS idx_ifs_therapist_notes_type ON ifs_therapist_notes(note_type);
CREATE INDEX IF NOT EXISTS idx_ifs_therapist_notes_follow_up ON ifs_therapist_notes(requires_follow_up, follow_up_completed);
