import { useCallback, useEffect, useMemo, useState } from 'react';
import { Bell, CheckCircle, Clock, RotateCcw, Save, ShieldCheck } from 'lucide-react';
import { loadNotificationPreferences, updateNotificationPreferences } from '../lib/notificationPreferences';

const DEFAULTS = {
  in_app_enabled: true,
  quiet_hours_enabled: false,
  quiet_hours_start: '',
  quiet_hours_end: '',
  timezone: 'America/New_York',
  allow_important_during_quiet_hours: true,
  allow_live_session_during_quiet_hours: true,
  homework_enabled: true,
  session_agenda_enabled: true,
  treatment_plan_enabled: true,
  live_session_enabled: true,
  report_enabled: true,
  therapist_note_activity_enabled: false,
  general_updates_enabled: true
};

const TIMEZONES = [
  'America/New_York',
  'America/Chicago',
  'America/Denver',
  'America/Los_Angeles',
  'America/Phoenix',
  'America/Anchorage',
  'Pacific/Honolulu',
  'UTC'
];

function normalizePreferences(preferences) {
  return {
    ...DEFAULTS,
    ...(preferences || {}),
    quiet_hours_start: (preferences?.quiet_hours_start || '').slice(0, 5),
    quiet_hours_end: (preferences?.quiet_hours_end || '').slice(0, 5),
    timezone: preferences?.timezone || DEFAULTS.timezone
  };
}

function ToggleRow({ label, description, checked, onChange }) {
  return (
    <label className="flex items-start justify-between gap-4 rounded-2xl border border-brand-stone-200 dark:border-slate-800 bg-white/70 dark:bg-slate-900/50 px-4 py-3 cursor-pointer">
      <span>
        <span className="block text-sm font-semibold text-brand-stone-900 dark:text-slate-100">{label}</span>
        {description && <span className="block text-xs text-brand-stone-500 dark:text-slate-400 mt-1">{description}</span>}
      </span>
      <input
        type="checkbox"
        checked={Boolean(checked)}
        onChange={(event) => onChange(event.target.checked)}
        className="mt-1 h-5 w-5 accent-brand-gold-600"
      />
    </label>
  );
}

function Section({ icon: Icon, title, children }) {
  return (
    <section className="soft-card p-6 space-y-4">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-2xl bg-brand-gold-100 dark:bg-brand-gold-950/30 text-brand-gold-700 dark:text-brand-gold-400 flex items-center justify-center">
          <Icon className="w-5 h-5" />
        </div>
        <h2 className="text-xl font-serif font-semibold text-brand-stone-900 dark:text-slate-100">{title}</h2>
      </div>
      {children}
    </section>
  );
}

