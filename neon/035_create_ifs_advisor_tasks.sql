-- Clinical Tasks & Reminders: persist the Advisor Workspace's Tasks tab,
-- which previously lived only in local React state and reset to the same
-- four demo rows on every reload. Apply manually in Neon production after
-- review.

CREATE TABLE IF NOT EXISTS public.ifs_advisor_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  therapist_id UUID NOT NULL REFERENCES public.ifs_clients(id) ON DELETE CASCADE,
  client_id UUID REFERENCES public.ifs_clients(id) ON DELETE SET NULL,

  title VARCHAR(255) NOT NULL,
  category VARCHAR(100) NOT NULL DEFAULT 'General',
  priority VARCHAR(20) NOT NULL DEFAULT 'medium',
  status VARCHAR(20) NOT NULL DEFAULT 'open',
  due_date DATE,

  archived_at TIMESTAMPTZ,

  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_ifs_advisor_tasks_therapist_status
ON public.ifs_advisor_tasks(therapist_id, status)
WHERE archived_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_ifs_advisor_tasks_therapist_created
ON public.ifs_advisor_tasks(therapist_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_ifs_advisor_tasks_client
ON public.ifs_advisor_tasks(client_id, created_at DESC);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'ifs_advisor_tasks_priority_check'
      AND conrelid = 'public.ifs_advisor_tasks'::regclass
  ) THEN
    ALTER TABLE public.ifs_advisor_tasks
    ADD CONSTRAINT ifs_advisor_tasks_priority_check
    CHECK (priority IN ('low', 'medium', 'high'));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'ifs_advisor_tasks_status_check'
      AND conrelid = 'public.ifs_advisor_tasks'::regclass
  ) THEN
    ALTER TABLE public.ifs_advisor_tasks
    ADD CONSTRAINT ifs_advisor_tasks_status_check
    CHECK (status IN ('open', 'done'));
  END IF;
END $$;
