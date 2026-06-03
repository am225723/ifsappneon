-- Phase 15A: client-owned IFS in Daily Life / Life Integration reflections.
-- Safe to run more than once. Reflections are private by default and can be
-- explicitly shared with an actively assigned Advisor through server-side auth.
-- Production note: part_id is intentionally stored as a nullable UUID without
-- a foreign key because production ifs_parts.id is not currently FK-safe.

CREATE TABLE IF NOT EXISTS public.ifs_life_integration_reflections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  client_id UUID NOT NULL REFERENCES public.ifs_clients(id) ON DELETE CASCADE,

  reflection_type VARCHAR(100) NOT NULL,

  situation TEXT,
  part_noticed TEXT,
  body_sensation TEXT,
  emotion TEXT,
  need_or_message TEXT,
  self_energy_response TEXT,
  next_step TEXT,

  part_id UUID,

  is_private BOOLEAN DEFAULT true,
  shared_with_advisor BOOLEAN DEFAULT false,

  archived_at TIMESTAMPTZ,

  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_ifs_life_integration_reflections_client_created
ON public.ifs_life_integration_reflections(client_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_ifs_life_integration_reflections_client_type
ON public.ifs_life_integration_reflections(client_id, reflection_type);

CREATE INDEX IF NOT EXISTS idx_ifs_life_integration_reflections_shared
ON public.ifs_life_integration_reflections(client_id, shared_with_advisor)
WHERE shared_with_advisor = true AND archived_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_ifs_life_integration_reflections_part
ON public.ifs_life_integration_reflections(part_id);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'ifs_life_integration_reflections_type_check'
  ) THEN
    ALTER TABLE public.ifs_life_integration_reflections
      ADD CONSTRAINT ifs_life_integration_reflections_type_check
      CHECK (
        reflection_type IN (
          'notice_part',
          'return_to_self',
          'trigger_reflection',
          'repair_after_conflict',
          'protector_check_in',
          'needs_boundaries'
        )
      );
  END IF;
END $$;
