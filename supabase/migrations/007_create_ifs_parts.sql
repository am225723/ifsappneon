-- =====================================================
-- Migration 007: IFS_PARTS TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS ifs_parts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  client_id UUID REFERENCES ifs_clients(id) ON DELETE CASCADE,

  part_name VARCHAR(255) NOT NULL,
  part_type VARCHAR(50),
  role VARCHAR(100),

  description TEXT,
  age_of_part INTEGER,
  visual_representation TEXT,

  triggers TEXT[],
  behaviors TEXT[],
  positive_intentions TEXT[],

  burdens TEXT[],
  origin_story TEXT,

  trust_level INTEGER CHECK (trust_level >= 1 AND trust_level <= 10),
  willingness_to_unblend INTEGER CHECK (willingness_to_unblend >= 1 AND willingness_to_unblend <= 10),

  unburdening_status VARCHAR(50),
  unburdening_date TIMESTAMP WITH TIME ZONE,
  transformation_notes TEXT,

  related_wound VARCHAR(50),

  discovered_in_module VARCHAR(100),
  is_active BOOLEAN DEFAULT TRUE,

  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ifs_parts_client ON ifs_parts(client_id);
CREATE INDEX IF NOT EXISTS idx_ifs_parts_type ON ifs_parts(part_type);
CREATE INDEX IF NOT EXISTS idx_ifs_parts_wound ON ifs_parts(related_wound);
CREATE INDEX IF NOT EXISTS idx_ifs_parts_unburdening ON ifs_parts(unburdening_status);
