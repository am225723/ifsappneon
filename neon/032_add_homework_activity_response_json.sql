-- Phase 21B: structured worksheet block and response persistence for Assigned IFS Practices.
-- Idempotent and intentionally does not backfill historical completion_notes.
ALTER TABLE public.ifs_therapy_homework
  ADD COLUMN IF NOT EXISTS activity_blocks JSONB DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS interactive_responses JSONB DEFAULT '{}'::jsonb;
