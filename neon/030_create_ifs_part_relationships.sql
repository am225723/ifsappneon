-- Phase 14D: persistent client-owned Inner System Map relationship lines.
CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS public.ifs_part_relationships (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  client_id UUID NOT NULL REFERENCES public.ifs_clients(id) ON DELETE CASCADE,

  from_part_id VARCHAR NOT NULL,
  to_part_id VARCHAR NOT NULL,

  relationship_type VARCHAR(100) DEFAULT 'unknown',
  label VARCHAR(255),
  description TEXT,

  created_by UUID REFERENCES public.ifs_clients(id) ON DELETE SET NULL,
  confirmed_by_client BOOLEAN DEFAULT true,

  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,

  UNIQUE(client_id, from_part_id, to_part_id, relationship_type),

  FOREIGN KEY (client_id, from_part_id) REFERENCES public.ifs_parts(client_id, id) ON DELETE CASCADE,
  FOREIGN KEY (client_id, to_part_id) REFERENCES public.ifs_parts(client_id, id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_ifs_part_relationships_client
ON public.ifs_part_relationships(client_id);

CREATE INDEX IF NOT EXISTS idx_ifs_part_relationships_from_part
ON public.ifs_part_relationships(from_part_id);

CREATE INDEX IF NOT EXISTS idx_ifs_part_relationships_to_part
ON public.ifs_part_relationships(to_part_id);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'ifs_part_relationships_type_check'
      AND conrelid = 'public.ifs_part_relationships'::regclass
  ) THEN
    ALTER TABLE public.ifs_part_relationships
    ADD CONSTRAINT ifs_part_relationships_type_check
    CHECK (
      relationship_type IN (
        'close_to',
        'protects',
        'concerned_about',
        'polarized_with',
        'supports',
        'needs_space_from',
        'unknown'
      )
    );
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'ifs_part_relationships_distinct_parts_check'
      AND conrelid = 'public.ifs_part_relationships'::regclass
  ) THEN
    ALTER TABLE public.ifs_part_relationships
    ADD CONSTRAINT ifs_part_relationships_distinct_parts_check
    CHECK (from_part_id <> to_part_id);
  END IF;
END $$;