export default function NotificationPreferences({ currentClient }) {
  const [preferences, setPreferences] = useState(DEFAULTS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [saved, setSaved] = useState(false);
  const role = currentClient?.user_role || 'client';
  const isTherapist = ['therapist', 'admin', 'supervisor'].includes(role);

  const visibleCategories = useMemo(() => {
    const base = [
      { key: 'homework_enabled', label: 'Assigned practice', description: 'Advisor-guided practice starts, completions, and reviews.' },
      { key: 'session_agenda_enabled', label: 'Session agendas', description: 'Pre-session agenda submissions and reviews.' },
      { key: 'treatment_plan_enabled', label: 'Treatment goals', description: 'Treatment goal changes and completions.' },
      { key: 'live_session_enabled', label: 'Live guided practices', description: 'Live Advisor-guided practice starts, joins, and endings.' },
      { key: 'general_updates_enabled', label: 'General updates', description: 'Routine app and care-workflow updates.' }
    ];
    if (isTherapist) {
      base.splice(4, 0,
        { key: 'report_enabled', label: 'Reports', description: 'Clinical report generation updates.' },
        { key: 'therapist_note_activity_enabled', label: 'Advisor note activity', description: 'Advisor workflow updates in your activity feed.' }
      );
    }
    return base;
  }, [isTherapist]);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError('');
    const { data, error: requestError } = await loadNotificationPreferences();
    if (requestError) setError(requestError.message || 'Unable to load notification preferences.');
    else setPreferences(normalizePreferences(data));
    setLoading(false);
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const updateField = (field, value) => {
    setSaved(false);
    setPreferences((current) => ({ ...current, [field]: value }));
  };

  const handleSave = async (event) => {
    event.preventDefault();
    setSaving(true);
    setError('');
    setSaved(false);
    const payload = {
      ...preferences,
      quiet_hours_start: preferences.quiet_hours_start || null,
      quiet_hours_end: preferences.quiet_hours_end || null
    };
    const { data, error: requestError } = await updateNotificationPreferences(payload);
    if (requestError) setError(requestError.message || 'Unable to save notification preferences.');
    else {
      setPreferences(normalizePreferences(data));
      setSaved(true);
    }
    setSaving(false);
  };

  const resetDefaults = () => {
    setSaved(false);
    setPreferences(DEFAULTS);
  };

  if (loading) {
    return (
      <main className="max-w-4xl mx-auto px-6 py-10">
        <div className="soft-card p-10 text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-brand-gold-600 mx-auto mb-4" />
          <p className="text-sm text-brand-stone-600 dark:text-slate-400">Loading notification preferences…</p>
        </div>
      </main>
    );
  }

  return (
    <main className="max-w-4xl mx-auto px-6 py-10">
      <div className="mb-8">
        <p className="text-xs font-bold uppercase tracking-[0.25em] text-brand-emerald-700 dark:text-brand-emerald-100 mb-2">Activity Center</p>
        <h1 className="text-3xl font-serif font-semibold text-brand-stone-900 dark:text-slate-100">Notification Preferences</h1>
        <p className="text-sm text-brand-stone-600 dark:text-slate-400 mt-2">Choose which in-app updates appear and when routine notifications should pause.</p>
      </div>

      {error && (
        <div className="mb-6 rounded-2xl border border-red-200 bg-red-50 text-red-700 px-4 py-3 text-sm dark:bg-red-950/30 dark:border-red-900 dark:text-red-200">
          {error}
        </div>
      )}
      {saved && (
        <div className="mb-6 rounded-2xl border border-emerald-200 bg-emerald-50 text-emerald-700 px-4 py-3 text-sm dark:bg-emerald-950/30 dark:border-emerald-900 dark:text-emerald-200 flex items-center gap-2">
          <CheckCircle className="w-4 h-4" /> Preferences saved.
        </div>
      )}

      <form onSubmit={handleSave} className="space-y-6">
        <Section icon={Bell} title="General">
          <ToggleRow
            label="In-app notifications enabled"
            description="Turn off routine in-app notification creation while preserving important live-session updates."
            checked={preferences.in_app_enabled}
            onChange={(value) => updateField('in_app_enabled', value)}
          />
        </Section>

        <Section icon={Clock} title="Quiet Hours">
          <p className="rounded-2xl bg-brand-emerald-50 dark:bg-brand-emerald-950/30 border border-brand-emerald-100 dark:border-brand-emerald-900/60 px-4 py-3 text-sm text-brand-emerald-900 dark:text-brand-emerald-100">
            Quiet hours only pause routine in-app notifications. This app is not monitored for emergencies.
          </p>
          <ToggleRow
            label="Quiet hours enabled"
            description="Pause normal and low-priority in-app notifications during your selected local hours."
            checked={preferences.quiet_hours_enabled}
            onChange={(value) => updateField('quiet_hours_enabled', value)}
          />
          <div className="grid sm:grid-cols-3 gap-4">
            <label className="space-y-2">
              <span className="text-sm font-semibold text-brand-stone-700 dark:text-slate-200">Start time</span>
              <input type="time" value={preferences.quiet_hours_start} onChange={(event) => updateField('quiet_hours_start', event.target.value)} className="w-full rounded-2xl border border-brand-stone-200 dark:border-slate-700 bg-white/80 dark:bg-slate-900 px-4 py-3 text-brand-stone-900 dark:text-slate-100" />
            </label>
            <label className="space-y-2">
              <span className="text-sm font-semibold text-brand-stone-700 dark:text-slate-200">End time</span>
              <input type="time" value={preferences.quiet_hours_end} onChange={(event) => updateField('quiet_hours_end', event.target.value)} className="w-full rounded-2xl border border-brand-stone-200 dark:border-slate-700 bg-white/80 dark:bg-slate-900 px-4 py-3 text-brand-stone-900 dark:text-slate-100" />
            </label>
            <label className="space-y-2">
              <span className="text-sm font-semibold text-brand-stone-700 dark:text-slate-200">Timezone</span>
              <select value={preferences.timezone} onChange={(event) => updateField('timezone', event.target.value)} className="w-full rounded-2xl border border-brand-stone-200 dark:border-slate-700 bg-white/80 dark:bg-slate-900 px-4 py-3 text-brand-stone-900 dark:text-slate-100">
                {TIMEZONES.map((timezone) => <option key={timezone} value={timezone}>{timezone}</option>)}
              </select>
            </label>
          </div>
          <ToggleRow
            label="Allow important notifications during quiet hours"
            description="Important in-app updates can still be created during quiet hours."
            checked={preferences.allow_important_during_quiet_hours}
            onChange={(value) => updateField('allow_important_during_quiet_hours', value)}
          />
          <ToggleRow
            label="Allow live session notifications during quiet hours"
            description="Live Advisor-guided practice updates can bypass quiet hours so session coordination is visible."
            checked={preferences.allow_live_session_during_quiet_hours}
            onChange={(value) => updateField('allow_live_session_during_quiet_hours', value)}
          />
        </Section>

        <Section icon={ShieldCheck} title="Categories">
          <div className="space-y-3">
            {visibleCategories.map((category) => (
              <ToggleRow
                key={category.key}
                label={category.label}
                description={category.description}
                checked={preferences[category.key]}
                onChange={(value) => updateField(category.key, value)}
              />
            ))}
          </div>
        </Section>

        <div className="flex flex-col sm:flex-row gap-3 sm:justify-end">
          <button type="button" onClick={resetDefaults} className="px-5 py-3 rounded-2xl font-semibold border border-brand-stone-200 dark:border-slate-700 text-brand-stone-700 dark:text-slate-200 bg-white/70 dark:bg-slate-900/60 hover:border-brand-gold-300">
            <RotateCcw className="w-4 h-4 inline mr-2" /> Reset to defaults
          </button>
          <button type="submit" disabled={saving} className="btn-sanctuary-primary disabled:opacity-60">
            <Save className="w-4 h-4" /> {saving ? 'Saving…' : 'Save preferences'}
          </button>
        </div>
      </form>
    </main>
  );
}
