import { getLiveActivityDefinition } from '../../lib/liveActivityDefinitions';

function clampStep(value, max) {
  const numeric = Number(value || 0);
  if (!Number.isFinite(numeric)) return 0;
  return Math.min(Math.max(Math.floor(numeric), 0), Math.max(max - 1, 0));
}

export default function StepBasedLivePractice({ activityId, activityState = {}, sessionStatus = 'active', compact = false }) {
  const definition = getLiveActivityDefinition(activityId || activityState.activity);
  if (!definition) return null;

  const steps = definition.steps || [];
  const currentStep = clampStep(activityState.currentStep, steps.length);
  const step = steps[currentStep] || {};
  const progressPercent = steps.length ? ((currentStep + 1) / steps.length) * 100 : 0;
  const advisorPrompt = activityState.advisorPrompt || activityState.lastPrompt || '';

  return (
    <div className={`rounded-3xl border border-brand-emerald-100 dark:border-slate-700 bg-white/85 dark:bg-brand-cardDark p-6 ${compact ? '' : 'max-w-2xl mx-auto'}`}>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.24em] text-brand-emerald-700 dark:text-brand-emerald-100">
            Live Guided Practice
          </p>
          <h2 className="mt-2 text-3xl font-serif text-brand-stone-900 dark:text-slate-100">{definition.title}</h2>
          <p className="mt-2 text-sm text-brand-stone-600 dark:text-slate-400">{definition.description}</p>
        </div>
        <div className="rounded-2xl bg-brand-emerald-50 dark:bg-brand-emerald-950/30 px-4 py-3 text-sm text-brand-emerald-800 dark:text-brand-emerald-100">
          Step {currentStep + 1} of {steps.length}
        </div>
      </div>

      <div className="mt-6 h-2 rounded-full bg-brand-stone-100 dark:bg-slate-800 overflow-hidden" aria-hidden="true">
        <div className="h-full rounded-full bg-brand-emerald-600 transition-all" style={{ width: `${progressPercent}%` }} />
      </div>

      <div className="mt-6 rounded-3xl bg-brand-stone-50 dark:bg-slate-900/50 p-6">
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

      <div className="mt-5 flex flex-wrap items-center gap-2 text-xs text-brand-stone-500 dark:text-slate-500">
        <span className="rounded-full bg-brand-stone-100 dark:bg-slate-800 px-3 py-1 capitalize">{sessionStatus}</span>
        <span className="rounded-full bg-brand-stone-100 dark:bg-slate-800 px-3 py-1">No written responses requested</span>
        <span className="rounded-full bg-brand-stone-100 dark:bg-slate-800 px-3 py-1">Advisor-guided</span>
      </div>
    </div>
  );
}
