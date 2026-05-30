-- =====================================================
-- Migration 012: IFS_MODULE_ANSWERS TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS ifs_module_answers (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id VARCHAR(255) NOT NULL,
  module_id VARCHAR(255) NOT NULL,
  step_id VARCHAR(255) NOT NULL,
  answers JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  CONSTRAINT unique_client_module_step UNIQUE (client_id, module_id, step_id)
);

CREATE INDEX IF NOT EXISTS idx_module_answers_client_id ON ifs_module_answers(client_id);
CREATE INDEX IF NOT EXISTS idx_module_answers_module_id ON ifs_module_answers(module_id);
CREATE INDEX IF NOT EXISTS idx_module_answers_client_module ON ifs_module_answers(client_id, module_id);
