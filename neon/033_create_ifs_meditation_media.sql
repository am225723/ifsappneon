-- Phase 22D: Advisor/Admin guided meditation media library.
-- Stores public UploadThing URLs and file keys only; no UploadThing secrets or client PHI.

CREATE TABLE IF NOT EXISTS public.ifs_meditation_media (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  practice_id TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  category TEXT,
  level TEXT,
  duration_label TEXT,
  practice_type TEXT,
  audio_url TEXT,
  cover_image_url TEXT,
  uploadthing_audio_key TEXT,
  uploadthing_image_key TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  sort_order INTEGER DEFAULT 0,
  created_by UUID REFERENCES public.ifs_clients(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ifs_meditation_media_active
  ON public.ifs_meditation_media(is_active, sort_order, title);

CREATE INDEX IF NOT EXISTS idx_ifs_meditation_media_practice
  ON public.ifs_meditation_media(practice_id);
