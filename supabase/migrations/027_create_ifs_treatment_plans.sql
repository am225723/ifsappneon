-- Phase 3B: treatment plan goals and taggable therapist notes.
-- Uses internal ifs_clients.id UUIDs for therapist_id and client_id.

CREATE TABLE IF NOT EXISTS public.ifs_treatment_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  therapist_id UUID NOT NULL REFERENCES public.ifs_clients(id) ON DELETE CASCADE,
  client_id UUID NOT NULL REFERENCES public.ifs_clients(id) ON DELETE CASCADE,

  goal_title VARCHAR(255) NOT NULL,
  goal_description TEXT,
  target_wounds JSONB DEFAULT '[]'::jsonb,
  target_parts JSONB DEFAULT '[]'::jsonb,

  objectives JSONB DEFAULT '[]'::jsonb,
  interventions JSONB DEFAULT '[]'::jsonb,

  status VARCHAR(50) DEFAULT 'active',

  review_date DATE,
  completed_at TIMESTAMPTZ,

  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE public.ifs_treatment_plans
  ADD COLUMN IF NOT EXISTS goal_description TEXT,
  ADD COLUMN IF NOT EXISTS target_wounds JSONB DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS target_parts JSONB DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS objectives JSONB DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS interventions JSONB DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT 'active',
  ADD COLUMN IF NOT EXISTS review_date DATE,
  ADD COLUMN IF NOT EXISTS completed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP;

UPDATE public.ifs_treatment_plans
SET status = 'active'
WHERE status IS NULL
   OR status NOT IN ('active', 'paused', 'completed', 'archived');

ALTER TABLE public.ifs_treatment_plans
  ALTER COLUMN target_wounds SET DEFAULT '[]'::jsonb,
  ALTER COLUMN target_parts SET DEFAULT '[]'::jsonb,
  ALTER COLUMN objectives SET DEFAULT '[]'::jsonb,
  ALTER COLUMN interventions SET DEFAULT '[]'::jsonb,
  ALTER COLUMN status SET DEFAULT 'active',
  ALTER COLUMN created_at SET DEFAULT CURRENT_TIMESTAMP,
  ALTER COLUMN updated_at SET DEFAULT CURRENT_TIMESTAMP;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'ifs_treatment_plans'
      AND column_name = 'therapist_id'
      AND data_type <> 'uuid'
  ) THEN
    DELETE FROM public.ifs_treatment_plans
    WHERE therapist_id IS NULL
       OR therapist_id !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$';

    ALTER TABLE public.ifs_treatment_plans
      ALTER COLUMN therapist_id TYPE UUID USING therapist_id::uuid;
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'ifs_treatment_plans'
      AND column_name = 'client_id'
      AND data_type <> 'uuid'
  ) THEN
    DELETE FROM public.ifs_treatment_plans
    WHERE client_id IS NULL
       OR client_id !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$';

    ALTER TABLE public.ifs_treatment_plans
      ALTER COLUMN client_id TYPE UUID USING client_id::uuid;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'ifs_treatment_plans_therapist_id_fkey'
      AND conrelid = 'public.ifs_treatment_plans'::regclass
  ) THEN
    ALTER TABLE public.ifs_treatment_plans
      ADD CONSTRAINT ifs_treatment_plans_therapist_id_fkey
      FOREIGN KEY (therapist_id) REFERENCES public.ifs_clients(id) ON DELETE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'ifs_treatment_plans_client_id_fkey'
      AND conrelid = 'public.ifs_treatment_plans'::regclass
  ) THEN
    ALTER TABLE public.ifs_treatment_plans
      ADD CONSTRAINT ifs_treatment_plans_client_id_fkey
      FOREIGN KEY (client_id) REFERENCES public.ifs_clients(id) ON DELETE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'ifs_treatment_plans_status_check'
      AND conrelid = 'public.ifs_treatment_plans'::regclass
  ) THEN
    ALTER TABLE public.ifs_treatment_plans
      ADD CONSTRAINT ifs_treatment_plans_status_check
      CHECK (status IN ('active', 'paused', 'completed', 'archived'));
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_ifs_treatment_plans_client_status
ON public.ifs_treatment_plans(client_id, status);

CREATE INDEX IF NOT EXISTS idx_ifs_treatment_plans_therapist_client
ON public.ifs_treatment_plans(therapist_id, client_id);

CREATE INDEX IF NOT EXISTS idx_ifs_treatment_plans_review_date
ON public.ifs_treatment_plans(review_date);

DO $$
BEGIN
  IF to_regclass('public.ifs_therapist_notes') IS NOT NULL THEN
    ALTER TABLE public.ifs_therapist_notes
      ADD COLUMN IF NOT EXISTS tagged_parts JSONB DEFAULT '[]'::jsonb,
      ADD COLUMN IF NOT EXISTS tagged_treatment_goals JSONB DEFAULT '[]'::jsonb,
      ADD COLUMN IF NOT EXISTS note_type VARCHAR(100),
      ADD COLUMN IF NOT EXISTS clinical_summary TEXT;

    ALTER TABLE public.ifs_therapist_notes
      ALTER COLUMN note_type TYPE VARCHAR(100);

    CREATE INDEX IF NOT EXISTS idx_ifs_therapist_notes_client_created
    ON public.ifs_therapist_notes(client_id, created_at DESC);

    CREATE INDEX IF NOT EXISTS idx_ifs_therapist_notes_tagged_parts
    ON public.ifs_therapist_notes USING gin(tagged_parts);

    CREATE INDEX IF NOT EXISTS idx_ifs_therapist_notes_tagged_goals
    ON public.ifs_therapist_notes USING gin(tagged_treatment_goals);
  END IF;
END $$;
