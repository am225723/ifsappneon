-- =====================================================
-- Migration 002: IFS_CLIENTS TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS ifs_clients (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  pin VARCHAR(6) UNIQUE NOT NULL,
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255),
  phone VARCHAR(50),
  therapist_notes TEXT,
  status VARCHAR(50) DEFAULT 'active',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_active TIMESTAMP WITH TIME ZONE,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ifs_clients_pin ON ifs_clients(pin);
CREATE INDEX IF NOT EXISTS idx_ifs_clients_status ON ifs_clients(status);
