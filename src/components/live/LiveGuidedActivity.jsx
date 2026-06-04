import { useEffect, useState } from 'react';
import { getLiveActivityDefinition } from './liveActivityConfig';

function formatRemaining(totalSeconds) {
  const safeSeconds = Math.max(0, Math.ceil(Number(totalSeconds) || 0));
  const minutes = Math.floor(safeSeconds / 60);
  const seconds = safeSeconds % 60;
  return `${minutes}:${String(seconds).padStart(2, '0')}`;
}

function getTime(value) {
  const time = new Date(value || Date.now()).getTime();
  return Number.isNaN(time) ? Date.now() : time;
}

function clampStep(value, max) {
  const numeric = Number(value || 0);
  if (!Number.isFinite(numeric)) return 0;
  return Math.min(Math.max(Math.floor(numeric), 0), Math.max(max - 1, 0));
}

function computeActivityProgress(activityState, sessionStatus, stepCount, now) {
  const durationSeconds = Number(activityState.durationSeconds || activityState.defaultDurationSeconds || 300);
  const safeDuration = Number.isFinite(durationSeconds) ? Math.max(durationSeconds, 30) : 300;
  const startedAtMs = getTime(activityState.startedAt);
  const pausedAtMs = activityState.pausedAt ? getTime(activityState.pausedAt) : null;
  const effectiveNow = sessionStatus === 'paused' || activityState.status === 'paused'
    ? (pausedAtMs || now)
    : now;
  const elapsedSeconds = Math.max(0, (effectiveNow - startedAtMs) / 1000);
  const progress = Math.min(elapsedSeconds / safeDuration, 1);
  const remainingSeconds = Math.max(0, safeDuration - elapsedSeconds);
  const timedStep = stepCount ? clampStep(Math.floor(progress * stepCount), stepCount) : 0;
  const currentStep = activityState.stepChangedAt ? clampStep(activityState.currentStep, stepCount) : timedStep;

  return {
    currentStep,
    elapsedSeconds,
    progress,
    remainingSeconds,
    isComplete: progress >= 1 || activityState.isComplete || activityState.status === 'complete'
  };
}

