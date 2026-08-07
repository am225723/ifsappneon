import { useState, useEffect, createElement } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Brain,
  ArrowRight,
  BookOpen,
  Sun,
  CalendarCheck,
  HeartPulse,
  MessageSquare,
  Sparkles,
  ShieldCheck
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { loadClientSessionAgendas } from '../lib/sessionAgendas';
import { loadActiveTreatmentPlansForClient } from '../lib/treatmentPlans';
import { getActiveLiveSessionForClient } from '../lib/liveSession';
import { loadAssignedHomeworkForClient } from '../lib/assignedHomework';
import { loadLifeIntegrationReflections } from '../lib/lifeIntegration';
import { normalizeLifeReflection } from '../lib/lifeIntegrationDisplay';
import { loadHealingTimeline } from '../lib/healingTimeline';
import {
  getPartsMapParts,
  isCurriculumInteractiveModule,
  isInteractiveAssessmentModule,
  normalizeInteractiveResult
} from '../lib/interactiveResults';
import { buildSharedCurriculumSummary } from '../lib/curriculumExperience';
import { loadCurriculumReflections } from '../lib/curriculumReflections';
import { loadNextBestStep } from '../lib/unifiedGuidance';
import InteractiveWorksheetRenderer from '../components/ai/InteractiveWorksheetRenderer';
import PhotoTile from '../components/PhotoTile';
import { FOCUS_CATEGORIES, HERO_IMAGE, CONTINUE_PATH_IMAGE } from '../lib/dashboardFocusTiles';

const iconTones = {
  emerald: 'bg-brand-emerald-50 text-brand-emerald-700 dark:bg-brand-emerald-950/40 dark:text-brand-emerald-100',
  gold: 'bg-brand-gold-50 text-brand-gold-700 dark:bg-brand-gold-950/40 dark:text-brand-gold-500',
  stone: 'bg-brand-stone-100 text-brand-stone-600 dark:bg-slate-800/60 dark:text-slate-200'
};

const SectionHeader = ({ eyebrow, title, subtitle }) => (
  <div className="mb-6">
    {eyebrow && <p className="mb-2 text-xs font-bold uppercase tracking-[0.24em] text-brand-gold-700 dark:text-brand-gold-500">{eyebrow}</p>}
    <h2 className="text-3xl font-serif font-normal text-brand-stone-900 dark:text-slate-100">{title}</h2>
    {subtitle && <p className="mt-2 max-w-3xl text-sm leading-relaxed text-brand-stone-600 dark:text-slate-400">{subtitle}</p>}
  </div>
);

