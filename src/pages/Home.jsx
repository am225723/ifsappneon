import { useState, useEffect, createElement } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Heart,
  Brain,
  Play,
  ArrowRight,
  BookOpen,
  Compass,
  Sun,
  Smile,
  Feather,
  Trophy,
  CalendarCheck,
  CheckCircle2,
  HeartPulse,
  MessageSquare,
  Sparkles,
  ShieldCheck,
  Library,
  Map,
  ClipboardCheck,
  Layers
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { loadClientSessionAgendas } from '../lib/sessionAgendas';
import { loadActiveTreatmentPlansForClient } from '../lib/treatmentPlans';
import { getActiveLiveSessionForClient } from '../lib/liveSession';
import { loadAssignedHomeworkForClient } from '../lib/assignedHomework';
import { loadLifeIntegrationReflections } from '../lib/lifeIntegration';
import { formatLifeReflectionType, getLifeReflectionRoute, normalizeLifeReflection } from '../lib/lifeIntegrationDisplay';
import { loadHealingTimeline } from '../lib/healingTimeline';
import {
  getPartsMapParts,
  isCurriculumInteractiveModule,
  isInteractiveAssessmentModule,
  normalizeInteractiveResult,
  summarizeInteractiveInsights
} from '../lib/interactiveResults';
import RecentActivityFeed from '../components/RecentActivityFeed';
import { buildSharedCurriculumSummary } from '../lib/curriculumExperience';
import { loadCurriculumReflections } from '../lib/curriculumReflections';
import { loadNextBestStep } from '../lib/unifiedGuidance';
import InteractiveWorksheetRenderer from '../components/ai/InteractiveWorksheetRenderer';

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
              .select('module_id, completed, current_step, updated_at')
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
          setCurriculumSummary(buildSharedCurriculumSummary({
            progressRows,
            interactiveRows,
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
  const assessmentPrimary = savedAssessment?.primaryWound?.name || savedAssessment?.primaryWound?.id || savedAssessment?.topWound?.name || savedAssessment?.topWound?.id || savedAssessment?.primary_wound || savedAssessment?.primary || null;
  const formalWoundPrimary = assessmentSummary.latestFormalWound?.primary_wound || null;
  const formalWoundSecondary = assessmentSummary.latestFormalWound?.secondary_wound || null;
  const interactiveAssessmentLabels = assessmentSummary.interactiveAssessments.map((item) => item.label);
  const interactiveInsightLines = summarizeInteractiveInsights(assessmentSummary.interactiveAssessments);
  const partsMapPartsCount = getPartsMapParts(assessmentSummary.partsMapRow).length;
  const hasInteractiveWounds = assessmentSummary.interactiveAssessments.some((item) => item.moduleId === 'assessment_wounds');
  const hasWoundAssessment = Boolean(assessmentSummary.latestFormalWound || hasInteractiveWounds);
  const hasLegacyPartsMapOnly = assessmentSummary.partsCount === 0 && partsMapPartsCount > 0;
  const hasInnerSystemProgress = assessmentSummary.partsCount > 0 || partsMapPartsCount > 0;
  const curriculumProgress = curriculumSummary?.percent ?? 0;
  const currentModule = curriculumSummary?.currentModule;
  const latestCurriculumReflection = curriculumReflections[0] || null;
  const hasSelfData = selfProfileResult?.hasPersonalData !== false;

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

  const gentleFocus = activeLiveSession
    ? {
        to: '/live-session',
        icon: HeartPulse,
        title: 'Join your live Advisor-guided practice',
        description: 'Your Advisor has opened a live IFS practice space for you.',
        buttonLabel: 'Join Practice',
        badge: 'Active now',
        tone: 'emerald'
      }
    : activeAssignedPractice
      ? {
          to: '/assigned-practices',
          icon: BookOpen,
          title: 'Continue an Advisor-guided practice',
          description: activeAssignedPractice.title || 'Return to the IFS practice your Advisor shared with you.',
          buttonLabel: 'Continue Practice',
          badge: activeAssignedPractice.status === 'in_progress' ? 'In progress' : 'Assigned',
          tone: 'gold'
        }
      : agendaSummary.hasDraft
        ? {
            to: '/pre-session-checkin',
            icon: CalendarCheck,
            title: 'Prepare for your Advisor session',
            description: 'Continue your check-in and name what feels important to bring into session.',
            buttonLabel: 'Continue Check-In',
            badge: 'Draft',
            tone: 'stone'
          }
        : recentLifeReflection
          ? {
              to: `/life-integration/reflections/${recentLifeReflection.id}`,
              icon: Feather,
              title: 'Return to a recent reflection',
              description: recentLifeReflection.summary || 'Revisit a Life Integration reflection with curiosity.',
              buttonLabel: 'Open Reflection',
              badge: 'Recent',
              tone: 'emerald'
            }
          : latestMilestone
            ? {
                to: '/healing-timeline',
                icon: Trophy,
                title: 'Notice a healing milestone',
                description: latestMilestone.title || 'Pause to honor a recent moment of growth in your inner work.',
                buttonLabel: 'View Timeline',
                badge: 'Growth',
                tone: 'gold'
              }
            : {
                to: '/life-integration/notice-part',
                icon: Smile,
                title: 'Check in with a part',
                description: 'Take a few minutes to notice what parts are present today.',
                buttonLabel: 'Notice a Part',
                tone: 'emerald'
              };

  const assessmentProgressTiles = [
    {
      to: '/assessments',
      icon: Brain,
      title: 'Wound Patterns Assessment',
      description: hasWoundAssessment
        ? `Review your wound patterns assessment${formalWoundPrimary ? ` themes: ${[formalWoundPrimary, formalWoundSecondary].filter(Boolean).join(' / ')}` : ''}${hasInteractiveWounds ? ' with interactive insights included' : ''}.`
        : 'Take the first assessment so the curriculum can better support your parts work.',
      buttonLabel: 'Take / Review Assessment',
      badge: hasWoundAssessment ? 'Connected' : 'Start here',
      tone: hasWoundAssessment ? 'emerald' : 'gold'
    },
    {
      to: '/assessments',
      icon: ClipboardCheck,
      title: 'Interactive Assessments',
      description: assessmentSummary.interactiveAssessments.length
        ? `${assessmentSummary.interactiveAssessments.length} interactive assessment${assessmentSummary.interactiveAssessments.length === 1 ? '' : 's'} connected: ${interactiveAssessmentLabels.join(', ')}.`
        : 'Complete interactive assessments to add gentle personalization to your IFS path.',
      buttonLabel: 'Review Assessments',
      badge: assessmentSummary.interactiveAssessments.length ? `${assessmentSummary.interactiveAssessments.length} connected` : null,
      tone: assessmentSummary.interactiveAssessments.length ? 'emerald' : 'stone'
    },
    {
      to: '/profile',
      icon: Sun,
      title: 'Assessment Insights',
      description: interactiveInsightLines.length
        ? interactiveInsightLines.slice(0, 4).join(' • ')
        : assessmentPrimary ? `Your current assessment points to ${assessmentPrimary} themes. Review insights gently.` : 'Your assessments help personalize how the curriculum supports your parts work.',
      buttonLabel: 'View Insights',
      tone: 'stone'
    },
    {
      to: '/curriculum',
      icon: BookOpen,
      title: 'Curriculum Progress',
      description: curriculumSummary
        ? `${curriculumSummary.completedCount} of ${curriculumSummary.totalModules} modules connected on your IFS Path${assessmentSummary.curriculumModuleRows.length ? `, including ${assessmentSummary.curriculumModuleRows.length} interactive module row${assessmentSummary.curriculumModuleRows.length === 1 ? '' : 's'}` : ''}.`
        : 'Start your guided IFS curriculum step by step.',
      buttonLabel: 'View Progress',
      progress: curriculumProgress,
      tone: 'emerald'
    },
    { to: '/healing-timeline', icon: Trophy, title: 'Healing Timeline', description: latestMilestone?.title || 'Notice milestones, reflections, and growth without turning healing into pressure.', buttonLabel: 'View Timeline', tone: 'gold' },
    { to: '/assigned-practices', icon: CalendarCheck, title: 'Assigned IFS Practices', description: assignedPracticeCount ? `${assignedPracticeCount} Advisor-guided practice${assignedPracticeCount === 1 ? '' : 's'} ready to support your curriculum.` : 'View practices your Advisor shares to support what you are learning.', buttonLabel: 'View Assigned Practices', badge: assignedPracticeCount ? `${assignedPracticeCount} active` : null, tone: 'emerald' },
    {
      to: '/parts-relationships',
      icon: Map,
      title: 'My Inner System Map',
      description: hasInnerSystemProgress
        ? `${assessmentSummary.partsCount ? `${assessmentSummary.partsCount} saved part${assessmentSummary.partsCount === 1 ? '' : 's'}` : `Inner System Map started${partsMapPartsCount ? ` with ${partsMapPartsCount} older mapped item${partsMapPartsCount === 1 ? '' : 's'}` : ''}`}${assessmentSummary.relationshipsCount ? ` and ${assessmentSummary.relationshipsCount} relationship${assessmentSummary.relationshipsCount === 1 ? '' : 's'}` : ''}.`
        : 'See how your parts relationships and inner system understanding are unfolding.',
      buttonLabel: assessmentSummary.partsCount ? 'View Inner System' : hasLegacyPartsMapOnly ? 'Import existing map' : 'Start Inner System',
      badge: hasInnerSystemProgress ? 'Started' : null,
      tone: hasInnerSystemProgress ? 'emerald' : 'stone'
    }
  ];

  const curriculumSupportTiles = [
    { to: '/parts-mapping', icon: Compass, title: 'Parts Map / Inner System Map', description: 'Map the parts you meet as the curriculum invites deeper parts work.', buttonLabel: 'Open Parts Map', tone: 'emerald' },
    { to: '/parts-dialogue', icon: MessageSquare, title: 'Parts Dialogue', description: 'Practice curious, compassionate conversations with parts from your modules.', buttonLabel: 'Start Dialogue', tone: 'gold' },
    { to: '/journal', icon: BookOpen, title: 'Healing Journal', description: 'Reflect on module prompts, parts, needs, and insights.', buttonLabel: 'Open Journal', tone: 'stone' },
    { to: '/meditation', icon: Play, title: 'Guided Meditation', description: 'Use grounding and Self-energy practices alongside your lessons.', buttonLabel: 'Choose Meditation', tone: 'emerald' },
    { to: '/qualities', icon: Sparkles, title: 'Affirmations & Self-Energy', description: 'Explore qualities of Self and supportive affirmations for your IFS path.', buttonLabel: 'Explore Qualities', tone: 'gold' },
    { to: '/mood-analytics', icon: HeartPulse, title: 'Mood Tracker', description: 'Notice patterns in your daily check-ins as supportive context for parts work.', buttonLabel: 'View Mood Patterns', tone: 'stone' },
    { to: '/resource-library', icon: Library, title: 'Resource Library', description: 'Find learning supports that reinforce curriculum themes.', buttonLabel: 'Open Resources', tone: 'emerald' },
    { to: '/cheat-sheet', icon: Layers, title: 'IFS Cheat Sheet', description: 'Keep core IFS concepts close while you move through modules.', buttonLabel: 'Open Cheat Sheet', tone: 'gold' },
    { to: '/unburdening', icon: Feather, title: 'Unburdening Practice', description: 'Use only when your learning path invites deeper release work.', buttonLabel: 'Begin Practice', tone: 'stone' },
    { to: '/weekly-reflection', icon: CalendarCheck, title: 'Weekly Reflection', description: 'Look back gently at curriculum, parts work, and daily practice.', buttonLabel: 'Reflect on Week', tone: 'emerald' }
  ];

  const lifeIntegrationSummary = lifeReflectionCount
    ? `You have ${lifeReflectionCount} daily-life reflection${lifeReflectionCount === 1 ? '' : 's'} saved. Latest: ${formatLifeReflectionType(recentLifeReflection?.reflection_type)}.`
    : 'Use Life Integration practices when something comes up in daily life.';
  const latestPracticeRoute = recentLifeReflection?.practiceRoute || getLifeReflectionRoute('notice_part');

  const lifeIntegrationTiles = [
    { to: '/life-integration', icon: Sparkles, title: 'IFS in Daily Life', description: lifeIntegrationSummary, buttonLabel: 'Open Toolkit', badge: lifeReflectionCount ? `${lifeReflectionCount} saved` : null, tone: 'emerald' },
    { to: latestPracticeRoute, icon: Smile, title: recentLifeReflection ? 'Continue latest Daily Life Practice' : 'Notice a Part in the Moment', description: recentLifeReflection ? recentLifeReflection.summary : 'Pause, identify what part is showing up, and choose one gentle next step.', buttonLabel: recentLifeReflection ? 'Continue Practice' : 'Notice a Part', tone: 'gold' },
    { to: '/life-integration/return-to-self', icon: Sun, title: 'Return to Self-Energy', description: 'Invite unblending and reconnect with calm, curiosity, compassion, or another Self-energy quality.', buttonLabel: 'Return to Self', tone: 'emerald' },
    { to: '/life-integration/trigger-reflection', icon: Feather, title: 'Reflect on a Trigger', description: 'Explore what happened lightly, which parts reacted, and what they may need.', buttonLabel: 'Reflect Gently', tone: 'stone' },
    { to: '/life-integration/repair-after-conflict', icon: Heart, title: 'Repair After Conflict', description: 'Understand activated parts and choose one repair, boundary, or honest communication.', buttonLabel: 'Explore Repair', tone: 'gold' },
    { to: '/life-integration/protector-check-in', icon: ShieldCheck, title: 'Protector Check-In', description: 'Appreciate a protector and ask what it needs from you today.', buttonLabel: 'Check In', tone: 'emerald' },
    { to: '/life-integration/needs-boundaries', icon: Compass, title: 'Needs & Boundaries Reflection', description: 'Notice what need or boundary a part may be trying to express.', buttonLabel: 'Name Needs', tone: 'stone' }
  ];

  const advisorTiles = [
    { to: '/assigned-practices', icon: BookOpen, title: 'Assigned by My Advisor', description: 'IFS practices and reflections shared by your Advisor.', buttonLabel: 'View Assigned Practices', badge: activeAssignedPractice ? 'Active' : null, tone: 'gold' },
    { to: '/pre-session-checkin', icon: CalendarCheck, title: 'Pre-Session Check-In', description: 'Prepare for your next Advisor session by naming what feels important.', buttonLabel: agendaSummary.hasDraft ? 'Continue Check-In' : 'Start Check-In', badge: agendaSummary.lastSubmitted ? `Last ${new Date(agendaSummary.lastSubmitted).toLocaleDateString()}` : null, tone: 'emerald' },
    { to: '/live-session', icon: HeartPulse, title: 'Live Advisor-Guided Practice', description: activeLiveSession ? 'Your Advisor has started a live guided practice.' : 'Join a guided IFS practice when your Advisor starts one.', buttonLabel: activeLiveSession ? 'Join Practice' : 'Check for Guided Practice', badge: activeLiveSession ? 'Active now' : null, tone: activeLiveSession ? 'emerald' : 'stone' },
    { to: '/inbox', icon: MessageSquare, title: 'Advisor Messages', description: 'View supportive messages and updates from your Advisor.', buttonLabel: 'Open Messages', tone: 'gold' }
  ];

  const recentInnerWork = [
    latestCurriculumReflection && { type: 'Module reflection', title: latestCurriculumReflection.moduleTitle || latestCurriculumReflection.module_id || 'Curriculum reflection', detail: latestCurriculumReflection.summary || latestCurriculumReflection.reflection || 'A curriculum reflection was saved.', to: latestCurriculumReflection.moduleId ? `/curriculum/module/${latestCurriculumReflection.moduleId}` : '/curriculum' },
    recentLifeReflection && { type: 'Life Integration', title: formatLifeReflectionType(recentLifeReflection.reflection_type), detail: recentLifeReflection.summary, to: recentLifeReflection.id ? `/life-integration/reflections/${recentLifeReflection.id}` : '/life-integration' },
    latestMilestone && { type: 'Healing timeline', title: latestMilestone.title || 'Recent milestone', detail: latestMilestone.description || 'A recent moment of inner work was recorded.', to: '/healing-timeline' }
  ].filter(Boolean).slice(0, 3);

  const quietTools = [
    { to: '/meditation', label: 'Guided Meditation' },
    { to: '/life-integration/return-to-self', label: 'Return to Self' },
    { to: '/parts-dialogue', label: 'Parts Dialogue' },
    { to: '/journal', label: 'Journal' }
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
    return (
      <div className="mx-auto max-w-6xl px-6 py-12 lg:py-20">
        <div className="soft-card p-8 text-center">
          <div className="mx-auto mb-4 h-8 w-8 animate-spin rounded-full border-b-2 border-t-2 border-brand-gold-600" />
          <p className="text-sm text-brand-stone-600 dark:text-slate-400">Loading your IFS path…</p>
        </div>
      </div>
    );
  }

  if (shouldShowWorkspaceChoice) {
    return (
      <div className="mx-auto max-w-5xl px-6 py-12 lg:py-20">
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
            <Link to={effectiveClient?.user_role === 'admin' || effectiveClient?.user_role === 'supervisor' ? '/admin-hub' : '/ther' + 'apist'} className="soft-card-interactive p-5">
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
    <div className="mx-auto max-w-6xl px-6 py-12 lg:py-20">
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

      <section className="mb-12 overflow-hidden rounded-[2.25rem] border p-7 shadow-premium md:p-10" style={{ background: `linear-gradient(135deg, ${palette.surface}, ${palette.background})`, borderColor: palette.border }}>
        <div className="flex flex-col gap-8 lg:flex-row lg:items-center lg:justify-between">
          <div className="max-w-3xl">
            <p className="mb-4 text-xs font-bold uppercase tracking-[0.32em]" style={{ color: palette.primary }}>The Luminous Self</p>
            <h1 className="mb-4 font-serif text-4xl font-normal leading-tight text-brand-stone-900 dark:text-slate-100 lg:text-6xl">
              {clientFirstName ? `Hello, ${clientFirstName}` : 'Welcome back to your IFS path'}
            </h1>
            <p className="max-w-2xl text-lg leading-relaxed text-brand-stone-600 dark:text-slate-300">
              Your main path is the Curriculum. Advisor-guided practices, reflections, and tools sit nearby as calm support—not a crowded dashboard.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <button onClick={() => navigate(currentModule?.id ? `/curriculum/module/${currentModule.id}` : '/curriculum')} className="btn-sanctuary-primary justify-center">
                <BookOpen className="h-5 w-5" />
                {currentModule?.id ? 'Continue IFS Path' : 'Begin IFS Path'}
              </button>
              <button onClick={() => navigate('/tools')} className="btn-sanctuary-secondary justify-center">
                <Sparkles className="h-5 w-5" />
                Open Tools & Practices
              </button>
            </div>
            <div className="mt-5 flex flex-wrap gap-2 text-xs">
              <span className="rounded-full bg-white/80 px-3 py-1 font-semibold shadow-sm" style={{ color: palette.primary }}>Curriculum-first IFS path</span>
              <span className="rounded-full px-3 py-1 font-semibold" style={{ background: palette.softAccent, color: palette.primary }}>{curriculumSummary ? `${curriculumSummary.completedCount}/${curriculumSummary.totalModules} modules` : 'Ready to begin'}</span>
              {activeAssignedPractice && <span className="rounded-full bg-brand-gold-50 px-3 py-1 font-semibold text-brand-gold-700 dark:bg-brand-gold-950/30 dark:text-brand-gold-500">Advisor-guided practice ready</span>}
            </div>
          </div>
          <div className="flex flex-col items-start gap-4 lg:items-end">
            <PaletteSelector paletteKey={paletteKey} setPaletteKey={setPaletteKey} />
            <div className="hidden h-44 w-44 items-center justify-center rounded-full border bg-white/60 shadow-2xl lg:flex" style={{ borderColor: palette.border }}>
              <Sun className="h-16 w-16" style={{ color: palette.accent }} />
            </div>
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

      <section className="mb-10 grid gap-6 lg:grid-cols-[1.35fr_0.85fr]">
        <div className="rounded-[2rem] border bg-white/85 p-6 shadow-premium dark:bg-slate-900/60" style={{ borderColor: palette.border }}>
          <div className="flex flex-col gap-5 md:flex-row md:items-start md:justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.24em]" style={{ color: palette.primary }}>Continue Your IFS Path</p>
              <h2 className="mt-2 font-serif text-3xl font-normal text-brand-stone-900 dark:text-slate-100">{currentModule?.title || 'Begin with the main curriculum'}</h2>
              <p className="mt-3 text-sm leading-relaxed text-brand-stone-600 dark:text-slate-400">The Curriculum is your main guided path. Assigned IFS Practices remain separate Advisor-guided activities.</p>
            </div>
            <div className="rounded-3xl px-5 py-4 text-center" style={{ background: palette.softAccent }}>
              <p className="text-3xl font-bold" style={{ color: palette.primary }}>{curriculumProgress}%</p>
              <p className="text-xs uppercase tracking-wide text-brand-stone-500">complete</p>
            </div>
          </div>
          <div className="mt-6 h-3 overflow-hidden rounded-full bg-brand-stone-100 dark:bg-slate-800">
            <div className="h-full rounded-full transition-all" style={{ width: `${curriculumProgress}%`, background: `linear-gradient(90deg, ${palette.accent}, ${palette.primary})` }} />
          </div>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link to={currentModule?.id ? `/curriculum/module/${currentModule.id}` : '/curriculum'} className="btn-sanctuary-primary">{currentModule?.id ? 'Continue Module' : 'Start Curriculum'} <ArrowRight className="h-4 w-4" /></Link>
            <Link to="/curriculum" className="btn-sanctuary-secondary">View Curriculum</Link>
          </div>
        </div>

        <div className="rounded-[2rem] border bg-white/75 p-6 dark:bg-slate-900/50" style={{ borderColor: palette.border }}>
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.24em]" style={{ color: palette.primary }}>Your Next Guided Step</p>
              <h2 className="mt-2 font-serif text-2xl font-normal text-brand-stone-900 dark:text-slate-100">Gentle next step</h2>
            </div>
            <button type="button" onClick={() => handleLoadNextStep(Boolean(nextStepState.data))} disabled={nextStepState.loading || !effectiveClientId} className="rounded-full border px-3 py-2 text-xs font-semibold disabled:opacity-60" style={{ borderColor: palette.border, color: palette.primary }}>
              {nextStepState.loading ? 'Finding…' : nextStepState.data ? 'Refresh' : 'Find'}
            </button>
          </div>
          {nextStepState.error && <p className="mt-4 rounded-2xl bg-amber-50 px-4 py-3 text-sm text-amber-800">Your next guided step could not be generated right now. You can continue with your curriculum.</p>}
          {nextStepState.data?.next_best_step ? (
            <div className="mt-4">
              <h3 className="font-semibold text-brand-stone-900 dark:text-slate-100">{nextStepState.data.next_best_step.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-brand-stone-600 dark:text-slate-400">{nextStepState.data.next_best_step.description}</p>
              <p className="mt-3 text-xs font-semibold uppercase tracking-wide" style={{ color: palette.accent }}>{nextStepState.data.next_best_step.estimated_time}</p>
              <Link to={nextStepState.data.next_best_step.action_route || '/curriculum'} className="mt-4 inline-flex items-center gap-2 text-sm font-bold" style={{ color: palette.primary }}>Open Step <ArrowRight className="h-4 w-4" /></Link>
              {(nextStepState.data.next_best_step.interactive_payload?.content || nextStepState.data.next_best_step.interactive_payload?.blocks?.length) && (
                <div className="mt-4 rounded-2xl bg-white/70 p-3 dark:bg-slate-950/30">
                  {nextStepState.data.next_best_step.interactive_payload?.content && <p className="text-sm text-brand-stone-600 dark:text-slate-400">{nextStepState.data.next_best_step.interactive_payload.content}</p>}
                  {Boolean(nextStepState.data.next_best_step.interactive_payload?.blocks?.length) && <InteractiveWorksheetRenderer blocks={nextStepState.data.next_best_step.interactive_payload.blocks} readOnly />}
                </div>
              )}
            </div>
          ) : !nextStepState.loading && <p className="mt-4 text-sm text-brand-stone-500 dark:text-slate-500">Continue the curriculum or ask for a personalized next step when you are ready.</p>}
        </div>
      </section>

      <section className="mb-10 grid gap-6 lg:grid-cols-3">
        <div className="rounded-[2rem] border bg-white/75 p-6 dark:bg-slate-900/50" style={{ borderColor: palette.border }}>
          <p className="text-xs font-bold uppercase tracking-[0.24em]" style={{ color: palette.primary }}>Advisor-Guided Practice</p>
          <h2 className="mt-2 font-serif text-2xl font-normal text-brand-stone-900 dark:text-slate-100">{activeAssignedPractice ? activeAssignedPractice.title || 'Practice ready' : 'No active assigned practice'}</h2>
          <p className="mt-3 text-sm leading-relaxed text-brand-stone-600 dark:text-slate-400">Assigned IFS Practices are separate from Curriculum and live in your Advisor-guided practice area.</p>
          <Link to="/assigned-practices" className="mt-5 inline-flex items-center gap-2 text-sm font-bold" style={{ color: palette.primary }}>Open Assigned IFS Practices <ArrowRight className="h-4 w-4" /></Link>
        </div>

        <div className="rounded-[2rem] border bg-white/75 p-6 dark:bg-slate-900/50" style={{ borderColor: palette.border }}>
          <p className="text-xs font-bold uppercase tracking-[0.24em]" style={{ color: palette.primary }}>Recent Inner Work</p>
          <div className="mt-4 space-y-4">
            {recentInnerWork.length ? recentInnerWork.map((item) => (
              <Link key={`${item.type}-${item.title}`} to={item.to} className="block border-l-2 pl-4" style={{ borderColor: palette.accent }}>
                <p className="text-xs font-bold uppercase tracking-wide text-brand-stone-500">{item.type}</p>
                <p className="mt-1 text-sm font-semibold text-brand-stone-900 dark:text-slate-100">{item.title}</p>
                <p className="mt-1 line-clamp-2 text-xs text-brand-stone-600 dark:text-slate-400">{item.detail}</p>
              </Link>
            )) : <p className="text-sm text-brand-stone-500 dark:text-slate-500">Recent module reflections, Life Integration reflections, journal entries, and worksheet completions will appear here.</p>}
          </div>
        </div>

        <div className="rounded-[2rem] border bg-white/75 p-6 dark:bg-slate-900/50" style={{ borderColor: palette.border }}>
          <p className="text-xs font-bold uppercase tracking-[0.24em]" style={{ color: palette.primary }}>Inner System Snapshot</p>
          <h2 className="mt-2 font-serif text-2xl font-normal text-brand-stone-900 dark:text-slate-100">{assessmentSummary.partsCount || partsMapPartsCount || 0} part{(assessmentSummary.partsCount || partsMapPartsCount) === 1 ? '' : 's'} mapped</h2>
          <p className="mt-3 text-sm leading-relaxed text-brand-stone-600 dark:text-slate-400">{hasInnerSystemProgress ? 'Your Inner System Map has started. Continue adding parts and relationships gently.' : 'Begin by adding one part you notice often.'}</p>
          <Link to="/parts-relationships" className="mt-5 inline-flex items-center gap-2 text-sm font-bold" style={{ color: palette.primary }}>Open Inner System Map <ArrowRight className="h-4 w-4" /></Link>
        </div>
      </section>

      <section className="mb-14 rounded-[2rem] border bg-white/65 p-6 dark:bg-slate-900/45" style={{ borderColor: palette.border }}>
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.24em]" style={{ color: palette.primary }}>Quiet Tools Drawer</p>
            <h2 className="mt-2 font-serif text-2xl font-normal text-brand-stone-900 dark:text-slate-100">Open tools only when they support the path</h2>
          </div>
          <Link to="/tools" className="btn-sanctuary-secondary">Open Tools & Practices</Link>
        </div>
        <div className="mt-5 flex flex-wrap gap-2">
          {quietTools.map((tool) => <Link key={tool.to} to={tool.to} className="rounded-full border px-4 py-2 text-sm font-semibold" style={{ borderColor: palette.border, color: palette.primary, background: palette.surface }}>{tool.label}</Link>)}
        </div>
      </section>

      <section className="mb-6">
        <RecentActivityFeed limit={3} title="Recent Updates" className="mb-6" />
      </section>
    </div>
  );
};

export default Home;
