-- Phase 7A: In-app notifications and activity feed.
-- Apply manually in Neon production after review.

CREATE TABLE IF NOT EXISTS public.ifs_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  recipient_id UUID NOT NULL REFERENCES public.ifs_clients(id) ON DELETE CASCADE,
  actor_id UUID REFERENCES public.ifs_clients(id) ON DELETE SET NULL,

  client_id UUID REFERENCES public.ifs_clients(id) ON DELETE CASCADE,
  therapist_id UUID REFERENCES public.ifs_clients(id) ON DELETE CASCADE,

  notification_type VARCHAR(100) NOT NULL,
  title VARCHAR(255) NOT NULL,
  message TEXT,

  entity_type VARCHAR(100),
  entity_id UUID,

  priority VARCHAR(50) DEFAULT 'normal',

  read_at TIMESTAMPTZ,
  archived_at TIMESTAMPTZ,

  metadata JSONB DEFAULT '{}'::jsonb,

  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_ifs_notifications_recipient_created
ON public.ifs_notifications(recipient_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_ifs_notifications_recipient_unread
ON public.ifs_notifications(recipient_id, read_at)
WHERE read_at IS NULL AND archived_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_ifs_notifications_client
ON public.ifs_notifications(client_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_ifs_notifications_therapist
ON public.ifs_notifications(therapist_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_ifs_notifications_type
ON public.ifs_notifications(notification_type);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'ifs_notifications_priority_check'
      AND conrelid = 'public.ifs_notifications'::regclass
  ) THEN
    ALTER TABLE public.ifs_notifications
    ADD CONSTRAINT ifs_notifications_priority_check
    CHECK (priority IN ('low', 'normal', 'important'));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'ifs_notifications_type_check'
      AND conrelid = 'public.ifs_notifications'::regclass
  ) THEN
    ALTER TABLE public.ifs_notifications
    ADD CONSTRAINT ifs_notifications_type_check
    CHECK (
      notification_type IN (
        'homework_assigned',
        'homework_started',
        'homework_completed',
        'homework_reviewed',
        'session_agenda_submitted',
        'session_agenda_reviewed',
        'treatment_goal_created',
        'treatment_goal_updated',
        'treatment_goal_completed',
        'live_session_started',
        'live_session_joined',
        'live_session_ended',
        'report_generated',
        'therapist_note_created',
        'general_update'
      )
    );
  END IF;
END $$;
