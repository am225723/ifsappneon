-- Phase 8C parity: Advisor-controlled AI-assisted session note drafts.
-- Adds draft/final tracking and AI provenance flags without storing raw AI prompts or source payloads.

ALTER TABLE public.ifs_therapist_notes
  ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT 'draft',
  ADD COLUMN IF NOT EXISTS ai_generated BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS ai_generation_metadata JSONB DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS finalized_at TIMESTAMPTZ;

UPDATE public.ifs_therapist_notes
SET status = COALESCE(NULLIF(status, ''), 'draft')
WHERE status IS NULL OR status = '';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'ifs_therapist_notes_status_check'
      AND conrelid = 'public.ifs_therapist_notes'::regclass
  ) THEN
    ALTER TABLE public.ifs_therapist_notes
      ADD CONSTRAINT ifs_therapist_notes_status_check
      CHECK (status IN ('draft', 'final', 'archived'));
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_ifs_therapist_notes_status
ON public.ifs_therapist_notes(status);
