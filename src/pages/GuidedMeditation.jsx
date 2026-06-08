import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import {
  ArrowLeft,
  CheckCircle,
  ChevronRight,
  Clock,
  Headphones,
  Pause,
  PenLine,
  Play,
  RotateCcw,
  Sparkles,
  Volume2,
  Wind,
} from 'lucide-react';
import { useTheme } from '../contexts/ThemeContext';
import { useData } from '../contexts/DataContext';
import { supabaseHelpers } from '../lib/supabase';
import { clientAuth } from '../lib/supabasePersonalization';
import {
  getGuidedPracticeById,
  guidedPracticeLibrary,
  practiceCategories,
  quickPractices,
} from '../lib/guidedPracticeLibrary';

const AUDIO_FALLBACK_COPY = 'Audio is not available for this practice yet. You can still complete the guided practice below.';

function secondsToTime(seconds = 0) {
  const minutes = Math.floor(seconds / 60);
  const remaining = seconds % 60;
  return `${minutes}:${String(remaining).padStart(2, '0')}`;
}

function PracticeMeta({ practice }) {
  return (
    <div className="mt-3 flex flex-wrap gap-2 text-xs font-semibold text-brand-stone-600 dark:text-slate-300">
      <span className="rounded-full bg-white/70 px-3 py-1 dark:bg-slate-900/60">{practice.level}</span>
      <span className="rounded-full bg-white/70 px-3 py-1 dark:bg-slate-900/60">{practice.duration}</span>
      <span className="rounded-full bg-white/70 px-3 py-1 capitalize dark:bg-slate-900/60">{practice.type}</span>
    </div>
  );
}

function PracticeCard({ practice, completed }) {
  return (
    <article className="flex h-full flex-col rounded-3xl border border-brand-stone-200/70 bg-white/85 p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-brand-gold-200 hover:shadow-lg dark:border-slate-800 dark:bg-brand-cardDark/90 dark:hover:border-brand-gold-900/50">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-brand-gold-700 dark:text-brand-gold-500">{practice.category}</p>
          <h3 className="mt-2 text-lg font-semibold text-brand-stone-900 dark:text-slate-100">{practice.title}</h3>
        </div>
        {completed && <CheckCircle className="h-5 w-5 shrink-0 text-emerald-500" aria-label="Completed" />}
      </div>
      <p className="mt-3 flex-1 text-sm leading-relaxed text-brand-stone-600 dark:text-slate-400">{practice.description}</p>
      <PracticeMeta practice={practice} />
      <Link
        to={practice.route}
        className="mt-5 inline-flex items-center justify-center gap-2 rounded-2xl bg-brand-gold-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-brand-gold-700"
      >
        Start <ChevronRight className="h-4 w-4" />
      </Link>
    </article>
  );
}

function BreathingPrompt({ practice, isPlaying }) {
  const pattern = practice.breathingPattern || [];
  const totalPatternSeconds = pattern.reduce((sum, phase) => sum + phase.seconds, 0) || 1;
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    if (!isPlaying) return undefined;
    const interval = setInterval(() => setElapsed((current) => current + 1), 1000);
    return () => clearInterval(interval);
  }, [isPlaying]);


  if (!pattern.length) return null;

  const withinCycle = elapsed % totalPatternSeconds;
  const currentPhase = pattern.reduce((match, phase, index) => {
    if (match.phase) return match;
    const phaseStart = pattern.slice(0, index).reduce((sum, item) => sum + item.seconds, 0);
    const phaseEnd = phaseStart + phase.seconds;
    return withinCycle >= phaseStart && withinCycle < phaseEnd ? { phase } : match;
  }, { phase: null }).phase || pattern[0];
  const cycle = Math.floor(elapsed / totalPatternSeconds) + 1;

  return (
    <div className="rounded-3xl border border-emerald-100 bg-emerald-50/80 p-5 text-center dark:border-emerald-900/40 dark:bg-emerald-950/20">
      <p className="text-xs font-bold uppercase tracking-[0.24em] text-emerald-700 dark:text-emerald-300">Breathing timer</p>
      <div className="mx-auto my-5 flex h-36 w-36 items-center justify-center rounded-full border-4 border-emerald-200 bg-white text-2xl font-bold text-emerald-700 shadow-inner transition dark:border-emerald-800 dark:bg-slate-900 dark:text-emerald-300">
        {currentPhase.label}
      </div>
      <p className="text-sm text-brand-stone-600 dark:text-slate-300">{currentPhase.label} for {currentPhase.seconds} counts · Cycle {cycle}</p>
      <div className="mt-4 flex flex-wrap justify-center gap-2">
        {pattern.map((phase) => (
          <span key={`${phase.label}-${phase.seconds}`} className="rounded-full bg-white/80 px-3 py-1 text-xs font-semibold text-emerald-700 dark:bg-slate-900/70 dark:text-emerald-300">
            {phase.label} {phase.seconds}
          </span>
        ))}
      </div>
    </div>
  );
}

