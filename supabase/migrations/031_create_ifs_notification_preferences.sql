-- Phase 7B: In-app notification preferences and quiet hours.
-- Stores only internal app user IDs from ifs_clients.id; no external contact info.

CREATE TABLE IF NOT EXISTS public.ifs_notification_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.ifs_clients(id) ON DELETE CASCADE,
  in_app_enabled BOOLEAN DEFAULT true,
  quiet_hours_enabled BOOLEAN DEFAULT false,
  quiet_hours_start TIME,
  quiet_hours_end TIME,
  timezone VARCHAR(100) DEFAULT 'America/New_York',
  allow_important_during_quiet_hours BOOLEAN DEFAULT true,
  allow_live_session_during_quiet_hours BOOLEAN DEFAULT true,
  homework_enabled BOOLEAN DEFAULT true,
  session_agenda_enabled BOOLEAN DEFAULT true,
  treatment_plan_enabled BOOLEAN DEFAULT true,
  live_session_enabled BOOLEAN DEFAULT true,
  report_enabled BOOLEAN DEFAULT true,
  therapist_note_activity_enabled BOOLEAN DEFAULT false,
  general_updates_enabled BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(user_id)
);

CREATE INDEX IF NOT EXISTS idx_ifs_notification_preferences_user
ON public.ifs_notification_preferences(user_id);
