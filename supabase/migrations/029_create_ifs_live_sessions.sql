-- Phase 6A: Live Co-Therapy Sync
-- Lightweight live session state for therapist-initiated synchronized exercises.
-- Do not store therapy dialogue transcripts, audio/video, or clinical interpretations here.

CREATE TABLE IF NOT EXISTS public.ifs_live_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  therapist_id UUID NOT NULL REFERENCES public.ifs_clients(id) ON DELETE CASCADE,
  client_id UUID NOT NULL REFERENCES public.ifs_clients(id) ON DELETE CASCADE,
  status VARCHAR(50) DEFAULT 'active',
  current_activity VARCHAR(100),
  activity_state JSONB DEFAULT '{}'::jsonb,
  therapist_last_seen_at TIMESTAMPTZ,
  client_last_seen_at TIMESTAMPTZ,
  started_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  ended_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_ifs_live_sessions_therapist_client_status
  ON public.ifs_live_sessions(therapist_id, client_id, status);

CREATE INDEX IF NOT EXISTS idx_ifs_live_sessions_client_status
  ON public.ifs_live_sessions(client_id, status);

CREATE INDEX IF NOT EXISTS idx_ifs_live_sessions_updated
  ON public.ifs_live_sessions(updated_at DESC);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'ifs_live_sessions_status_check'
      AND conrelid = 'public.ifs_live_sessions'::regclass
  ) THEN
    ALTER TABLE public.ifs_live_sessions
      ADD CONSTRAINT ifs_live_sessions_status_check
      CHECK (status IN ('active', 'paused', 'ended', 'expired'));
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS public.ifs_live_session_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  live_session_id UUID NOT NULL REFERENCES public.ifs_live_sessions(id) ON DELETE CASCADE,
  therapist_id UUID REFERENCES public.ifs_clients(id) ON DELETE SET NULL,
  client_id UUID REFERENCES public.ifs_clients(id) ON DELETE SET NULL,
  event_type VARCHAR(100) NOT NULL,
  event_payload JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_ifs_live_session_events_session_created
  ON public.ifs_live_session_events(live_session_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_ifs_live_session_events_type
  ON public.ifs_live_session_events(event_type);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'ifs_live_session_events_type_check'
      AND conrelid = 'public.ifs_live_session_events'::regclass
  ) THEN
    ALTER TABLE public.ifs_live_session_events
      ADD CONSTRAINT ifs_live_session_events_type_check
      CHECK (event_type IN (
        'session_started',
        'client_joined',
        'activity_started',
        'activity_paused',
        'activity_resumed',
        'activity_ended',
        'prompt_sent',
        'session_ended',
        'heartbeat'
      ));
  END IF;
END $$;
