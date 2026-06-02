import { useEffect, useState } from 'react';

function formatRemaining(seconds) {
  const safe = Math.max(0, Math.ceil(seconds || 0));
  const minutes = Math.floor(safe / 60);
  const remainder = safe % 60;
  return `${minutes}:${String(remainder).padStart(2, '0')}`;
}

function computeBreathingState(activityState = {}, sessionStatus = 'active') {
  const now = Date.now();
  const durationSeconds = Number(activityState.durationSeconds || 180);
  const inhaleSeconds = Number(activityState.inhaleSeconds || 4);
  const holdSeconds = Number(activityState.holdSeconds || 2);
  const exhaleSeconds = Number(activityState.exhaleSeconds || 6);
  const cycleSeconds = Number(activityState.cycleSeconds || inhaleSeconds + holdSeconds + exhaleSeconds || 12);
  const startedAtMs = new Date(activityState.startedAt || Date.now()).getTime();
  const pausedAtMs = activityState.pausedAt ? new Date(activityState.pausedAt).getTime() : null;
  const effectiveNow = sessionStatus === 'paused' || activityState.isPaused
    ? (Number.isNaN(pausedAtMs) ? now : pausedAtMs)
    : now;
  const elapsedSeconds = Number.isNaN(startedAtMs) ? 0 : Math.max(0, (effectiveNow - startedAtMs) / 1000);
  const remainingSeconds = Math.max(0, durationSeconds - elapsedSeconds);
  const isComplete = remainingSeconds <= 0 || activityState.isComplete;

  if (sessionStatus === 'paused' || activityState.isPaused) {
    return { phase: 'paused', label: 'Paused', remainingSeconds, progress: 0.5, isComplete };
  }

  if (isComplete) {
    return { phase: 'complete', label: 'Complete', remainingSeconds: 0, progress: 1, isComplete: true };
  }

  const cyclePosition = elapsedSeconds % cycleSeconds;
  if (cyclePosition < inhaleSeconds) {
    return {
      phase: 'inhale',
      label: 'Inhale',
      remainingSeconds,
      progress: inhaleSeconds ? cyclePosition / inhaleSeconds : 1,
      isComplete: false
    };
  }

  if (cyclePosition < inhaleSeconds + holdSeconds) {
    return {
      phase: 'hold',
      label: 'Hold',
      remainingSeconds,
      progress: 1,
      isComplete: false
    };
  }

  const exhalePosition = cyclePosition - inhaleSeconds - holdSeconds;
  return {
    phase: 'exhale',
    label: 'Exhale',
    remainingSeconds,
    progress: exhaleSeconds ? 1 - (exhalePosition / exhaleSeconds) : 0,
    isComplete: false
  };
}

export default function GuidedBreathingLive({ activityState = {}, sessionStatus = 'active', compact = false }) {
  const [, setTick] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => setTick((value) => value + 1), 500);
    return () => clearInterval(interval);
  }, []);

  const breathing = computeBreathingState(activityState, sessionStatus);

  const scale = breathing.phase === 'inhale'
    ? 0.78 + breathing.progress * 0.22
    : breathing.phase === 'exhale'
      ? 0.78 + breathing.progress * 0.22
      : breathing.phase === 'hold'
        ? 1
        : 0.82;

  const phaseColor = {
    inhale: 'text-brand-emerald-700 dark:text-brand-emerald-100',
    hold: 'text-brand-gold-700 dark:text-brand-gold-500',
    exhale: 'text-blue-700 dark:text-blue-300',
    paused: 'text-brand-stone-500 dark:text-slate-400',
    complete: 'text-brand-emerald-700 dark:text-brand-emerald-100'
  }[breathing.phase] || 'text-brand-stone-700 dark:text-slate-200';

  return (
    <div className={`rounded-3xl border border-brand-emerald-100 dark:border-slate-700 bg-white/80 dark:bg-brand-cardDark p-6 ${compact ? '' : 'max-w-xl mx-auto'}`}>
      <div className="text-center">
        <p className="text-xs font-bold uppercase tracking-[0.24em] text-brand-emerald-700 dark:text-brand-emerald-100 mb-2">
          Guided Breathing
        </p>
        <h2 className={`text-3xl font-serif ${phaseColor}`} aria-live="polite">
          {breathing.label}
        </h2>
        <p className="mt-2 text-sm text-brand-stone-600 dark:text-slate-400">
          {activityState.message || 'Follow the breathing circle gently.'}
        </p>
      </div>

      <div className="relative my-8 flex items-center justify-center" aria-hidden="true">
        <div className="absolute h-48 w-48 rounded-full bg-brand-emerald-100/60 dark:bg-brand-emerald-950/30 blur-xl" />
        <svg className="relative h-56 w-56" viewBox="0 0 220 220" role="img">
          <title>Breathing animation circle</title>
          <circle cx="110" cy="110" r="92" fill="none" stroke="currentColor" strokeWidth="2" className="text-brand-stone-200 dark:text-slate-700" />
          <circle
            cx="110"
            cy="110"
            r="70"
            fill="currentColor"
            className="text-brand-emerald-200 dark:text-brand-emerald-900/70 transition-transform duration-500 ease-in-out origin-center"
            style={{ transform: `scale(${scale})`, transformOrigin: '110px 110px' }}
          />
          <circle
            cx="110"
            cy="110"
            r="42"
            fill="currentColor"
            className="text-white/80 dark:text-slate-900/50 transition-transform duration-500 ease-in-out origin-center"
            style={{ transform: `scale(${scale})`, transformOrigin: '110px 110px' }}
          />
        </svg>
      </div>

      <div className="grid grid-cols-3 gap-3 text-center">
        <div className="rounded-2xl bg-brand-stone-50 dark:bg-slate-900/50 p-3">
          <p className="text-xs text-brand-stone-500 dark:text-slate-500">Remaining</p>
          <p className="text-lg font-semibold text-brand-stone-900 dark:text-slate-100">{formatRemaining(breathing.remainingSeconds)}</p>
        </div>
        <div className="rounded-2xl bg-brand-stone-50 dark:bg-slate-900/50 p-3">
          <p className="text-xs text-brand-stone-500 dark:text-slate-500">Cycle</p>
          <p className="text-lg font-semibold text-brand-stone-900 dark:text-slate-100">{activityState.cycleSeconds || 12}s</p>
        </div>
        <div className="rounded-2xl bg-brand-stone-50 dark:bg-slate-900/50 p-3">
          <p className="text-xs text-brand-stone-500 dark:text-slate-500">Status</p>
          <p className="text-lg font-semibold text-brand-stone-900 dark:text-slate-100">{breathing.isComplete ? 'Done' : sessionStatus}</p>
        </div>
      </div>

      <p className="sr-only">
        Current guided breathing instruction: {breathing.label}. Remaining time: {formatRemaining(breathing.remainingSeconds)}.
      </p>
    </div>
  );
}
