import { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, HeartPulse, Loader2, Pause, Play, Send, Square, UserCheck } from 'lucide-react';
import GuidedBreathingLive from '../components/GuidedBreathingLive';
import { clientAuth } from '../lib/supabasePersonalization';
import { loadAssignedClients } from '../lib/therapistAssignments';
import {
  endLiveActivity,
  endLiveSession,
  getLiveSessionState,
  heartbeatLiveSession,
  pauseLiveActivity,
  resumeLiveActivity,
  sendLivePrompt,
  startLiveActivity,
  startLiveSession
} from '../lib/liveSession';

const SAFETY_COPY = 'Live co-therapy tools are used during scheduled sessions or therapist-guided care. They are not monitored for emergencies. If you are in immediate danger or may harm yourself or someone else, call 911 or your local crisis line now.';

function isRecentlySeen(value) {
  if (!value) return false;
  const seenAt = new Date(value).getTime();
  return !Number.isNaN(seenAt) && Date.now() - seenAt < 45000;
}

export default function LiveCoTherapy() {
  const therapist = clientAuth.getCurrentClient();
  const [clients, setClients] = useState([]);
  const [selectedClientId, setSelectedClientId] = useState('');
  const [session, setSession] = useState(null);
  const [prompt, setPrompt] = useState('');
  const [error, setError] = useState('');
  const [loadingClients, setLoadingClients] = useState(true);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let mounted = true;
    loadAssignedClients(therapist?.id, 'id, name, email, status, user_role').then((rows) => {
      if (!mounted) return;
      setClients(rows || []);
      setLoadingClients(false);
    });
    return () => { mounted = false; };
  }, [therapist?.id]);

  useEffect(() => {
    if (!session?.id || session.status === 'ended') return undefined;
    let cancelled = false;
    const poll = async () => {
      const { data, error: stateError } = await getLiveSessionState({ sessionId: session.id });
      if (!cancelled && data) setSession(data);
      if (!cancelled && stateError) setError(stateError.message);
    };
    poll();
    const interval = setInterval(poll, 2000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [session?.id, session?.status]);

  useEffect(() => {
    if (!session?.id || session.status === 'ended') return undefined;
    const interval = setInterval(() => heartbeatLiveSession({ sessionId: session.id, role: 'therapist' }), 25000);
    return () => clearInterval(interval);
  }, [session?.id, session?.status]);

  const selectedClient = useMemo(
    () => clients.find((client) => client.id === selectedClientId),
    [clients, selectedClientId]
  );

  const runAction = async (action) => {
    setBusy(true);
    setError('');
    const { data, error: actionError } = await action();
    if (actionError) setError(actionError.message);
    if (data) setSession(data);
    setBusy(false);
    return data;
  };

  const handleStartSession = () => runAction(() => startLiveSession({ clientId: selectedClientId }));

  const handleStartBreathing = () => runAction(() => startLiveActivity({
    sessionId: session.id,
    activity: 'guided_breathing',
    activityState: {
      durationSeconds: 180,
      inhaleSeconds: 4,
      holdSeconds: 2,
      exhaleSeconds: 6,
      message: 'Follow the breathing circle gently.'
    }
  }));

  const handleSendPrompt = async (event) => {
    event.preventDefault();
    const sent = await runAction(() => sendLivePrompt({ sessionId: session.id, prompt }));
    if (sent) setPrompt('');
  };

  const clientOnline = isRecentlySeen(session?.client_last_seen_at);

  return (
    <div className="max-w-6xl mx-auto px-6 py-10 space-y-6">
      <div className="soft-card p-6 border border-brand-emerald-100 dark:border-slate-700">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.24em] text-brand-emerald-700 dark:text-brand-emerald-100">Live Co-Therapy</p>
            <h1 className="text-3xl font-serif text-brand-stone-900 dark:text-slate-100 mt-2">Synchronized session workspace</h1>
            <p className="text-sm text-brand-stone-600 dark:text-slate-400 mt-2 max-w-3xl">
              Launch lightweight therapist-guided exercises on an assigned client&apos;s screen. No video, audio, recording, transcripts, or emergency monitoring are included.
            </p>
          </div>
          <HeartPulse className="w-12 h-12 text-brand-emerald-700 dark:text-brand-emerald-100" />
        </div>
      </div>

      <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900 flex gap-3">
        <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5" />
        <p>{SAFETY_COPY} Therapist controls session activities; clients can leave at any time.</p>
      </div>

      {error && <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</div>}

      <div className="grid lg:grid-cols-[360px,1fr] gap-6">
        <section className="soft-card p-6 space-y-5">
          <div>
            <label className="block text-sm font-medium text-brand-stone-700 dark:text-slate-300 mb-2">Assigned client</label>
            <select
              value={selectedClientId}
              onChange={(event) => setSelectedClientId(event.target.value)}
              className="w-full rounded-2xl border border-brand-stone-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-4 py-3 text-brand-stone-900 dark:text-slate-100"
              disabled={loadingClients || Boolean(session && session.status !== 'ended')}
            >
              <option value="">Choose an assigned client…</option>
              {clients.map((client) => <option key={client.id} value={client.id}>{client.name || client.email || client.id}</option>)}
            </select>
          </div>

          <button
            type="button"
            onClick={handleStartSession}
            disabled={!selectedClientId || busy || Boolean(session && session.status !== 'ended')}
            className="btn-sanctuary-primary w-full justify-center disabled:opacity-50"
          >
            {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
            Start live session
          </button>

          <div className="rounded-2xl bg-brand-stone-50 dark:bg-slate-900/50 p-4 space-y-2 text-sm">
            <div className="flex justify-between"><span>Client</span><strong>{selectedClient?.name || 'Not selected'}</strong></div>
            <div className="flex justify-between"><span>Status</span><strong>{session?.status || 'No session'}</strong></div>
            <div className="flex justify-between"><span>Client joined</span><strong className={clientOnline ? 'text-brand-emerald-700' : ''}>{clientOnline ? 'Recently active' : 'Not seen yet'}</strong></div>
          </div>

          {session && session.status !== 'ended' && (
            <div className="space-y-3">
              <button type="button" onClick={handleStartBreathing} disabled={busy} className="btn-sanctuary-secondary w-full justify-center">
                <HeartPulse className="w-4 h-4" /> Start Guided Breathing
              </button>
              <div className="grid grid-cols-2 gap-2">
                <button type="button" onClick={() => runAction(() => pauseLiveActivity({ sessionId: session.id }))} disabled={busy || session.status === 'paused'} className="btn-sanctuary-secondary justify-center disabled:opacity-50"><Pause className="w-4 h-4" /> Pause</button>
                <button type="button" onClick={() => runAction(() => resumeLiveActivity({ sessionId: session.id }))} disabled={busy || session.status !== 'paused'} className="btn-sanctuary-secondary justify-center disabled:opacity-50"><Play className="w-4 h-4" /> Resume</button>
              </div>
              <button type="button" onClick={() => runAction(() => endLiveActivity({ sessionId: session.id }))} disabled={busy || !session.current_activity} className="btn-sanctuary-secondary w-full justify-center disabled:opacity-50"><Square className="w-4 h-4" /> End activity</button>
              <form onSubmit={handleSendPrompt} className="space-y-2">
                <textarea
                  value={prompt}
                  onChange={(event) => setPrompt(event.target.value.slice(0, 500))}
                  placeholder="Send a short grounding prompt…"
                  className="w-full min-h-24 rounded-2xl border border-brand-stone-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-4 py-3 text-sm"
                  maxLength={500}
                />
                <button type="submit" disabled={busy || !prompt.trim()} className="btn-sanctuary-secondary w-full justify-center disabled:opacity-50"><Send className="w-4 h-4" /> Send grounding prompt</button>
              </form>
              <button type="button" onClick={() => runAction(() => endLiveSession({ sessionId: session.id }))} disabled={busy} className="w-full rounded-2xl bg-red-600 px-4 py-3 text-white font-semibold hover:bg-red-700 disabled:opacity-50">End session</button>
            </div>
          )}
        </section>

        <section className="soft-card p-6 min-h-[520px]">
          {!session ? (
            <div className="h-full flex flex-col items-center justify-center text-center text-brand-stone-600 dark:text-slate-400">
              <UserCheck className="w-12 h-12 mb-4 text-brand-stone-400" />
              <h2 className="text-xl font-semibold text-brand-stone-900 dark:text-slate-100">Choose an assigned client to begin</h2>
              <p className="mt-2 max-w-md">The client can join from their Live Session page once you start the workspace.</p>
            </div>
          ) : (
            <div className="space-y-5">
              <div>
                <p className="text-sm text-brand-stone-500 dark:text-slate-500">Session ID</p>
                <p className="font-mono text-xs text-brand-stone-700 dark:text-slate-300 break-all">{session.id}</p>
              </div>
              {session.current_activity === 'guided_breathing' ? (
                <GuidedBreathingLive activityState={session.activity_state} sessionStatus={session.status} />
              ) : (
                <div className="rounded-3xl border border-dashed border-brand-stone-200 dark:border-slate-700 p-10 text-center">
                  <h2 className="text-xl font-semibold text-brand-stone-900 dark:text-slate-100">No activity currently running</h2>
                  <p className="text-sm text-brand-stone-600 dark:text-slate-400 mt-2">Start Guided Breathing or send a short grounding prompt.</p>
                </div>
              )}
              {session.activity_state?.lastPrompt && (
                <div className="rounded-2xl border border-brand-gold-100 bg-brand-gold-50/70 dark:bg-brand-gold-950/20 p-4">
                  <p className="text-xs font-bold uppercase tracking-wide text-brand-gold-700">Latest prompt</p>
                  <p className="mt-2 text-brand-stone-800 dark:text-slate-100">{session.activity_state.lastPrompt}</p>
                </div>
              )}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
