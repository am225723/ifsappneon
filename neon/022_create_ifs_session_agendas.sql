-- Phase 2B: pre-session agendas and therapist session prep briefs.
-- Uses internal ifs_clients.id UUIDs for therapist_id and client_id.

CREATE TABLE IF NOT EXISTS public.ifs_session_agendas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES public.ifs_clients(id) ON DELETE CASCADE,
  therapist_id UUID NOT NULL REFERENCES public.ifs_clients(id) ON DELETE CASCADE,
  session_date DATE,
  session_datetime TIMESTAMPTZ,
  topics TEXT NOT NULL,
  active_parts JSONB DEFAULT '[]'::jsonb,
  stuck_points TEXT,
  goals_for_session TEXT,
  current_stress_level INTEGER,
  current_mood_label VARCHAR(100),
  safety_concerns TEXT,
  status VARCHAR(50) DEFAULT 'submitted',
  therapist_notes TEXT,
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE public.ifs_session_agendas
  ADD COLUMN IF NOT EXISTS session_date DATE,
  ADD COLUMN IF NOT EXISTS session_datetime TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS topics TEXT,
  ADD COLUMN IF NOT EXISTS active_parts JSONB DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS stuck_points TEXT,
  ADD COLUMN IF NOT EXISTS goals_for_session TEXT,
  ADD COLUMN IF NOT EXISTS current_stress_level INTEGER,
  ADD COLUMN IF NOT EXISTS current_mood_label VARCHAR(100),
  ADD COLUMN IF NOT EXISTS safety_concerns TEXT,
  ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT 'submitted',
  ADD COLUMN IF NOT EXISTS therapist_notes TEXT,
  ADD COLUMN IF NOT EXISTS reviewed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP;

UPDATE public.ifs_session_agendas
SET topics = 'Pre-session agenda'
WHERE topics IS NULL;

UPDATE public.ifs_session_agendas
SET status = 'submitted'
WHERE status IS NULL
   OR status NOT IN ('draft', 'submitted', 'reviewed', 'archived');

ALTER TABLE public.ifs_session_agendas
  ALTER COLUMN topics SET NOT NULL,
  ALTER COLUMN active_parts SET DEFAULT '[]'::jsonb,
  ALTER COLUMN status SET DEFAULT 'submitted',
  ALTER COLUMN created_at SET DEFAULT CURRENT_TIMESTAMP,
  ALTER COLUMN updated_at SET DEFAULT CURRENT_TIMESTAMP;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'ifs_session_agendas'
      AND column_name = 'therapist_id'
      AND data_type <> 'uuid'
  ) THEN
    DELETE FROM public.ifs_session_agendas
    WHERE therapist_id IS NULL
       OR therapist_id !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$';
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'ifs_session_agendas'
      AND column_name = 'client_id'
      AND data_type <> 'uuid'
  ) THEN
    DELETE FROM public.ifs_session_agendas
    WHERE client_id IS NULL
       OR client_id !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$';
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'ifs_session_agendas'
      AND column_name = 'therapist_id'
      AND data_type <> 'uuid'
  ) THEN
    ALTER TABLE public.ifs_session_agendas
      ALTER COLUMN therapist_id TYPE UUID USING therapist_id::uuid;
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'ifs_session_agendas'
      AND column_name = 'client_id'
      AND data_type <> 'uuid'
  ) THEN
    ALTER TABLE public.ifs_session_agendas
      ALTER COLUMN client_id TYPE UUID USING client_id::uuid;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'ifs_session_agendas_therapist_id_fkey'
      AND conrelid = 'public.ifs_session_agendas'::regclass
  ) THEN
    ALTER TABLE public.ifs_session_agendas
      ADD CONSTRAINT ifs_session_agendas_therapist_id_fkey
      FOREIGN KEY (therapist_id) REFERENCES public.ifs_clients(id) ON DELETE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'ifs_session_agendas_client_id_fkey'
      AND conrelid = 'public.ifs_session_agendas'::regclass
  ) THEN
    ALTER TABLE public.ifs_session_agendas
      ADD CONSTRAINT ifs_session_agendas_client_id_fkey
      FOREIGN KEY (client_id) REFERENCES public.ifs_clients(id) ON DELETE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'ifs_session_agendas_status_check'
      AND conrelid = 'public.ifs_session_agendas'::regclass
  ) THEN
    ALTER TABLE public.ifs_session_agendas
      ADD CONSTRAINT ifs_session_agendas_status_check
      CHECK (status IN ('draft', 'submitted', 'reviewed', 'archived'));
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_ifs_session_agendas_client_date
ON public.ifs_session_agendas(client_id, session_date DESC);

CREATE INDEX IF NOT EXISTS idx_ifs_session_agendas_therapist_date
ON public.ifs_session_agendas(therapist_id, session_date DESC);

CREATE INDEX IF NOT EXISTS idx_ifs_session_agendas_status
ON public.ifs_session_agendas(status);
