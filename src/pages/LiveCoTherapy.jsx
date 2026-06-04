import { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, ChevronLeft, ChevronRight, HeartPulse, Loader2, Pause, Play, Send, Square, UserCheck } from 'lucide-react';
import LiveActivityRenderer from '../components/live/LiveActivityRenderer';
import { LIVE_ACTIVITY_OPTIONS, STEP_BASED_ACTIVITY_IDS, getLiveActivityDefinition } from '../components/live/liveActivityConfig';
import { clientAuth } from '../lib/supabasePersonalization';
import { loadAssignedClients } from '../lib/advisorAssignments';
import {
  endLiveActivity,
  endLiveSession,
  getLiveSessionState,
  heartbeatLiveSession,
  nextLiveActivityStep,
  pauseLiveActivity,
  previousLiveActivityStep,
  resumeLiveActivity,
  sendLivePrompt,
  startLiveActivity,
  startLiveSession
} from '../lib/liveSession';

const SAFETY_COPY = 'Live guided practices are used during scheduled or Advisor-supported care. They are not monitored for emergencies. If you are in immediate danger or may harm yourself or someone else, call 911 or your local crisis line now.';

function isRecentlySeen(value) {
  if (!value) return false;
  const seenAt = new Date(value).getTime();
  return !Number.isNaN(seenAt) && Date.now() - seenAt < 45000;
}