export default function LiveGuidedActivity({ activityId, activityState = {}, sessionStatus = 'active', compact = false }) {
  const [now, setNow] = useState(() => new Date().getTime());
  const [clientReady, setClientReady] = useState(false);
  const [privateNote, setPrivateNote] = useState('');
  const definition = getLiveActivityDefinition(activityId || activityState.activity);

  useEffect(() => {
    const interval = setInterval(() => setNow(new Date().getTime()), 1000);
    return () => clearInterval(interval);
  }, []);


  const steps = definition?.steps || activityState.steps || [];
  const progressState = computeActivityProgress(activityState, sessionStatus, steps.length, now);
  if (!definition) return null;

  const step = steps[progressState.currentStep] || {};
  const advisorPrompt = activityState.advisorPrompt || activityState.lastPrompt || activityState.message || '';
  const percent = Math.round(progressState.progress * 100);
  const statusLabel = sessionStatus === 'paused' || activityState.status === 'paused'
    ? 'Paused by Advisor'
    : progressState.isComplete
      ? 'Practice complete'
      : 'In progress';

  return (
    <div className={`rounded-3xl border border-brand-emerald-100 dark:border-slate-700 bg-white/85 dark:bg-brand-cardDark p-6 ${compact ? '' : 'max-w-2xl mx-auto'}`}>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.24em] text-brand-emerald-700 dark:text-brand-emerald-100">
            Live Guided Practice
          </p>
          <h2 className="mt-2 text-3xl font-serif text-brand-stone-900 dark:text-slate-100">{definition.title}</h2>
          <p className="mt-2 text-sm text-brand-stone-600 dark:text-slate-400">{definition.clientDescription}</p>
        </div>
        <div className="rounded-2xl bg-brand-emerald-50 dark:bg-brand-emerald-950/30 px-4 py-3 text-sm text-brand-emerald-800 dark:text-brand-emerald-100">
          {statusLabel}
        </div>
      </div>

      <div className="mt-6" aria-label={`${definition.title} progress ${percent}%`}>
        <div className="mb-2 flex items-center justify-between text-xs text-brand-stone-500 dark:text-slate-500">
          <span>Step {progressState.currentStep + 1} of {steps.length}</span>
          <span>{formatRemaining(progressState.remainingSeconds)} remaining</span>
        </div>
        <div className="h-2 rounded-full bg-brand-stone-100 dark:bg-slate-800 overflow-hidden" aria-hidden="true">
          <div className="h-full rounded-full bg-brand-emerald-600 transition-all duration-500" style={{ width: `${percent}%` }} />
        </div>
      </div>

      <div className="mt-6 rounded-3xl bg-brand-stone-50 dark:bg-slate-900/50 p-6" aria-live="polite">
        <p className="text-xs font-bold uppercase tracking-wide text-brand-stone-500 dark:text-slate-500">Current step</p>
        <h3 className="mt-2 text-2xl font-semibold text-brand-stone-900 dark:text-slate-100">{step.title}</h3>
        <p className="mt-4 text-lg leading-relaxed text-brand-stone-800 dark:text-slate-100">{step.prompt}</p>
        {step.helper && <p className="mt-3 text-sm leading-relaxed text-brand-stone-600 dark:text-slate-400">{step.helper}</p>}
      </div>

      {advisorPrompt && (
        <div className="mt-5 rounded-2xl border border-brand-gold-100 bg-brand-gold-50/80 dark:bg-brand-gold-950/20 p-4">
          <p className="text-xs font-bold uppercase tracking-wide text-brand-gold-700 dark:text-brand-gold-300">Advisor prompt</p>
          <p className="mt-2 text-brand-stone-800 dark:text-slate-100">{advisorPrompt}</p>
        </div>
      )}

      <div className="mt-5 rounded-2xl border border-brand-stone-100 dark:border-slate-700 p-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-semibold text-brand-stone-900 dark:text-slate-100">Follow along at your own pace</p>
            <p className="text-xs text-brand-stone-500 dark:text-slate-500">This button is local only and is not saved.</p>
          </div>
          <button
            type="button"
            onClick={() => setClientReady((value) => !value)}
            className="btn-sanctuary-secondary justify-center"
          >
            {clientReady ? 'Ready noted locally' : 'I’m ready'}
          </button>
        </div>
        <label className="mt-4 block text-xs font-bold uppercase tracking-wide text-brand-stone-500 dark:text-slate-500" htmlFor="live-private-note">
          Optional private note — not saved
        </label>
        <textarea
          id="live-private-note"
          value={privateNote}
          onChange={(event) => setPrivateNote(event.target.value.slice(0, 500))}
          placeholder="A private reminder for yourself during this practice…"
          className="mt-2 w-full min-h-20 rounded-2xl border border-brand-stone-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-4 py-3 text-sm text-brand-stone-900 dark:text-slate-100"
          maxLength={500}
        />
      </div>

      <div className="mt-5 flex flex-wrap items-center gap-2 text-xs text-brand-stone-500 dark:text-slate-500">
        <span className="rounded-full bg-brand-stone-100 dark:bg-slate-800 px-3 py-1 capitalize">{sessionStatus}</span>
        <span className="rounded-full bg-brand-stone-100 dark:bg-slate-800 px-3 py-1">No written responses requested</span>
        <span className="rounded-full bg-brand-stone-100 dark:bg-slate-800 px-3 py-1">Private notes stay local</span>
        <span className="rounded-full bg-brand-stone-100 dark:bg-slate-800 px-3 py-1">Advisor-guided</span>
      </div>

      <p className="sr-only">
        Current guided activity instruction: {step.title}. {step.prompt}. Remaining time: {formatRemaining(progressState.remainingSeconds)}.
      </p>
    </div>
  );
}
