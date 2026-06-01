-- Phase 2A: therapist-assigned curriculum homework.
-- Mirrors neon/021_create_ifs_assigned_homework.sql for projects still applying Supabase migrations.

CREATE TABLE IF NOT EXISTS public.ifs_assigned_homework (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  therapist_id UUID NOT NULL REFERENCES public.ifs_clients(id) ON DELETE CASCADE,
  client_id UUID NOT NULL REFERENCES public.ifs_clients(id) ON DELETE CASCADE,

  module_id VARCHAR(255) NOT NULL,
  title VARCHAR(255),
  instructions TEXT,

  status VARCHAR(50) DEFAULT 'assigned',
  therapist_feedback TEXT,

  assigned_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  reviewed_at TIMESTAMPTZ,

  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE public.ifs_assigned_homework
  ADD COLUMN IF NOT EXISTS title VARCHAR(255),
  ADD COLUMN IF NOT EXISTS instructions TEXT,
  ADD COLUMN IF NOT EXISTS started_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS reviewed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'ifs_assigned_homework'
      AND column_name = 'therapist_id'
      AND data_type <> 'uuid'
  ) THEN
    ALTER TABLE public.ifs_assigned_homework
      ALTER COLUMN therapist_id TYPE UUID USING therapist_id::uuid;
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'ifs_assigned_homework'
      AND column_name = 'client_id'
      AND data_type <> 'uuid'
  ) THEN
    ALTER TABLE public.ifs_assigned_homework
      ALTER COLUMN client_id TYPE UUID USING client_id::uuid;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'ifs_assigned_homework_therapist_id_fkey'
      AND conrelid = 'public.ifs_assigned_homework'::regclass
  ) THEN
    ALTER TABLE public.ifs_assigned_homework
      ADD CONSTRAINT ifs_assigned_homework_therapist_id_fkey
      FOREIGN KEY (therapist_id) REFERENCES public.ifs_clients(id) ON DELETE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'ifs_assigned_homework_client_id_fkey'
      AND conrelid = 'public.ifs_assigned_homework'::regclass
  ) THEN
    ALTER TABLE public.ifs_assigned_homework
      ADD CONSTRAINT ifs_assigned_homework_client_id_fkey
      FOREIGN KEY (client_id) REFERENCES public.ifs_clients(id) ON DELETE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'ifs_assigned_homework_status_check'
      AND conrelid = 'public.ifs_assigned_homework'::regclass
  ) THEN
    ALTER TABLE public.ifs_assigned_homework
      ADD CONSTRAINT ifs_assigned_homework_status_check
      CHECK (status IN ('assigned', 'in_progress', 'completed', 'reviewed', 'archived'));
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_ifs_assigned_homework_client_status
ON public.ifs_assigned_homework(client_id, status);

CREATE INDEX IF NOT EXISTS idx_ifs_assigned_homework_therapist_client
ON public.ifs_assigned_homework(therapist_id, client_id);

CREATE INDEX IF NOT EXISTS idx_ifs_assigned_homework_client_module
ON public.ifs_assigned_homework(client_id, module_id);

CREATE UNIQUE INDEX IF NOT EXISTS idx_ifs_assigned_homework_unique_active
ON public.ifs_assigned_homework(client_id, module_id)
WHERE status IN ('assigned', 'in_progress');