export default function LiveCoTherapy() {
  const advisor = clientAuth.getCurrentClient();
  const [clients, setClients] = useState([]);
  const [selectedClientId, setSelectedClientId] = useState('');
  const [selectedActivity, setSelectedActivity] = useState('guided_breathing');
  const [session, setSession] = useState(null);
  const [prompt, setPrompt] = useState('');
  const [error, setError] = useState('');
  const [loadingClients, setLoadingClients] = useState(true);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let mounted = true;
    loadAssignedClients(advisor?.id, 'id, name, email, status, user_role').then((rows) => {
      if (!mounted) return;
      setClients(rows || []);
      setLoadingClients(false);
    });
    return () => { mounted = false; };
  }, [advisor?.id]);

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
    const interval = setInterval(() => heartbeatLiveSession({ sessionId: session.id, role: 'advisor' }), 25000);
    return () => clearInterval(interval);
  }, [session?.id, session?.status]);

  const selectedClient = useMemo(
    () => clients.find((client) => client.id === selectedClientId),
    [clients, selectedClientId]
  );
  const activeDefinition = getLiveActivityDefinition(session?.current_activity);
  const currentStep = Number(session?.activity_state?.currentStep || 0);
  const isStepBased = STEP_BASED_ACTIVITY_IDS.includes(session?.current_activity);
  const canGoBack = isStepBased && currentStep > 0;
  const canGoForward = isStepBased && activeDefinition && currentStep < activeDefinition.steps.length - 1;

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

  const handleLaunchPractice = () => {
    const definition = getLiveActivityDefinition(selectedActivity);
    return runAction(() => startLiveActivity({
      sessionId: session.id,
      activity: selectedActivity,
      activityState: selectedActivity === 'shared_parts_map'
        ? {
            sourcePractice: definition?.sourcePractice || 'My Inner System / Parts Work',
            map: { nodes: [], edges: [] },
            advisorPrompt: '',
            selectedNodeId: null
          }
        : selectedActivity === 'guided_breathing'
          ? {
            durationSeconds: definition?.defaultDurationSeconds || 180,
            inhaleSeconds: 4,
            holdSeconds: 2,
            exhaleSeconds: 6,
            message: definition?.clientDescription || 'Follow the breathing circle gently.',
            sourcePractice: definition?.sourcePractice
          }
          : {
            durationSeconds: definition?.defaultDurationSeconds || 300,
            sourcePractice: definition?.sourcePractice,
            sourceActivity: definition?.sourceActivity,
            steps: definition?.steps || [],
            presetId: definition?.id,
            advisorPrompt: ''
          }
    }));
  };

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
            <p className="text-xs font-bold uppercase tracking-[0.24em] text-brand-emerald-700 dark:text-brand-emerald-100">Live Advisor-Guided Practice</p>
            <h1 className="text-3xl font-serif text-brand-stone-900 dark:text-slate-100 mt-2">Synchronized practice workspace</h1>
            <p className="text-sm text-brand-stone-600 dark:text-slate-400 mt-2 max-w-3xl">
              Launch lightweight Advisor-guided IFS practices on an assigned client&apos;s screen. No video, audio, recording, transcripts, or emergency monitoring are included.
            </p>
          </div>
          <HeartPulse className="w-12 h-12 text-brand-emerald-700 dark:text-brand-emerald-100" />
        </div>
      </div>

      <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900 flex gap-3">
        <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5" />
        <p>{SAFETY_COPY} Advisor controls session activities; clients can leave at any time.</p>
      </div>

      {error && <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</div>}

      <div className="grid lg:grid-cols-[380px,1fr] gap-6">
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
            Start Guided Practice
          </button>

          <div className="rounded-2xl bg-brand-stone-50 dark:bg-slate-900/50 p-4 space-y-2 text-sm">
            <div className="flex justify-between"><span>Client</span><strong>{selectedClient?.name || 'Not selected'}</strong></div>
            <div className="flex justify-between"><span>Status</span><strong>{session?.status || 'No session'}</strong></div>
            <div className="flex justify-between"><span>Client presence</span><strong className={clientOnline ? 'text-brand-emerald-700' : ''}>{clientOnline ? 'Recently active' : 'Not seen yet'}</strong></div>
            {activeDefinition && <div className="flex justify-between"><span>Practice</span><strong>{activeDefinition.shortTitle}</strong></div>}
          </div>

          {session && session.status !== 'ended' && (
            <div className="space-y-4">
              <div>
                <p className="block text-sm font-medium text-brand-stone-700 dark:text-slate-300 mb-2">Choose an IFS practice</p>
                <div className="grid gap-3" role="radiogroup" aria-label="Choose an IFS practice">
                  {LIVE_ACTIVITY_OPTIONS.map((activity) => {
                    const selected = selectedActivity === activity.id;
                    return (
                      <button
                        key={activity.id}
                        type="button"
                        onClick={() => setSelectedActivity(activity.id)}
                        role="radio"
                        aria-checked={selected}
                        className={`rounded-2xl border p-4 text-left transition ${selected ? 'border-brand-emerald-500 bg-brand-emerald-50 dark:bg-brand-emerald-950/30' : 'border-brand-stone-200 bg-white hover:border-brand-emerald-200 dark:border-slate-700 dark:bg-slate-900'}`}
                      >
                        <span className="flex items-center justify-between gap-3">
                          <span className="font-semibold text-brand-stone-900 dark:text-slate-100">{activity.title}</span>
                          <span className="text-xs text-brand-stone-500 dark:text-slate-500">{Math.round((activity.defaultDurationSeconds || 180) / 60)} min</span>
                        </span>
                        <span className="mt-2 block text-xs leading-relaxed text-brand-stone-600 dark:text-slate-400">{activity.advisorDescription}</span>
                        {(activity.sourcePractice || activity.sourceActivity) && (
                          <span className="mt-3 inline-flex rounded-full bg-brand-stone-100 dark:bg-slate-800 px-3 py-1 text-[11px] font-medium text-brand-stone-600 dark:text-slate-400">
                            Source: {activity.sourcePractice || activity.sourceActivity}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
              <button type="button" onClick={handleLaunchPractice} disabled={busy} className="btn-sanctuary-secondary w-full justify-center">
                <HeartPulse className="w-4 h-4" /> {selectedActivity === 'shared_parts_map' ? 'Start Shared Parts Map' : 'Start Guided Practice'}
              </button>

              {isStepBased && (
                <div className="grid grid-cols-2 gap-2">
                  <button type="button" onClick={() => runAction(() => previousLiveActivityStep({ sessionId: session.id }))} disabled={busy || !canGoBack} className="btn-sanctuary-secondary justify-center disabled:opacity-50"><ChevronLeft className="w-4 h-4" /> Previous</button>
                  <button type="button" onClick={() => runAction(() => nextLiveActivityStep({ sessionId: session.id }))} disabled={busy || !canGoForward} className="btn-sanctuary-secondary justify-center disabled:opacity-50">Next <ChevronRight className="w-4 h-4" /></button>
                </div>
              )}

              <div className="grid grid-cols-2 gap-2">
                <button type="button" onClick={() => runAction(() => pauseLiveActivity({ sessionId: session.id }))} disabled={busy || session.status === 'paused' || !session.current_activity} className="btn-sanctuary-secondary justify-center disabled:opacity-50"><Pause className="w-4 h-4" /> Pause</button>
                <button type="button" onClick={() => runAction(() => resumeLiveActivity({ sessionId: session.id }))} disabled={busy || session.status !== 'paused'} className="btn-sanctuary-secondary justify-center disabled:opacity-50"><Play className="w-4 h-4" /> Resume</button>
              </div>
              <button type="button" onClick={() => runAction(() => endLiveActivity({ sessionId: session.id }))} disabled={busy || !session.current_activity} className="btn-sanctuary-secondary w-full justify-center disabled:opacity-50"><Square className="w-4 h-4" /> End practice</button>
              <form onSubmit={handleSendPrompt} className="space-y-2">
                <textarea
                  value={prompt}
                  onChange={(event) => setPrompt(event.target.value.slice(0, 500))}
                  placeholder="Send a short Advisor prompt…"
                  className="w-full min-h-24 rounded-2xl border border-brand-stone-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-4 py-3 text-sm"
                  maxLength={500}
                />
                <button type="submit" disabled={busy || !prompt.trim()} className="btn-sanctuary-secondary w-full justify-center disabled:opacity-50"><Send className="w-4 h-4" /> Send Advisor prompt</button>
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
              {session.current_activity ? (
                <LiveActivityRenderer currentActivity={session.current_activity} activityState={session.activity_state} sessionStatus={session.status} sessionId={session.id} role="advisor" onSessionUpdate={setSession} />
              ) : (
                <div className="rounded-3xl border border-dashed border-brand-stone-200 dark:border-slate-700 p-10 text-center">
                  <h2 className="text-xl font-semibold text-brand-stone-900 dark:text-slate-100">No activity currently running</h2>
                  <p className="text-sm text-brand-stone-600 dark:text-slate-400 mt-2">Choose and launch a live guided practice when you are ready.</p>
                </div>
              )}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