const ClientHomeTile = ({ icon, title, description, buttonLabel, to, badge, tone = 'emerald', progress }) => (
  <Link to={to} className="soft-card-interactive group flex h-full flex-col justify-between gap-5 p-6">
    <div>
      <div className="mb-4 flex items-start justify-between gap-3">
        <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl ${iconTones[tone] || iconTones.emerald}`}>
          {createElement(icon, { className: 'h-6 w-6' })}
        </div>
        {badge && <span className="rounded-full bg-white px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-brand-gold-700 shadow-sm dark:bg-slate-900/70">{badge}</span>}
      </div>
      <h3 className="font-sans text-lg font-semibold text-brand-stone-900 dark:text-slate-100">{title}</h3>
      <p className="mt-2 text-sm leading-relaxed text-brand-stone-600 dark:text-slate-400">{description}</p>
      {typeof progress === 'number' && (
        <div className="mt-4">
          <div className="mb-1 flex items-center justify-between text-[11px] font-semibold uppercase tracking-wide text-brand-stone-500 dark:text-slate-500">
            <span>Progress</span>
            <span>{progress}%</span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-brand-stone-100 dark:bg-slate-800">
            <div className="h-full rounded-full bg-brand-emerald-600 transition-all" style={{ width: `${progress}%` }} />
          </div>
        </div>
      )}
    </div>
    <span className="inline-flex items-center gap-2 text-sm font-bold text-brand-gold-700 transition-transform group-hover:translate-x-1 dark:text-brand-gold-500">
      {buttonLabel}
      <ArrowRight className="h-4 w-4" />
    </span>
  </Link>
);

function getSafeCount(result) {
  if (typeof result?.count === 'number') return result.count;
  if (Array.isArray(result?.data)) return result.data.length;
  return 0;
}

function getEffectiveClientId({ mode, currentClientId, selfProfile }) {
  if (mode === 'my-ifs' && selfProfile?.id) return selfProfile.id;
  return currentClientId || null;
}

function settledDataResult(settled, table) {
  if (settled.status === 'fulfilled') {
    const value = settled.value || {};
    return value?.error ? { ...value, table } : { ...value, table, error: null };
  }
  return { data: null, count: 0, table, error: settled.reason || new Error('Request failed') };
}

function summarizeQueryErrors(resultsByTable, effectiveClientId, selfProfile) {
  return Object.entries(resultsByTable)
    .filter(([, result]) => result?.error)
    .map(([table, result]) => ({
      table,
      status: result.error.status || result.error.statusCode || null,
      message: result.error.message || 'Request failed',
      effectiveClientId,
      selfProfilePresent: Boolean(selfProfile?.id)
    }));
}

const CRITICAL_HOME_LOAD_MESSAGE = 'Your home workspace could not be connected right now. Please refresh or try again.';

const FOCUS_PILL_ICONS = { daily: Sun, deep: Brain, tools: Sparkles };
const FOCUS_DESCRIPTIONS = {
  daily: 'A few minutes, most days — quick check-ins and in-the-moment resets.',
  deep: 'Set aside real time — reflection and parts work that deserves it.',
  tools: 'Reach for these when you need them — no urgency attached.'
};

const PALETTES = {
  luminous: { label: 'Luminous Green', background: '#f7f8f1', surface: '#ffffffcc', primary: '#2f6f5f', accent: '#c3912f', softAccent: '#e8f1df', border: '#d8e5cb' },
  gold: { label: 'Warm Gold', background: '#fbf6e9', surface: '#fffaf0cc', primary: '#8b6524', accent: '#c18a2e', softAccent: '#f4e4bd', border: '#ead39b' },
  sage: { label: 'Soft Sage', background: '#f3f7f0', surface: '#ffffffcc', primary: '#57745d', accent: '#9b8f54', softAccent: '#dfe9dc', border: '#cddcc8' },
  rosewood: { label: 'Rosewood', background: '#fbf4f2', surface: '#fffaf9cc', primary: '#8a4f52', accent: '#b97a61', softAccent: '#f0d8d5', border: '#e4bfba' },
  ocean: { label: 'Ocean Blue', background: '#f0f7fa', surface: '#f8fcffcc', primary: '#356f8a', accent: '#5c9bae', softAccent: '#d7edf3', border: '#b9dbe5' },
  lavender: { label: 'Lavender Calm', background: '#f7f3fb', surface: '#fffaffcc', primary: '#6c5a8f', accent: '#9b83bf', softAccent: '#e5dbf1', border: '#d4c5e8' }
};

function useClientPalette() {
  const [paletteKey, setPaletteKey] = useState(() => localStorage.getItem('ifsClientColorPalette') || 'luminous');
  const palette = PALETTES[paletteKey] || PALETTES.luminous;
  useEffect(() => {
    localStorage.setItem('ifsClientColorPalette', paletteKey);
    const root = document.documentElement;
    root.style.setProperty('--ifs-bg', palette.background);
    root.style.setProperty('--ifs-surface', palette.surface);
    root.style.setProperty('--ifs-primary', palette.primary);
    root.style.setProperty('--ifs-accent', palette.accent);
    root.style.setProperty('--ifs-soft-accent', palette.softAccent);
    root.style.setProperty('--ifs-border', palette.border);
  }, [paletteKey, palette]);
  return { paletteKey, setPaletteKey, palette };
}

const PaletteSelector = ({ paletteKey, setPaletteKey }) => {
  const [open, setOpen] = useState(false);
  return (
    <div className="relative">
      <button type="button" onClick={() => setOpen((value) => !value)} className="rounded-full border px-4 py-2 text-xs font-bold uppercase tracking-[0.2em] shadow-sm transition hover:-translate-y-0.5" style={{ borderColor: 'var(--ifs-border)', color: 'var(--ifs-primary)', background: 'var(--ifs-surface)' }}>
        Appearance / Color Palette
      </button>
      {open && (
        <div className="absolute right-0 z-20 mt-3 w-80 rounded-3xl border bg-white/95 p-4 shadow-2xl backdrop-blur dark:bg-slate-900/95" style={{ borderColor: 'var(--ifs-border)' }}>
          <p className="mb-3 text-xs font-bold uppercase tracking-[0.24em]" style={{ color: 'var(--ifs-primary)' }}>Color Palette</p>
          <div className="grid gap-2">
            {Object.entries(PALETTES).map(([key, palette]) => (
              <button key={key} type="button" onClick={() => setPaletteKey(key)} className={`flex items-center justify-between rounded-2xl border p-3 text-left text-sm transition ${paletteKey === key ? 'shadow-md' : 'hover:bg-brand-stone-50 dark:hover:bg-slate-800'}`} style={{ borderColor: paletteKey === key ? palette.accent : palette.border }}>
                <span className="font-semibold text-brand-stone-800 dark:text-slate-100">{palette.label}</span>
                <span className="flex gap-1">
                  {[palette.background, palette.primary, palette.accent, palette.softAccent].map((color) => <span key={color} className="h-5 w-5 rounded-full border border-white shadow-sm" style={{ background: color }} />)}
                </span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

const Pulse = ({ className = '' }) => <div className={`animate-pulse rounded-xl bg-brand-stone-100 dark:bg-slate-800 ${className}`} />;

const HomeSkeleton = ({ palette }) => (
  <div className="mx-auto max-w-6xl px-4 sm:px-6 py-12 lg:py-20">
    <section className="mb-12 overflow-hidden rounded-[2.25rem] border p-7 shadow-premium md:p-10" style={{ background: `linear-gradient(135deg, ${palette.surface}, ${palette.background})`, borderColor: palette.border }}>
      <div className="flex flex-col gap-8 lg:flex-row lg:items-center lg:justify-between">
        <div className="max-w-3xl flex-1">
          <Pulse className="h-3 w-40" />
          <Pulse className="mt-4 h-10 w-72 sm:h-12 sm:w-96" />
          <Pulse className="mt-4 h-4 w-full max-w-xl" />
          <Pulse className="mt-2 h-4 w-3/4 max-w-md" />
          <div className="mt-6 flex flex-wrap gap-3">
            <Pulse className="h-11 w-44 rounded-full" />
            <Pulse className="h-11 w-48 rounded-full" />
          </div>
          <div className="mt-5 flex flex-wrap gap-2">
            <Pulse className="h-6 w-40 rounded-full" />
            <Pulse className="h-6 w-56 rounded-full" />
          </div>
        </div>
        <div className="flex flex-col items-start gap-4 lg:items-end">
          <Pulse className="h-9 w-56 rounded-full" />
          <div className="hidden h-44 w-44 rounded-full lg:block">
            <Pulse className="h-full w-full rounded-full" />
          </div>
        </div>
      </div>
    </section>

    <section className="mb-10 grid gap-6 lg:grid-cols-[1.35fr_0.85fr]">
      <div className="rounded-[2rem] border bg-white/85 p-6 shadow-premium dark:bg-slate-900/60" style={{ borderColor: palette.border }}>
        <Pulse className="h-3 w-48" />
        <Pulse className="mt-3 h-8 w-3/4" />
        <Pulse className="mt-3 h-4 w-full" />
        <Pulse className="mt-2 h-4 w-2/3" />
        <Pulse className="mt-6 h-3 w-full rounded-full" />
        <div className="mt-6 flex flex-wrap gap-3">
          <Pulse className="h-10 w-36 rounded-full" />
          <Pulse className="h-10 w-32 rounded-full" />
        </div>
      </div>
      <div className="rounded-[2rem] border bg-white/75 p-6 dark:bg-slate-900/50" style={{ borderColor: palette.border }}>
        <Pulse className="h-3 w-32" />
        <Pulse className="mt-3 h-6 w-40" />
        <Pulse className="mt-4 h-4 w-full" />
        <Pulse className="mt-2 h-4 w-5/6" />
      </div>
    </section>

    <section className="mb-10 grid gap-6 lg:grid-cols-3">
      {[0, 1, 2].map((index) => (
        <div key={index} className="rounded-[2rem] border bg-white/75 p-6 dark:bg-slate-900/50" style={{ borderColor: palette.border }}>
          <Pulse className="h-3 w-32" />
          <Pulse className="mt-3 h-6 w-3/4" />
          <Pulse className="mt-3 h-4 w-full" />
          <Pulse className="mt-2 h-4 w-2/3" />
        </div>
      ))}
    </section>

    <section className="mb-14 rounded-[2rem] border bg-white/65 p-6 dark:bg-slate-900/45" style={{ borderColor: palette.border }}>
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="flex-1">
          <Pulse className="h-3 w-36" />
          <Pulse className="mt-3 h-6 w-2/3" />
        </div>
        <Pulse className="h-10 w-44 rounded-full" />
      </div>
      <div className="mt-5 flex flex-wrap gap-2">
        {[0, 1, 2, 3].map((index) => <Pulse key={index} className="h-9 w-32 rounded-full" />)}
      </div>
    </section>
  </div>
);

const Home = ({ clientId, client, mode = 'home', selfProfile = null, selfProfileResult = null }) => {
  const navigate = useNavigate();
  const [savedAssessment, setSavedAssessment] = useState(null);
  const [loading, setLoading] = useState(true);
  const [agendaSummary, setAgendaSummary] = useState({ lastSubmitted: null, hasDraft: false });
  const [growthGoals, setGrowthGoals] = useState([]);
  const [activeLiveSession, setActiveLiveSession] = useState(null);
  const [activeAssignedPractice, setActiveAssignedPractice] = useState(null);
  const [recentLifeReflection, setRecentLifeReflection] = useState(null);
  const [lifeReflectionCount, setLifeReflectionCount] = useState(0);
  const [latestMilestone, setLatestMilestone] = useState(null);
  const [curriculumSummary, setCurriculumSummary] = useState(null);
  const [curriculumReflections, setCurriculumReflections] = useState([]);
  const [assignedPracticeCount, setAssignedPracticeCount] = useState(0);
  const [criticalLoadError, setCriticalLoadError] = useState(null);
  const [nextStepState, setNextStepState] = useState({ loading: false, data: null, error: '' });
  const [activeFocusCategory, setActiveFocusCategory] = useState('daily');
  const { paletteKey, setPaletteKey, palette } = useClientPalette();
  const selfProfileForLoad = selfProfile || selfProfileResult?.profile || null;
  const effectiveClientId = getEffectiveClientId({ mode, currentClientId: clientId, selfProfile: selfProfileForLoad });
  const effectiveClient = mode === 'my-ifs' ? (selfProfileForLoad || client) : client;
  const isMyIFSMode = mode === 'my-ifs';
  const hasResolvedSelfProfile = isMyIFSMode && Boolean(selfProfile?.id || selfProfileResult?.profile?.id);
  const isAdvisorModeUser = ['ther' + 'apist', 'advisor', 'admin', 'supervisor'].includes(effectiveClient?.user_role);
  const shouldShowWorkspaceChoice = !isMyIFSMode && isAdvisorModeUser;
  const [assessmentSummary, setAssessmentSummary] = useState({
    latestFormalWound: null,
    interactiveAssessments: [],
    curriculumModuleRows: [],
    partsMapRow: null,
    partsCount: 0,
    relationshipsCount: 0,
    journalCount: 0,
    formalWoundCount: 0,
    progressCount: 0,
    interactiveDataCount: 0
  });

  useEffect(() => {
    const loadData = async () => {
      setCriticalLoadError(null);
      if (shouldShowWorkspaceChoice) {
        setLoading(false);
        return;
      }
      if (effectiveClientId) {
        try {
          const optionalQueries = [
            ['ifs_interactive_data', supabase
              .from('ifs_interactive_data')
              .select('id, client_id, module_id, data, created_at, updated_at')
              .eq('client_id', effectiveClientId)],
            ['ifs_assessment_results', supabase
              .from('ifs_assessment_results')
              .select('id, primary_wound, secondary_wound, tertiary_wounds, assessment_date, created_at')
              .eq('client_id', effectiveClientId)
              .order('created_at', { ascending: false })],
            ['ifs_parts', supabase
              .from('ifs_parts')
              .select('id', { count: 'exact' })
              .eq('client_id', effectiveClientId)],
            ['ifs_part_relationships', supabase
              .from('ifs_part_relationships')
              .select('id', { count: 'exact' })
              .eq('client_id', effectiveClientId)],
            ['ifs_session_agendas', loadClientSessionAgendas(effectiveClientId)],
            ['ifs_treatment_plans', loadActiveTreatmentPlansForClient(effectiveClientId)],
            ['ifs_assigned_' + 'home' + 'work', loadAssignedHomeworkForClient(effectiveClientId)],
            ['ifs_life_integration_reflections', loadLifeIntegrationReflections({ clientId: effectiveClientId, self: mode === 'my-ifs' })],
            ['healing_timeline', loadHealingTimeline({ clientId: effectiveClientId, range: 'ALL' })],
            ['ifs_journal_entries', supabase
              .from('ifs_journal_entries')
              .select('id', { count: 'exact' })
              .eq('client_id', effectiveClientId)],
            ['ifs_client_progress', supabase
              .from('ifs_client_progress')
              .select('module_id, completed, current_step, completed_at, updated_at')
              .eq('client_id', effectiveClientId)],
            ['ifs_module_answers', supabase
              .from('ifs_module_answers')
              .select('id, client_id, module_id, step_id, answers, created_at, updated_at')
              .eq('client_id', effectiveClientId)],
            ['curriculum_reflections', loadCurriculumReflections({ clientId: effectiveClientId, limit: 20 })]
          ];

          const settledResults = await Promise.allSettled(optionalQueries.map(([, query]) => query));
          const [
            interactiveResult,
            formalAssessmentResult,
            partsCountResult,
            relationshipsCountResult,
            agendasResult,
            goalsResult,
            assignedResult,
            reflectionsResult,
            timelineResult,
            journalResult,
            progressResult,
            moduleAnswersResult,
            curriculumReflectionsResult
          ] = settledResults.map((settled, index) => settledDataResult(settled, optionalQueries[index][0]));


          const optionalQueryFailures = summarizeQueryErrors({
            ifs_interactive_data: interactiveResult,
            ifs_assessment_results: formalAssessmentResult,
            ifs_parts: partsCountResult,
            ifs_part_relationships: relationshipsCountResult,
            ifs_session_agendas: agendasResult,
            ifs_treatment_plans: goalsResult,
            ['ifs_assigned_' + 'home' + 'work']: assignedResult,
            ifs_life_integration_reflections: reflectionsResult,
            healing_timeline: timelineResult,
            ifs_journal_entries: journalResult,
            ifs_client_progress: progressResult,
            ifs_module_answers: moduleAnswersResult,
            curriculum_reflections: curriculumReflectionsResult
          }, effectiveClientId, selfProfileForLoad);

                  if (optionalQueryFailures.length) {
            if (!hasResolvedSelfProfile && !effectiveClientId) {
              setCriticalLoadError({
                message: CRITICAL_HOME_LOAD_MESSAGE,
                details: optionalQueryFailures,
                scope: 'global'
              });
            }
            if (import.meta.env.DEV) {
              console.warn('[MyIFSWork/Home] data query failures', optionalQueryFailures.map((item) => ({
                table: item.table,
                status: item.status,
                effectiveClientId: item.effectiveClientId,
                selfProfilePresent: item.selfProfilePresent
              })));
            }
          }

          const interactiveRows = interactiveResult?.data || [];
          const normalizedInteractive = interactiveRows.map(normalizeInteractiveResult);
          const interactiveAssessments = normalizedInteractive.filter((row) => isInteractiveAssessmentModule(row.moduleId));
          const curriculumModuleRows = normalizedInteractive.filter((row) => isCurriculumInteractiveModule(row.moduleId));
          const partsMapRow = interactiveRows.find((row) => row.module_id === 'parts_map') || null;
          const assessmentWounds = interactiveAssessments.find((row) => row.moduleId === 'assessment_wounds');
          const latestFormalWound = (formalAssessmentResult?.data || [])[0] || null;

          setSavedAssessment(assessmentWounds?.data || latestFormalWound || null);
          setAssessmentSummary({
            latestFormalWound,
            interactiveAssessments,
            curriculumModuleRows,
            partsMapRow,
            partsCount: getSafeCount(partsCountResult),
            relationshipsCount: getSafeCount(relationshipsCountResult),
            journalCount: getSafeCount(journalResult),
            formalWoundCount: getSafeCount(formalAssessmentResult),
            progressCount: getSafeCount(progressResult),
            interactiveDataCount: getSafeCount(interactiveResult)
          });

          const agendas = agendasResult?.data || [];
          setGrowthGoals((goalsResult?.data || []).filter((goal) => ['active', 'completed'].includes(goal.status)).slice(0, 3));
          setAgendaSummary({
            lastSubmitted: agendas.find((agenda) => agenda.status === 'submitted' || agenda.status === 'reviewed')?.created_at || null,
            hasDraft: agendas.some((agenda) => agenda.status === 'draft')
          });
          const assignedPractices = assignedResult?.data || [];
          setAssignedPracticeCount(assignedPractices.filter((item) => ['assigned', 'in_progress'].includes(item.status)).length);
          setActiveAssignedPractice(assignedPractices.find((item) => ['assigned', 'in_progress'].includes(item.status)) || null);
          const lifeReflections = reflectionsResult?.data || [];
          setLifeReflectionCount(lifeReflections.length);
          setRecentLifeReflection(lifeReflections[0] ? normalizeLifeReflection(lifeReflections[0]) : null);
          setLatestMilestone((timelineResult?.data?.timeline || [])[0] || null);

          setCurriculumReflections(curriculumReflectionsResult?.data || []);

          const progressRows = progressResult?.data || [];
          const moduleAnswerRows = moduleAnswersResult?.data || [];

          setCurriculumSummary(buildSharedCurriculumSummary({
            progressRows,
            interactiveRows,
            moduleAnswerRows,
            assignedPractices
          }));

          try {
            const liveResult = await getActiveLiveSessionForClient();
            if (!liveResult.error) setActiveLiveSession(liveResult.data || null);
            else if (import.meta.env.DEV) console.warn('[MyIFSWork/Home] live session refresh failed', { message: liveResult.error?.message || 'Request failed' });
          } catch (liveError) {
            if (import.meta.env.DEV) console.warn('[MyIFSWork/Home] live session refresh failed', { message: liveError?.message || 'Request failed' });
          }
        } catch (err) {
          if (import.meta.env.DEV) {
            console.warn('[Home] data load failure', {
              message: err?.message || 'Request failed',
              status: err?.status || err?.statusCode || null,
              effectiveClientId,
              selfProfilePresent: hasResolvedSelfProfile
            });
          }
          setCriticalLoadError({
            message: effectiveClientId ? null : CRITICAL_HOME_LOAD_MESSAGE,
            details: [{
              table: 'home_data',
              status: err?.status || err?.statusCode || null,
              message: err?.message || 'Request failed',
              effectiveClientId,
              selfProfilePresent: Boolean((selfProfile || selfProfileResult?.profile)?.id)
            }],
            scope: effectiveClientId ? 'section' : 'global'
          });
        }
      }
      setLoading(false);
    };

    loadData();
  }, [effectiveClientId, mode, shouldShowWorkspaceChoice, hasResolvedSelfProfile]);

  const clientFirstName = (effectiveClient?.name || effectiveClient?.full_name || '').split(' ').filter(Boolean)[0];
  const curriculumProgress = curriculumSummary?.percent ?? 0;
  const currentModule = curriculumSummary?.currentModule;
  const hasSelfData = selfProfileResult?.hasPersonalData !== false;
  const partsMapPartsCount = getPartsMapParts(assessmentSummary.partsMapRow).length;

  useEffect(() => {
    if (import.meta.env.DEV && mode === 'my-ifs') {
      console.info('[MyIFSWork/Home] self progress signals', {
        mode,
        resolvedSelfProfileId: selfProfileResult?.profile?.id || selfProfile?.id || null,
        effectiveClientId,
        formalWoundCount: assessmentSummary.formalWoundCount,
        interactiveDataCount: assessmentSummary.interactiveDataCount,
        interactiveAssessmentCount: assessmentSummary.interactiveAssessments.length,
        interactiveModuleCount: assessmentSummary.curriculumModuleRows.length,
        curriculumProgressCount: assessmentSummary.progressCount,
        legacyPartsMapFound: Boolean(assessmentSummary.partsMapRow),
        legacyPartsCount: partsMapPartsCount,
        persistentPartsCount: assessmentSummary.partsCount
      });
    }
  }, [mode, selfProfileResult?.profile?.id, selfProfile?.id, effectiveClientId, assessmentSummary, partsMapPartsCount]);

  const advisorTiles = [
    {
      id: 'assigned-practice',
      to: '/assigned-practices',
      icon: BookOpen,
      title: 'Assigned by My Advisor',
      detail: activeAssignedPractice
        ? `${activeAssignedPractice.title || 'A practice'} is ready${assignedPracticeCount > 1 ? ` — ${assignedPracticeCount} active` : ''}.`
        : 'View practices your Advisor shares to support your work.',
      image: '/images/dashboard/advisor-assigned-practice.jpg',
      full: true
    },
    {
      id: 'pre-session-checkin',
      to: '/pre-session-checkin',
      icon: CalendarCheck,
      title: 'Pre-Session Check-In',
      detail: agendaSummary.hasDraft
        ? 'Continue your draft check-in before your next session.'
        : agendaSummary.lastSubmitted
          ? `Last submitted ${new Date(agendaSummary.lastSubmitted).toLocaleDateString()}.`
          : 'Name what feels important before you meet.',
      image: '/images/dashboard/advisor-pre-session.jpg'
    },
    {
      id: 'advisor-messages',
      to: '/inbox',
      icon: MessageSquare,
      title: 'Advisor Messages',
      detail: 'Supportive notes and updates from your Advisor.',
      image: '/images/dashboard/advisor-messages.jpg'
    }
  ];

  const handleLoadNextStep = async (force = false) => {
    if (!effectiveClientId || nextStepState.loading) return;
    setNextStepState((current) => ({ ...current, loading: true, error: '' }));
    try {
      const data = await loadNextBestStep({ clientId: effectiveClientId, force });
      setNextStepState({ loading: false, data, error: '' });
    } catch (error) {
      setNextStepState({ loading: false, data: null, error: error.message || 'Your next guided step could not be generated right now. You can continue with your curriculum.' });
    }
  };

  if (loading) {
    return <HomeSkeleton palette={palette} />;
  }

  if (shouldShowWorkspaceChoice) {
    return (
      <div className="mx-auto max-w-5xl px-4 sm:px-6 py-12 lg:py-20">
        <section className="rounded-[2rem] border border-brand-gold-100 bg-gradient-to-br from-white via-brand-sanctuary to-brand-gold-50/60 p-6 shadow-premium dark:border-brand-gold-900/40 dark:from-brand-cardDark dark:via-brand-midnight dark:to-brand-gold-950/20 md:p-8">
          <p className="text-xs font-bold uppercase tracking-[0.28em] text-brand-gold-700 dark:text-brand-gold-500">Home</p>
          <h1 className="mt-3 text-4xl font-serif font-normal text-brand-stone-900 dark:text-slate-100">Choose your IFS workspace</h1>
          <p className="mt-3 max-w-3xl text-sm leading-relaxed text-brand-stone-600 dark:text-slate-400">
            Your personal self-work and your Advisor/Admin workflows stay separate so client data is not mixed into your own IFS path.
          </p>
          <div className="mt-6 grid gap-4 md:grid-cols-2">
            <Link to="/my-ifs" className="soft-card-interactive p-5">
              <Sparkles className="mb-4 h-7 w-7 text-brand-gold-700 dark:text-brand-gold-500" />
              <h2 className="font-semibold text-brand-stone-900 dark:text-slate-100">My IFS Work</h2>
              <p className="mt-2 text-sm text-brand-stone-600 dark:text-slate-400">Open your own Curriculum, Assessments, Inner System Map, reflections, and tools.</p>
            </Link>
            <Link to={effectiveClient?.user_role === 'admin' || effectiveClient?.user_role === 'supervisor' ? '/admin-hub' : '/advisor-workspace'} className="soft-card-interactive p-5">
              <ShieldCheck className="mb-4 h-7 w-7 text-brand-emerald-700 dark:text-brand-emerald-100" />
              <h2 className="font-semibold text-brand-stone-900 dark:text-slate-100">Advisor/Admin workspace</h2>
              <p className="mt-2 text-sm text-brand-stone-600 dark:text-slate-400">Continue assigned-client workflows, curriculum support, review queues, reports, and settings.</p>
            </Link>
          </div>
        </section>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl px-4 sm:px-6 py-12 lg:py-20">
      {activeLiveSession && (
        <section className="mb-8">
          <div className="soft-card border border-brand-emerald-100 bg-brand-emerald-50/80 p-5 dark:border-brand-emerald-900/40 dark:bg-brand-emerald-950/20">
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div className="flex items-start gap-4">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-brand-emerald-100 text-brand-emerald-700 dark:bg-brand-emerald-950/50 dark:text-brand-emerald-100">
                  <HeartPulse className="h-5 w-5" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-brand-stone-900 dark:text-slate-100">Live Advisor-Guided Practice is active</h2>
                  <p className="mt-1 text-sm text-brand-stone-600 dark:text-slate-400">Your Advisor has started a live guided practice.</p>
                </div>
              </div>
              <Link to="/live-session" className="btn-sanctuary-primary justify-center">Join Practice <ArrowRight className="h-4 w-4" /></Link>
            </div>
          </div>
        </section>
      )}

      <section className="relative mb-12 overflow-hidden rounded-[2.25rem] p-7 shadow-premium md:p-10">
        <img src={HERO_IMAGE} alt="" className="absolute inset-0 h-full w-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/45 to-black/10" />
        <div className="relative z-10 flex flex-col gap-8 lg:flex-row lg:items-center lg:justify-between">
          <div className="max-w-3xl">
            <p className="mb-4 text-xs font-bold uppercase tracking-[0.32em] text-white/80">The Luminous Self</p>
            <h1 className="mb-4 font-serif text-4xl font-normal leading-tight text-white drop-shadow lg:text-6xl">
              {clientFirstName ? `Hello, ${clientFirstName}` : 'Welcome back to your IFS path'}
            </h1>
            <p className="max-w-2xl text-lg leading-relaxed text-white/90 drop-shadow">
              Your main path is the Curriculum. Advisor-guided practices, reflections, and tools sit nearby as calm support—not a crowded dashboard.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <button onClick={() => navigate(currentModule?.id ? `/curriculum/module/${currentModule.id}` : '/curriculum')} className="btn-sanctuary-primary justify-center">
                <BookOpen className="h-5 w-5" />
                {currentModule?.id ? 'Continue IFS Path' : 'Begin IFS Path'}
              </button>
              <button onClick={() => navigate('/tools')} className="inline-flex items-center justify-center gap-2 rounded-full border border-white/40 bg-white/10 px-5 py-3 text-sm font-bold text-white backdrop-blur transition hover:-translate-y-0.5 hover:bg-white/20">
                <Sparkles className="h-5 w-5" />
                Open Tools & Practices
              </button>
            </div>
            <div className="mt-5 flex flex-wrap gap-2 text-xs">
              <span className="rounded-full bg-white/15 px-3 py-1 font-semibold text-white backdrop-blur">{curriculumSummary
  ? `${curriculumSummary.completedCount}/${curriculumSummary.totalModules} modules · ${curriculumSummary.modulesWithAnswers || 0} modules answered · ${curriculumSummary.answerFieldCount || 0} saved responses`
  : 'Ready to begin'}</span>
              {activeAssignedPractice && <span className="rounded-full bg-white/15 px-3 py-1 font-semibold text-white backdrop-blur">Advisor-guided practice ready</span>}
            </div>
          </div>
          <div
            className="flex items-start"
            style={{ '--ifs-border': 'rgba(255,255,255,0.45)', '--ifs-primary': '#ffffff', '--ifs-surface': 'rgba(255,255,255,0.14)' }}
          >
            <PaletteSelector paletteKey={paletteKey} setPaletteKey={setPaletteKey} />
          </div>
        </div>
      </section>

      {criticalLoadError?.message && criticalLoadError.scope === 'global' && (
        <section className="mb-8 rounded-3xl border border-red-200 bg-red-50 p-5 text-sm text-red-700 dark:border-red-900/60 dark:bg-red-950/20 dark:text-red-200">
          <p className="font-semibold">{criticalLoadError.message}</p>
        </section>
      )}

      {isMyIFSMode && (
        <section className="mb-8 rounded-3xl border bg-white/70 p-5 text-sm text-brand-stone-700 dark:bg-slate-900/50 dark:text-slate-300" style={{ borderColor: palette.border }}>
          <p className="text-xs font-bold uppercase tracking-[0.24em]" style={{ color: palette.primary }}>My IFS Work</p>
          <p className="mt-1 font-semibold text-brand-stone-900 dark:text-slate-100">Your personal IFS path is connected.</p>
          <p className="mt-1">Continue the curriculum, revisit assessments, and return to the practices that support your parts work.</p>
          {!hasSelfData && <p className="mt-2 font-semibold">Start with the curriculum or an assessment to begin your IFS path.</p>}
        </section>
      )}

      <section className="relative mb-12 overflow-hidden rounded-[2rem] p-6 shadow-premium md:p-7">
        <img src={CONTINUE_PATH_IMAGE} alt="" className="absolute inset-0 h-full w-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/50 to-black/15" />
        <div className="relative z-10">
          <div className="flex flex-col gap-5 md:flex-row md:items-start md:justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.24em] text-white/80">Continue Your IFS Path</p>
              <h2 className="mt-2 font-serif text-3xl font-normal text-white drop-shadow">{currentModule?.title || 'Begin with the main curriculum'}</h2>
              <p className="mt-3 max-w-2xl text-sm leading-relaxed text-white/85 drop-shadow">The Curriculum is your main guided path. Assigned IFS Practices remain separate Advisor-guided activities.</p>
            </div>
            <div className="shrink-0 rounded-3xl bg-white/15 px-5 py-4 text-center backdrop-blur">
              <p className="text-3xl font-bold text-white">{curriculumProgress}%</p>
              <p className="text-xs uppercase tracking-wide text-white/70">complete</p>
            </div>
          </div>
          <div className="mt-6 h-3 overflow-hidden rounded-full bg-white/20">
            <div className="h-full rounded-full bg-white transition-all" style={{ width: `${curriculumProgress}%` }} />
          </div>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link to={currentModule?.id ? `/curriculum/module/${currentModule.id}` : '/curriculum'} className="inline-flex items-center gap-2 rounded-full bg-white px-5 py-3 text-sm font-bold text-brand-stone-900 transition hover:-translate-y-0.5">{currentModule?.id ? 'Continue Module' : 'Start Curriculum'} <ArrowRight className="h-4 w-4" /></Link>
            <Link to="/curriculum" className="inline-flex items-center gap-2 rounded-full border border-white/40 bg-white/10 px-5 py-3 text-sm font-bold text-white backdrop-blur transition hover:bg-white/20">View Curriculum</Link>
          </div>

          <div className="mt-6 border-t border-white/20 pt-5">
            <div className="flex items-center justify-between gap-3">
              <p className="text-xs font-bold uppercase tracking-[0.24em] text-white/80">Your Next Guided Step</p>
              <button type="button" onClick={() => handleLoadNextStep(Boolean(nextStepState.data))} disabled={nextStepState.loading || !effectiveClientId} className="rounded-full border border-white/40 bg-white/10 px-3 py-2 text-xs font-semibold text-white backdrop-blur disabled:opacity-60">
                {nextStepState.loading ? 'Finding…' : nextStepState.data ? 'Refresh' : 'Find'}
              </button>
            </div>
            {nextStepState.error && <p className="mt-3 rounded-2xl bg-white/15 px-4 py-3 text-sm text-white backdrop-blur">Your next guided step could not be generated right now. You can continue with your curriculum.</p>}
            {nextStepState.data?.next_best_step ? (
              <div className="mt-3">
                <h3 className="font-semibold text-white">{nextStepState.data.next_best_step.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-white/85">{nextStepState.data.next_best_step.description}</p>
                <p className="mt-2 text-xs font-semibold uppercase tracking-wide text-white/70">{nextStepState.data.next_best_step.estimated_time}</p>
                <Link to={nextStepState.data.next_best_step.action_route || '/curriculum'} className="mt-3 inline-flex items-center gap-2 text-sm font-bold text-white">Open Step <ArrowRight className="h-4 w-4" /></Link>
                {(nextStepState.data.next_best_step.interactive_payload?.content || nextStepState.data.next_best_step.interactive_payload?.blocks?.length) && (
                  <div className="mt-4 rounded-2xl bg-white/90 p-3 text-brand-stone-900">
                    {nextStepState.data.next_best_step.interactive_payload?.content && <p className="text-sm text-brand-stone-700">{nextStepState.data.next_best_step.interactive_payload.content}</p>}
                    {Boolean(nextStepState.data.next_best_step.interactive_payload?.blocks?.length) && <InteractiveWorksheetRenderer blocks={nextStepState.data.next_best_step.interactive_payload.blocks} readOnly />}
                  </div>
                )}
              </div>
            ) : !nextStepState.loading && <p className="mt-3 text-sm text-white/75">Continue the curriculum or ask for a personalized next step when you are ready.</p>}
          </div>
        </div>
      </section>

      <section className="mb-14">
        <div className="mb-3 flex flex-wrap justify-center gap-2.5">
          {FOCUS_CATEGORIES.map((category) => {
            const Icon = FOCUS_PILL_ICONS[category.key] || Sun;
            const active = activeFocusCategory === category.key;
            return (
              <button
                key={category.key}
                type="button"
                aria-pressed={active}
                onClick={() => setActiveFocusCategory(category.key)}
                className={`inline-flex items-center gap-2 rounded-full border px-5 py-2.5 text-sm font-semibold transition ${
                  active
                    ? 'border-brand-stone-900 bg-brand-stone-900 text-white dark:border-white dark:bg-white dark:text-brand-stone-900'
                    : 'bg-white/70 text-brand-stone-700 hover:-translate-y-0.5 dark:bg-slate-900/50 dark:text-slate-300'
                }`}
                style={active ? undefined : { borderColor: palette.border }}
              >
                <Icon className="h-4 w-4" />
                {category.label}
                <span className="text-[10px] font-bold opacity-70">{category.tiles.length}</span>
              </button>
            );
          })}
        </div>
        <p className="mb-5 text-center text-sm text-brand-stone-500 dark:text-slate-500">{FOCUS_DESCRIPTIONS[activeFocusCategory]}</p>
        <div className="grid grid-cols-2 gap-3.5 sm:gap-4">
          {(FOCUS_CATEGORIES.find((category) => category.key === activeFocusCategory)?.tiles || []).map((tile) => (
            <PhotoTile key={tile.id} to={tile.to} image={tile.image} icon={tile.icon} title={tile.title} detail={tile.detail} tone={activeFocusCategory} />
          ))}
        </div>
      </section>

      <section className="mb-6">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <p className="text-xs font-bold uppercase tracking-[0.24em]" style={{ color: palette.primary }}>From Your Advisor</p>
          <Link to="/assigned-practices" className="rounded-full border px-4 py-2 text-xs font-semibold" style={{ borderColor: palette.border, color: palette.primary, background: palette.surface }}>Open Assigned Practices <ArrowRight className="ml-1 inline h-3 w-3" /></Link>
        </div>
        <div className="grid grid-cols-2 gap-3.5 sm:gap-4">
          {advisorTiles.map((tile) => (
            <PhotoTile key={tile.id} to={tile.to} image={tile.image} icon={tile.icon} title={tile.title} detail={tile.detail} tone="advisor" wide full={tile.full} />
          ))}
        </div>
      </section>
    </div>
  );
};

export default Home;
