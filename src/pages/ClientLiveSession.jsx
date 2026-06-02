import { useEffect, useState } from 'react';
import { AlertTriangle, DoorOpen, HeartPulse, Loader2, RefreshCw } from 'lucide-react';
import GuidedBreathingLive from '../components/GuidedBreathingLive';
import {
  getActiveLiveSessionForClient,
  getLiveSessionState,
  heartbeatLiveSession
} from '../lib/liveSession';

const SAFETY_COPY = 'Live co-therapy tools are used during scheduled sessions or therapist-guided care. They are not monitored for emergencies. If you are in immediate danger or may harm yourself or someone else, call 911 or your local crisis line now.';

export default function ClientLiveSession() {
  const [session, setSession] = useState(null);
  const [joined, setJoined] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadActive = async () => {
    setError('');
    const { data, error: activeError } = await getActiveLiveSessionForClient();
    if (activeError) setError(activeError.message);
    setSession(data || null);
    setLoading(false);
  };

  useEffect(() => {
    let cancelled = false;
    const poll = async () => {
      if (joined && session?.id) {
        const { data, error: stateError } = await getLiveSessionState({ sessionId: session.id });
        if (!cancelled && stateError) setError(stateError.message);
        if (!cancelled && data) setSession(data);
      } else {
        const { data, error: activeError } = await getActiveLiveSessionForClient();
        if (!cancelled && activeError) setError(activeError.message);
        if (!cancelled) {
          setSession(data || null);
          setLoading(false);
        }
      }
    };
    poll();
    const interval = setInterval(poll, 2000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [joined, session?.id]);

  useEffect(() => {
    if (!joined || !session?.id || session.status === 'ended') return undefined;
    heartbeatLiveSession({ sessionId: session.id, role: 'client' }).then(({ data }) => {
      if (data) setSession(data);
    });
    const interval = setInterval(() => heartbeatLiveSession({ sessionId: session.id, role: 'client' }), 25000);
    return () => clearInterval(interval);
  }, [joined, session?.id, session?.status]);

  const handleJoin = async () => {
    if (!session?.id) return;
    setJoined(true);
    const { data, error: joinError } = await heartbeatLiveSession({ sessionId: session.id, role: 'client' });
    if (joinError) setError(joinError.message);
    if (data) setSession(data);
  };

  const handleLeave = () => {
    setJoined(false);
  };

  return (
    <div className="max-w-5xl mx-auto px-6 py-10 space-y-6">
      <div className="soft-card p-6 border border-brand-emerald-100 dark:border-slate-700">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.24em] text-brand-emerald-700 dark:text-brand-emerald-100">Live Session</p>
            <h1 className="text-3xl font-serif text-brand-stone-900 dark:text-slate-100 mt-2">Therapist-guided live exercise</h1>
            <p className="text-sm text-brand-stone-600 dark:text-slate-400 mt-2 max-w-3xl">
              Join only during scheduled care with your therapist. Therapist controls the activity; you can leave at any time.
            </p>
          </div>
          <HeartPulse className="w-12 h-12 text-brand-emerald-700 dark:text-brand-emerald-100" />
        </div>
      </div>

      <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900 flex gap-3">
        <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5" />
        <div>
          <p>{SAFETY_COPY}</p>
          <p className="mt-1">No video/audio is recorded and no therapy dialogue transcript is stored by this live exercise tool.</p>
        </div>
      </div>

      {error && <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</div>}

      <section className="soft-card p-6 min-h-[520px]">
        {loading ? (
          <div className="flex h-80 items-center justify-center text-brand-stone-600 dark:text-slate-400">
            <Loader2 className="w-6 h-6 animate-spin mr-2" /> Checking for a live session…
          </div>
        ) : !session ? (
          <div className="flex h-80 flex-col items-center justify-center text-center">
            <HeartPulse className="w-12 h-12 text-brand-stone-400 mb-4" />
            <h2 className="text-xl font-semibold text-brand-stone-900 dark:text-slate-100">No live session active</h2>
            <p className="text-sm text-brand-stone-600 dark:text-slate-400 mt-2 max-w-md">When your therapist starts a synchronized exercise, it will appear here.</p>
            <button type="button" onClick={loadActive} className="btn-sanctuary-secondary mt-5"><RefreshCw className="w-4 h-4" /> Refresh</button>
          </div>
        ) : !joined ? (
          <div className="flex h-80 flex-col items-center justify-center text-center">
            <HeartPulse className="w-12 h-12 text-brand-emerald-700 dark:text-brand-emerald-100 mb-4" />
            <h2 className="text-xl font-semibold text-brand-stone-900 dark:text-slate-100">Your therapist has started a live exercise</h2>
            <p className="text-sm text-brand-stone-600 dark:text-slate-400 mt-2 max-w-md">Join to see the synchronized activity on your screen. You may leave at any time.</p>
            <button type="button" onClick={handleJoin} className="btn-sanctuary-primary mt-5"><HeartPulse className="w-4 h-4" /> Join Live Session</button>
          </div>
        ) : (
          <div className="space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div>
                <p className="text-sm text-brand-stone-500 dark:text-slate-500">Session status</p>
                <h2 className="text-xl font-semibold text-brand-stone-900 dark:text-slate-100 capitalize">{session.status}</h2>
              </div>
              <button type="button" onClick={handleLeave} className="btn-sanctuary-secondary"><DoorOpen className="w-4 h-4" /> Leave session</button>
            </div>

            {session.current_activity === 'guided_breathing' ? (
              <GuidedBreathingLive activityState={session.activity_state} sessionStatus={session.status} />
            ) : (
              <div className="rounded-3xl border border-dashed border-brand-stone-200 dark:border-slate-700 p-10 text-center">
                <h2 className="text-xl font-semibold text-brand-stone-900 dark:text-slate-100">Waiting for therapist activity</h2>
                <p className="text-sm text-brand-stone-600 dark:text-slate-400 mt-2">Your therapist can start Guided Breathing or send a short grounding prompt.</p>
              </div>
            )}

            {session.activity_state?.lastPrompt && (
              <div className="rounded-2xl border border-brand-gold-100 bg-brand-gold-50/70 dark:bg-brand-gold-950/20 p-4">
                <p className="text-xs font-bold uppercase tracking-wide text-brand-gold-700">Therapist grounding prompt</p>
                <p className="mt-2 text-brand-stone-800 dark:text-slate-100">{session.activity_state.lastPrompt}</p>
              </div>
            )}
          </div>
        )}
      </section>
    </div>
  );
}
