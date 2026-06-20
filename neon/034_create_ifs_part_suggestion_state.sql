-- Phase 18E: persistent review state for deterministic Inner System Map suggestions.
CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS public.ifs_part_suggestion_state (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL REFERENCES public.ifs_clients(id) ON DELETE CASCADE,
  suggestion_id text NOT NULL,
  suggestion_type text NOT NULL CHECK (suggestion_type IN ('part', 'relationship')),
  status text NOT NULL CHECK (status IN ('dismissed', 'accepted', 'merged', 'restored')),
  source_type text,
  source_id text,
  target_part_id text,
  target_relationship_id uuid,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS ifs_part_suggestion_state_unique_idx
ON public.ifs_part_suggestion_state (client_id, suggestion_id, suggestion_type);

CREATE INDEX IF NOT EXISTS ifs_part_suggestion_state_client_idx
ON public.ifs_part_suggestion_state (client_id);

CREATE INDEX IF NOT EXISTS ifs_part_suggestion_state_status_idx
ON public.ifs_part_suggestion_state (status);

CREATE INDEX IF NOT EXISTS ifs_part_suggestion_state_updated_idx
ON public.ifs_part_suggestion_state (updated_at DESC);

CREATE OR REPLACE FUNCTION public.update_ifs_part_suggestion_state_updated_at()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_ifs_part_suggestion_state_updated_at ON public.ifs_part_suggestion_state;
CREATE TRIGGER update_ifs_part_suggestion_state_updated_at
BEFORE UPDATE ON public.ifs_part_suggestion_state
FOR EACH ROW EXECUTE FUNCTION public.update_ifs_part_suggestion_state_updated_at();

COMMENT ON TABLE public.ifs_part_suggestion_state IS 'Phase 18E persistent per-client review state for deterministic part and relationship suggestions. target_part_id is text because ifs_parts.id is VARCHAR with a composite client_id/id relationship; no risky FK is added here.';
