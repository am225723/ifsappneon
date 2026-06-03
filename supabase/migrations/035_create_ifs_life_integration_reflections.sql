-- Phase 15A: client-owned IFS in Daily Life / Life Integration reflections.
-- Safe to run more than once. Reflections are private by default and can be
-- explicitly shared with an actively assigned Advisor through server-side auth.

CREATE TABLE IF NOT EXISTS public.ifs_life_integration_reflections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  client_id UUID NOT NULL REFERENCES public.ifs_clients(id) ON DELETE CASCADE,

  reflection_type VARCHAR(100) NOT NULL,
  title VARCHAR(255),

  situation TEXT,
  part_noticed TEXT,
  part_id UUID REFERENCES public.ifs_parts(id) ON DELETE SET NULL,

  body_sensation TEXT,
  emotion_words JSONB DEFAULT '[]'::jsonb,
  need_words JSONB DEFAULT '[]'::jsonb,

  self_energy_quality VARCHAR(100),
  next_step TEXT,

  is_private BOOLEAN DEFAULT true,
  shared_with_advisor BOOLEAN DEFAULT false,
  archived_at TIMESTAMPTZ,

  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_ifs_life_reflections_client_created
ON public.ifs_life_integration_reflections(client_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_ifs_life_reflections_type
ON public.ifs_life_integration_reflections(reflection_type);

CREATE INDEX IF NOT EXISTS idx_ifs_life_reflections_part
ON public.ifs_life_integration_reflections(part_id);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'ifs_life_reflections_type_check'
      AND conrelid = 'public.ifs_life_integration_reflections'::regclass
  ) THEN
    ALTER TABLE public.ifs_life_integration_reflections
    ADD CONSTRAINT ifs_life_reflections_type_check
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

CREATE OR REPLACE FUNCTION public.set_ifs_life_reflections_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_ifs_life_reflections_updated_at ON public.ifs_life_integration_reflections;
CREATE TRIGGER trg_ifs_life_reflections_updated_at
BEFORE UPDATE ON public.ifs_life_integration_reflections
FOR EACH ROW
EXECUTE FUNCTION public.set_ifs_life_reflections_updated_at();