function PracticePlayer({ practice, completed, onComplete }) {
  const { theme } = useTheme();
  const isDark = theme.isDark;
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [elapsed, setElapsed] = useState(0);
  const [audioLoaded, setAudioLoaded] = useState(false);
  const [audioError, setAudioError] = useState(false);
  const [reflection, setReflection] = useState('');
  const audioRef = useRef(null);
  const hasAudio = Boolean(practice.audioUrl && audioLoaded && !audioError);
  const showFallback = !hasAudio;
  const activeStep = practice.steps[currentStep] || practice.steps[0];

  useEffect(() => {
    if (!isPlaying || hasAudio) return undefined;
    const interval = setInterval(() => {
      setElapsed((previous) => {
        const next = previous + 1;
        const nextStepIndex = practice.steps.findIndex((step, index) => {
          const nextStep = practice.steps[index + 1];
          return next >= step.time && (!nextStep || next < nextStep.time);
        });
        if (nextStepIndex >= 0) setCurrentStep(nextStepIndex);
        if (next >= practice.durationSeconds) {
          setIsPlaying(false);
          onComplete(practice.id);
          return practice.durationSeconds;
        }
        return next;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [hasAudio, isPlaying, onComplete, practice]);

  const togglePlay = () => {
    if (hasAudio && audioRef.current) {
      if (isPlaying) {
        audioRef.current.pause();
      } else {
        audioRef.current.play().catch(() => setAudioError(true));
      }
    }
    setIsPlaying((current) => !current);
  };

  const resetPractice = () => {
    setIsPlaying(false);
    setCurrentStep(0);
    setElapsed(0);
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }
  };

  const stepProgress = practice.steps.length > 1 ? (currentStep / (practice.steps.length - 1)) * 100 : 100;
  const timeProgress = Math.min(100, (elapsed / practice.durationSeconds) * 100);

  return (
    <div className={`mx-auto max-w-3xl px-4 py-8 ${isDark ? 'text-slate-100' : 'text-brand-stone-900'}`}>
      <Link to="/meditation" className="mb-5 inline-flex items-center gap-2 text-sm font-semibold text-brand-gold-700 hover:text-brand-gold-800 dark:text-brand-gold-500">
        <ArrowLeft className="h-4 w-4" /> Back to full library
      </Link>

      <section className="rounded-[2rem] border border-brand-gold-100 bg-gradient-to-br from-white via-brand-sanctuary to-brand-gold-50/70 p-6 shadow-sm dark:border-brand-gold-900/40 dark:from-brand-cardDark dark:via-brand-midnight dark:to-brand-gold-950/20 md:p-8">
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.24em] text-brand-gold-700 dark:text-brand-gold-500">{practice.category}</p>
            <h1 className="mt-2 font-serif text-3xl font-semibold text-brand-stone-900 dark:text-slate-100">{practice.title}</h1>
            <p className="mt-3 text-brand-stone-600 dark:text-slate-300">{practice.description}</p>
            <PracticeMeta practice={practice} />
          </div>
          {completed && <span className="inline-flex items-center gap-2 rounded-full bg-emerald-50 px-3 py-1 text-sm font-semibold text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-300"><CheckCircle className="h-4 w-4" /> Completed</span>}
        </div>
      </section>

      <section className="mt-6 space-y-5 rounded-[2rem] border border-brand-stone-200 bg-white/85 p-5 dark:border-slate-800 dark:bg-brand-cardDark/90 md:p-6">
        {practice.audioUrl && (
          <div className="rounded-2xl border border-brand-stone-200 bg-brand-stone-50/60 p-4 dark:border-slate-700 dark:bg-slate-900/50">
            <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-brand-stone-700 dark:text-slate-200">
              <Headphones className="h-4 w-4" /> Audio guidance
            </div>
            <audio
              ref={audioRef}
              src={practice.audioUrl}
              controls
              className="w-full"
              onCanPlay={() => setAudioLoaded(true)}
              onError={() => setAudioError(true)}
              onEnded={() => {
                setIsPlaying(false);
                onComplete(practice.id);
              }}
            />
          </div>
        )}

        {showFallback && (
          <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm font-semibold text-amber-900 dark:border-amber-500/30 dark:bg-amber-950/20 dark:text-amber-100">
            {AUDIO_FALLBACK_COPY}
          </div>
        )}

        {practice.type === 'breathing' && <BreathingPrompt key={practice.id} practice={practice} isPlaying={isPlaying} />}

        <div>
          <div className="mb-3 flex items-center justify-between text-xs font-semibold text-brand-stone-500 dark:text-slate-400">
            <span>Step {currentStep + 1} of {practice.steps.length}</span>
            <span>{secondsToTime(elapsed)} / {secondsToTime(practice.durationSeconds)}</span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-brand-stone-100 dark:bg-slate-800">
            <div className="h-full rounded-full bg-brand-gold-600 transition-all" style={{ width: `${Math.max(stepProgress, timeProgress)}%` }} />
          </div>
        </div>

        <div className="rounded-3xl bg-brand-sanctuary/70 p-6 text-center dark:bg-slate-900/50">
          <p className="text-lg leading-relaxed text-brand-stone-800 dark:text-slate-100">{activeStep?.text}</p>
        </div>

        <div className="flex flex-wrap items-center justify-center gap-3">
          <button onClick={resetPractice} className="inline-flex items-center gap-2 rounded-2xl border border-brand-stone-200 px-4 py-2 text-sm font-semibold text-brand-stone-700 hover:bg-brand-stone-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800">
            <RotateCcw className="h-4 w-4" /> Reset
          </button>
          <button onClick={togglePlay} className="inline-flex items-center gap-2 rounded-2xl bg-brand-gold-600 px-5 py-2 text-sm font-semibold text-white hover:bg-brand-gold-700">
            {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
            {isPlaying ? 'Pause' : 'Start guided steps'}
          </button>
          <button
            onClick={() => setCurrentStep((step) => Math.max(0, step - 1))}
            className="rounded-2xl border border-brand-stone-200 px-4 py-2 text-sm font-semibold text-brand-stone-700 hover:bg-brand-stone-50 disabled:opacity-40 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
            disabled={currentStep === 0}
          >
            Previous
          </button>
          <button
            onClick={() => {
              if (currentStep >= practice.steps.length - 1) {
                onComplete(practice.id);
                setIsPlaying(false);
              } else {
                setCurrentStep((step) => step + 1);
              }
            }}
            className="rounded-2xl border border-brand-stone-200 px-4 py-2 text-sm font-semibold text-brand-stone-700 hover:bg-brand-stone-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
          >
            {currentStep >= practice.steps.length - 1 ? 'Complete' : 'Next'}
          </button>
        </div>

        {(practice.type === 'interactive' || practice.reflectionPrompt) && (
          <div className="rounded-3xl border border-brand-stone-200 bg-white p-5 dark:border-slate-700 dark:bg-slate-900/50">
            <label htmlFor="practice-reflection" className="flex items-center gap-2 text-sm font-semibold text-brand-stone-800 dark:text-slate-100">
              <PenLine className="h-4 w-4" /> Reflection area
            </label>
            <p className="mt-2 text-sm text-brand-stone-600 dark:text-slate-400">{practice.reflectionPrompt || 'Use this space as virtual paper for anything you noticed during the practice.'}</p>
            <textarea
              id="practice-reflection"
              value={reflection}
              onChange={(event) => setReflection(event.target.value)}
              className="mt-3 min-h-32 w-full rounded-2xl border border-brand-stone-200 bg-brand-sanctuary/40 p-3 text-sm outline-none focus:border-brand-gold-400 dark:border-slate-700 dark:bg-slate-950/50"
              placeholder="Write your reflections here..."
            />
          </div>
        )}
      </section>
    </div>
  );
}

function PracticeLibrary({ completedIds }) {
  return (
    <main className="mx-auto max-w-6xl px-6 py-10 lg:py-14">
      <header className="rounded-[2rem] border border-brand-gold-100 bg-gradient-to-br from-white via-brand-sanctuary to-brand-gold-50/70 p-6 shadow-sm dark:border-brand-gold-900/40 dark:from-brand-cardDark dark:via-brand-midnight dark:to-brand-gold-950/20 md:p-8">
        <p className="text-xs font-bold uppercase tracking-[0.3em] text-brand-gold-700 dark:text-brand-gold-500">Guided Practice Library</p>
        <h1 className="mt-3 font-serif text-3xl font-semibold text-brand-stone-900 dark:text-slate-100 md:text-4xl">Guided Meditation & Practice Library</h1>
        <p className="mt-3 max-w-3xl text-brand-stone-600 dark:text-slate-300">
          Choose a quick practice, meditation, breathing exercise, or reflective IFS practice. Audio is optional; every card includes a safe in-app guided fallback.
        </p>
      </header>

      <section className="mt-8" aria-labelledby="quick-practices-heading">
        <div className="mb-4 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-brand-gold-50 text-brand-gold-700 dark:bg-brand-gold-950/30 dark:text-brand-gold-500">
            <Sparkles className="h-5 w-5" />
          </div>
          <div>
            <h2 id="quick-practices-heading" className="font-serif text-2xl font-semibold text-brand-stone-900 dark:text-slate-100">Quick Practices</h2>
            <p className="text-sm text-brand-stone-600 dark:text-slate-400">Short practices for centering, breath, and inner-child connection.</p>
          </div>
        </div>
        <div className="grid gap-4 md:grid-cols-3">
          {quickPractices.map((practice) => <PracticeCard key={practice.id} practice={practice} completed={completedIds.includes(practice.id)} />)}
        </div>
      </section>

      <div className="mt-10 space-y-10">
        {practiceCategories.map((category) => (
          <section key={category.name} aria-labelledby={`${category.name.replace(/[^a-z0-9]+/gi, '-').toLowerCase()}-heading`}>
            <div className="mb-4 flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-300">
                {category.name === 'Breathing Exercises' ? <Wind className="h-5 w-5" /> : <Volume2 className="h-5 w-5" />}
              </div>
              <div>
                <h2 id={`${category.name.replace(/[^a-z0-9]+/gi, '-').toLowerCase()}-heading`} className="font-serif text-2xl font-semibold text-brand-stone-900 dark:text-slate-100">{category.name}</h2>
                <p className="text-sm text-brand-stone-600 dark:text-slate-400">{category.practices.length} practice{category.practices.length === 1 ? '' : 's'} available.</p>
              </div>
            </div>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {category.practices.map((practice) => <PracticeCard key={practice.id} practice={practice} completed={completedIds.includes(practice.id)} />)}
            </div>
          </section>
        ))}
      </div>
    </main>
  );
}

export default function GuidedMeditation() {
  const { practiceId } = useParams();
  const navigate = useNavigate();
  const dataContext = useData();
  const awardXP = useMemo(() => dataContext?.awardXP || (() => {}), [dataContext?.awardXP]);
  const [completedIds, setCompletedIds] = useState([]);

  const selectedPractice = useMemo(() => (practiceId ? getGuidedPracticeById(practiceId) : null), [practiceId]);

  useEffect(() => {
    const loadCompleted = async () => {
      const client = clientAuth.getCurrentClient();
      if (!client?.id) return;
      try {
        const data = await supabaseHelpers.getInteractiveData(client.id, 'guided_practice_history');
        if (Array.isArray(data?.completed)) setCompletedIds(data.completed);
      } catch (error) {
        if (import.meta.env.DEV) console.warn('[GuidedMeditation] guided practice history load skipped', { message: error?.message || 'Request failed' });
      }
    };
    loadCompleted();
  }, []);

  const handleComplete = useCallback(async (id) => {
    setCompletedIds((current) => {
      const updated = [...new Set([...current, id])];
      const client = clientAuth.getCurrentClient();
      if (client?.id) {
        supabaseHelpers.saveInteractiveData(client.id, 'guided_practice_history', {
          completed: updated,
          lastCompleted: id,
          lastCompletedAt: new Date().toISOString(),
        }).catch((error) => {
          if (import.meta.env.DEV) console.warn('[GuidedMeditation] guided practice completion save skipped', { message: error?.message || 'Request failed' });
        });
      }
      awardXP('guided_practice_complete', 15);
      return updated;
    });
  }, [awardXP]);

  if (practiceId && !selectedPractice) {
    return (
      <main className="mx-auto max-w-3xl px-6 py-12">
        <div className="rounded-[2rem] border border-amber-200 bg-amber-50 p-6 text-amber-900 dark:border-amber-500/30 dark:bg-amber-950/20 dark:text-amber-100">
          <p className="text-sm font-bold uppercase tracking-[0.24em]">Practice not found</p>
          <h1 className="mt-2 text-2xl font-semibold">This guided practice is not in the library.</h1>
          <p className="mt-2 text-sm">The library currently contains {guidedPracticeLibrary.length} mapped practice records.</p>
          <button onClick={() => navigate('/meditation')} className="mt-4 rounded-2xl bg-brand-gold-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-gold-700">
            Return to full library
          </button>
        </div>
      </main>
    );
  }

  if (selectedPractice) {
    return <PracticePlayer key={selectedPractice.id} practice={selectedPractice} completed={completedIds.includes(selectedPractice.id)} onComplete={handleComplete} />;
  }

  return <PracticeLibrary completedIds={completedIds} />;
}
