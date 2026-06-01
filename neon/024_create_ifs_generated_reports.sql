-- Phase 3C: generated clinical report audit metadata.
-- Stores metadata only. Report HTML/PDF content is not persisted in this table.
-- Uses internal ifs_clients.id UUIDs for therapist_id and client_id.

CREATE TABLE IF NOT EXISTS public.ifs_generated_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  therapist_id UUID NOT NULL REFERENCES public.ifs_clients(id) ON DELETE CASCADE,
  client_id UUID NOT NULL REFERENCES public.ifs_clients(id) ON DELETE CASCADE,

  report_type VARCHAR(100) NOT NULL DEFAULT 'clinical_summary',
  title VARCHAR(255),

  sections_included JSONB DEFAULT '[]'::jsonb,
  date_range_start DATE,
  date_range_end DATE,

  format VARCHAR(50) DEFAULT 'html_print',
  status VARCHAR(50) DEFAULT 'generated',

  storage_url TEXT,
  file_name VARCHAR(255),

  generated_by UUID REFERENCES public.ifs_clients(id) ON DELETE SET NULL,
  generated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE public.ifs_generated_reports
  ADD COLUMN IF NOT EXISTS title VARCHAR(255),
  ADD COLUMN IF NOT EXISTS sections_included JSONB DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS date_range_start DATE,
  ADD COLUMN IF NOT EXISTS date_range_end DATE,
  ADD COLUMN IF NOT EXISTS format VARCHAR(50) DEFAULT 'html_print',
  ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT 'generated',
  ADD COLUMN IF NOT EXISTS storage_url TEXT,
  ADD COLUMN IF NOT EXISTS file_name VARCHAR(255),
  ADD COLUMN IF NOT EXISTS generated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP;

UPDATE public.ifs_generated_reports
SET report_type = COALESCE(NULLIF(report_type, ''), 'clinical_summary'),
    sections_included = COALESCE(sections_included, '[]'::jsonb),
    format = COALESCE(NULLIF(format, ''), 'html_print'),
    status = CASE
      WHEN status IN ('generated', 'downloaded', 'archived', 'failed') THEN status
      ELSE 'generated'
    END,
    generated_at = COALESCE(generated_at, CURRENT_TIMESTAMP),
    created_at = COALESCE(created_at, CURRENT_TIMESTAMP),
    updated_at = COALESCE(updated_at, CURRENT_TIMESTAMP);

ALTER TABLE public.ifs_generated_reports
  ALTER COLUMN report_type SET DEFAULT 'clinical_summary',
  ALTER COLUMN sections_included SET DEFAULT '[]'::jsonb,
  ALTER COLUMN format SET DEFAULT 'html_print',
  ALTER COLUMN status SET DEFAULT 'generated',
  ALTER COLUMN storage_url DROP NOT NULL,
  ALTER COLUMN generated_at SET DEFAULT CURRENT_TIMESTAMP,
  ALTER COLUMN created_at SET DEFAULT CURRENT_TIMESTAMP,
  ALTER COLUMN updated_at SET DEFAULT CURRENT_TIMESTAMP;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'ifs_generated_reports'
      AND column_name = 'therapist_id'
      AND data_type <> 'uuid'
  ) THEN
    DELETE FROM public.ifs_generated_reports
    WHERE therapist_id IS NULL
       OR therapist_id !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$';

    ALTER TABLE public.ifs_generated_reports
      ALTER COLUMN therapist_id TYPE UUID USING therapist_id::uuid;
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'ifs_generated_reports'
      AND column_name = 'client_id'
      AND data_type <> 'uuid'
  ) THEN
    DELETE FROM public.ifs_generated_reports
    WHERE client_id IS NULL
       OR client_id !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$';

    ALTER TABLE public.ifs_generated_reports
      ALTER COLUMN client_id TYPE UUID USING client_id::uuid;
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'ifs_generated_reports'
      AND column_name = 'generated_by'
      AND data_type <> 'uuid'
  ) THEN
    UPDATE public.ifs_generated_reports
    SET generated_by = NULL
    WHERE generated_by IS NOT NULL
      AND generated_by !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$';

    ALTER TABLE public.ifs_generated_reports
      ALTER COLUMN generated_by TYPE UUID USING generated_by::uuid;
  END IF;
END $$;


DELETE FROM public.ifs_generated_reports report
WHERE NOT EXISTS (
  SELECT 1 FROM public.ifs_clients therapist
  WHERE therapist.id = report.therapist_id
)
OR NOT EXISTS (
  SELECT 1 FROM public.ifs_clients client
  WHERE client.id = report.client_id
);

UPDATE public.ifs_generated_reports report
SET generated_by = NULL
WHERE generated_by IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM public.ifs_clients generator
    WHERE generator.id = report.generated_by
  );

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'ifs_generated_reports_therapist_id_fkey'
      AND conrelid = 'public.ifs_generated_reports'::regclass
  ) THEN
    ALTER TABLE public.ifs_generated_reports
      ADD CONSTRAINT ifs_generated_reports_therapist_id_fkey
      FOREIGN KEY (therapist_id) REFERENCES public.ifs_clients(id) ON DELETE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'ifs_generated_reports_client_id_fkey'
      AND conrelid = 'public.ifs_generated_reports'::regclass
  ) THEN
    ALTER TABLE public.ifs_generated_reports
      ADD CONSTRAINT ifs_generated_reports_client_id_fkey
      FOREIGN KEY (client_id) REFERENCES public.ifs_clients(id) ON DELETE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'ifs_generated_reports_generated_by_fkey'
      AND conrelid = 'public.ifs_generated_reports'::regclass
  ) THEN
    ALTER TABLE public.ifs_generated_reports
      ADD CONSTRAINT ifs_generated_reports_generated_by_fkey
      FOREIGN KEY (generated_by) REFERENCES public.ifs_clients(id) ON DELETE SET NULL;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'ifs_generated_reports_status_check'
      AND conrelid = 'public.ifs_generated_reports'::regclass
  ) THEN
    ALTER TABLE public.ifs_generated_reports
      ADD CONSTRAINT ifs_generated_reports_status_check
      CHECK (status IN ('generated', 'downloaded', 'archived', 'failed'));
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_ifs_generated_reports_client_created
ON public.ifs_generated_reports(client_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_ifs_generated_reports_therapist_client
ON public.ifs_generated_reports(therapist_id, client_id);

CREATE INDEX IF NOT EXISTS idx_ifs_generated_reports_report_type
ON public.ifs_generated_reports(report_type);
