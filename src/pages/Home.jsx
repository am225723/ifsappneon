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
import { getCurriculumPathSummary, getCompletedModuleIds } from '../lib/curriculumExperience';
import { loadCurriculumReflections } from '../lib/curriculumReflections';

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

const DATA_LOAD_ERROR_MESSAGE = 'Your IFS data could not be loaded right now. Please refresh or try again.';
const PARTIAL_DATA_LOAD_MESSAGE = 'Some parts of your IFS path could not be refreshed. The rest of your information is still shown.';

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
  const [dataLoadError, setDataLoadError] = useState(null);
  const effectiveClientId = getEffectiveClientId({ mode, currentClientId: clientId, selfProfile: selfProfile || selfProfileResult?.profile });
  const effectiveClient = mode === 'my-ifs' ? (selfProfile || selfProfileResult?.profile || client) : client;
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
      setDataLoadError(null);
      if (shouldShowWorkspaceChoice) {
        setLoading(false);
        return;
      }
      if (effectiveClientId) {
        try {
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
          ] = await Promise.all([
            supabase
              .from('ifs_interactive_data')
              .select('id, client_id, module_id, data, created_at, updated_at')
              .eq('client_id', effectiveClientId),
            supabase
              .from('ifs_assessment_results')
              .select('id, primary_wound, secondary_wound, tertiary_wounds, assessment_date, created_at')
              .eq('client_id', effectiveClientId)
              .order('created_at', { ascending: false }),
            supabase
              .from('ifs_parts')
              .select('id', { count: 'exact' })
              .eq('client_id', effectiveClientId),
            supabase
              .from('ifs_part_relationships')
              .select('id', { count: 'exact' })
              .eq('client_id', effectiveClientId),
            loadClientSessionAgendas(effectiveClientId),
            loadActiveTreatmentPlansForClient(effectiveClientId),
            loadAssignedHomeworkForClient(effectiveClientId),
            loadLifeIntegrationReflections({ clientId: effectiveClientId, self: mode === 'my-ifs' }),
            loadHealingTimeline({ clientId: effectiveClientId, range: 'ALL' }),
            supabase
              .from('ifs_journal_entries')
              .select('id', { count: 'exact' })
              .eq('client_id', effectiveClientId),
            supabase
              .from('ifs_client_progress')
              .select('module_id, completed, current_step, updated_at')
              .eq('client_id', effectiveClientId),
            loadCurriculumReflections({ clientId: effectiveClientId, limit: 20 })
          ]);

          const queryErrors = summarizeQueryErrors({
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
          }, effectiveClientId, selfProfile || selfProfileResult?.profile);

          if (queryErrors.length) {
            setDataLoadError({
              message: hasResolvedSelfProfile ? PARTIAL_DATA_LOAD_MESSAGE : DATA_LOAD_ERROR_MESSAGE,
              details: queryErrors
            });
            if (import.meta.env.DEV) {
              console.warn('[MyIFSWork/Home] data query failures', queryErrors.map((item) => ({
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
          const completedModuleIds = getCompletedModuleIds(progressRows, curriculumModuleRows);
          setCurriculumSummary(getCurriculumPathSummary({
            completedModuleIds,
            assignedPractices
          }));

          const liveResult = await getActiveLiveSessionForClient();
          if (!liveResult.error) setActiveLiveSession(liveResult.data || null);
        } catch (err) {
          if (import.meta.env.DEV) {
            console.warn('[Home] data load failure', {
              message: err?.message || 'Request failed',
              status: err?.status || err?.statusCode || null,
              effectiveClientId,
              selfProfilePresent: hasResolvedSelfProfile
            });
          }
          setDataLoadError({
            message: hasResolvedSelfProfile ? PARTIAL_DATA_LOAD_MESSAGE : DATA_LOAD_ERROR_MESSAGE,
            details: [{
              table: 'home_data',
              status: err?.status || err?.statusCode || null,
              message: err?.message || 'Request failed',
              effectiveClientId,
              selfProfilePresent: Boolean((selfProfile || selfProfileResult?.profile)?.id)
            }]
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

      <section className="mb-12 text-center lg:flex lg:items-center lg:justify-between lg:text-left">
        <div className="max-w-2xl">
          <p className="mb-4 text-xs font-bold uppercase tracking-[0.28em] text-brand-emerald-700 dark:text-brand-emerald-100">The Luminous Self</p>
          <h1 className="mb-4 text-4xl font-normal text-brand-stone-900 dark:text-slate-100 lg:text-6xl">
            {clientFirstName ? `Hello, ${clientFirstName}` : 'Welcome back to your IFS path'}
          </h1>
          <p className="mb-8 text-lg leading-relaxed text-brand-stone-600 dark:text-slate-400">
            Continue your IFS path and use the tools below to understand, support, and connect with your parts.
          </p>
          <div className="flex flex-col justify-center gap-4 sm:flex-row lg:justify-start">
            <button onClick={() => navigate('/curriculum')} className="btn-sanctuary-primary justify-center">
              <BookOpen className="h-5 w-5" />
              Continue Curriculum
            </button>
            <button onClick={() => navigate('/progress-timeline')} className="btn-sanctuary-secondary justify-center">
              <Trophy className="h-5 w-5" />
              View My Progress
            </button>
            <button onClick={() => navigate('/assessments')} className="btn-sanctuary-secondary justify-center">
              <Brain className="h-5 w-5" />
              Take / Review Assessment
            </button>
          </div>
          <div className="mt-5 flex flex-wrap justify-center gap-2 text-xs lg:justify-start">
            <span className="rounded-full bg-white/80 px-3 py-1 font-semibold text-brand-emerald-700 shadow-sm dark:bg-slate-900/60 dark:text-brand-emerald-100">Curriculum-first IFS path</span>
            {activeAssignedPractice && <span className="rounded-full bg-brand-gold-50 px-3 py-1 font-semibold text-brand-gold-700 dark:bg-brand-gold-950/30 dark:text-brand-gold-500">Advisor-guided practice ready</span>}
            {activeLiveSession && <span className="rounded-full bg-brand-emerald-600 px-3 py-1 font-semibold text-white">Live guided practice available</span>}
          </div>
        </div>
        <div className="mt-10 hidden lg:block">
          <div className="relative flex h-56 w-56 items-center justify-center rounded-full border border-brand-gold-100 bg-gradient-to-br from-white to-brand-gold-50 shadow-2xl shadow-brand-gold-500/10 dark:border-brand-gold-900/30 dark:from-brand-cardDark dark:to-brand-gold-950/20">
            <Sun className="h-20 w-20 text-brand-gold-600" />
            <div className="absolute -right-5 top-8 h-16 w-16 rounded-full bg-brand-emerald-100/70 blur-2xl" />
          </div>
        </div>
      </section>

      {dataLoadError && (
        <section className="mb-8 rounded-3xl border border-red-200 bg-red-50 p-5 text-sm text-red-700 dark:border-red-900/60 dark:bg-red-950/20 dark:text-red-200">
          <p className="font-semibold">{dataLoadError.message}</p>

        </section>
      )}

      {isMyIFSMode && (
        <section className="mb-8 rounded-3xl border border-brand-gold-200/70 bg-brand-gold-50/80 p-5 text-sm text-brand-stone-700 dark:border-brand-gold-900/50 dark:bg-brand-gold-950/20 dark:text-slate-300">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.24em] text-brand-gold-700 dark:text-brand-gold-500">My IFS Work</p>
              <p className="mt-1 font-semibold text-brand-stone-900 dark:text-slate-100">Your personal IFS path is connected.</p>
              <p className="mt-1">Continue your curriculum, revisit your assessments, and return to the tools that support your parts work.</p>
              {!hasSelfData && (
                <p className="mt-2 font-semibold">Start with the curriculum or an assessment to begin your IFS path.</p>
              )}
            </div>
            <div className="rounded-2xl bg-white/70 px-4 py-3 text-xs dark:bg-slate-900/50">
              <p className="font-bold text-brand-stone-900 dark:text-slate-100">Your path summary</p>
              <div className="mt-2 grid gap-1 sm:grid-cols-2">
                <span>Curriculum progress: {curriculumSummary ? `${curriculumSummary.completedCount}/${curriculumSummary.totalModules} modules` : 'Ready to begin'}</span>
                <span>Assessments completed: {assessmentSummary.formalWoundCount + assessmentSummary.interactiveAssessments.length}</span>
                <span>Interactive tools completed: {assessmentSummary.interactiveDataCount}</span>
                <span>Inner System Map: {hasInnerSystemProgress ? 'Started' : 'Not started yet'}</span>
                <span>Journal reflections: {assessmentSummary.journalCount ? 'Started' : 'Not started yet'}</span>
              </div>
            </div>
          </div>
        </section>
      )}

      <section className="mb-14">
        <div className="rounded-[2rem] border border-brand-gold-100 bg-gradient-to-br from-white via-brand-gold-50/70 to-brand-emerald-50 p-6 shadow-premium dark:border-slate-800 dark:from-brand-cardDark dark:via-brand-gold-950/20 dark:to-brand-emerald-950/20 lg:p-8">
          <div className="grid gap-8 lg:grid-cols-[1.25fr_0.75fr] lg:items-center">
            <div>
              <p className="mb-2 text-xs font-bold uppercase tracking-[0.24em] text-brand-gold-700 dark:text-brand-gold-500">Continue Your IFS Path</p>
              <h2 className="text-4xl font-serif font-normal text-brand-stone-900 dark:text-slate-100">Your IFS Curriculum</h2>
              <p className="mt-3 max-w-2xl text-sm leading-relaxed text-brand-stone-600 dark:text-slate-400">
                The curriculum is your main path through IFS. Use the tools below to support what you are learning.
              </p>
              <div className="mt-6 rounded-3xl bg-white/80 p-5 shadow-sm dark:bg-slate-900/50">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <p className="text-xs font-bold uppercase tracking-wide text-brand-emerald-700 dark:text-brand-emerald-100">
                      {curriculumSummary?.assignedModule ? 'Assigned by Advisor' : curriculumSummary ? 'Available' : 'Warm beginning'}
                    </p>
                    <h3 className="mt-1 text-2xl font-semibold text-brand-stone-900 dark:text-slate-100">
                      {currentModule?.title || 'Start with the first module'}
                    </h3>
                    <p className="mt-2 text-sm text-brand-stone-600 dark:text-slate-400">
                      {currentModule?.description || 'Start with the first module and build your understanding of parts, protectors, exiles, and Self-energy step by step.'}
                    </p>
                    {curriculumSummary?.lastCompletedModule && (
                      <p className="mt-3 text-xs font-semibold text-brand-stone-500 dark:text-slate-500">Last completed: {curriculumSummary.lastCompletedModule.title}</p>
                    )}
                    <p className="mt-2 text-xs font-semibold text-brand-gold-700 dark:text-brand-gold-500">
                      {curriculumReflections.length ? `${curriculumReflections.length} module reflection${curriculumReflections.length === 1 ? '' : 's'} saved` : 'Optional reflections can help you remember what shifted as you move through the curriculum.'}
                    </p>
                  </div>
                  <div className="shrink-0 rounded-3xl bg-brand-emerald-50 px-5 py-4 text-center dark:bg-brand-emerald-950/30">
                    <p className="text-3xl font-bold text-brand-emerald-700 dark:text-brand-emerald-100">{curriculumProgress}%</p>
                    <p className="text-xs uppercase tracking-wide text-brand-stone-500 dark:text-slate-500">complete</p>
                  </div>
                </div>
                <div className="mt-5 h-3 overflow-hidden rounded-full bg-brand-stone-100 dark:bg-slate-800">
                  <div className="h-full rounded-full bg-gradient-to-r from-brand-gold-500 to-brand-emerald-600" style={{ width: `${curriculumProgress}%` }} />
                </div>
                <div className="mt-5 flex flex-wrap gap-3">
                  <Link to={currentModule?.id ? `/curriculum/module/${currentModule.id}` : '/curriculum'} className="btn-sanctuary-primary">{curriculumSummary?.assignedModule ? 'Open Assigned Module' : currentModule?.id ? 'Continue Module' : 'Start Module'} <ArrowRight className="h-4 w-4" /></Link>
                  <Link to="/curriculum" className="btn-sanctuary-secondary">View Full Curriculum</Link>
                </div>
              </div>
            </div>
            <div className="rounded-[2rem] border border-white/70 bg-white/70 p-5 dark:border-slate-800 dark:bg-slate-900/45">
              <h3 className="font-semibold text-brand-stone-900 dark:text-slate-100">IFS Path at a glance</h3>
              <div className="mt-4 space-y-3 text-sm text-brand-stone-600 dark:text-slate-400">
                <p><span className="font-semibold text-brand-stone-900 dark:text-slate-100">Modules:</span> {curriculumSummary ? `${curriculumSummary.completedCount} of ${curriculumSummary.totalModules} complete` : 'Ready to begin'}</p>
                <p><span className="font-semibold text-brand-stone-900 dark:text-slate-100">Assessment:</span> {hasWoundAssessment || assessmentSummary.interactiveAssessments.length ? 'Available for personalization' : 'Not completed yet'}</p>
                <p><span className="font-semibold text-brand-stone-900 dark:text-slate-100">Inner System Map:</span> {hasInnerSystemProgress ? 'Started' : 'Ready to begin'}</p>
                <p><span className="font-semibold text-brand-stone-900 dark:text-slate-100">Journal/reflections:</span> {assessmentSummary.journalCount ? 'Started' : 'Ready to begin'}</p>
                <p><span className="font-semibold text-brand-stone-900 dark:text-slate-100">Curriculum reflections:</span> {curriculumReflections.length ? `${curriculumReflections.length} Module Reflection${curriculumReflections.length === 1 ? '' : 's'} saved${latestCurriculumReflection ? ` · Latest: ${latestCurriculumReflection.moduleTitle}` : ''}` : 'Optional reflections can help you remember what shifted as you move through the curriculum.'}</p>
                <p><span className="font-semibold text-brand-stone-900 dark:text-slate-100">Daily-life reflections:</span> {lifeReflectionCount ? `${lifeReflectionCount} saved` : 'Ready when daily life brings something up'}</p>
                <p><span className="font-semibold text-brand-stone-900 dark:text-slate-100">Assigned IFS Practices:</span> {assignedPracticeCount || 'None active'}</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="mb-14">
        <SectionHeader title="My Assessments & Progress" subtitle="Your assessments help personalize how the curriculum supports your parts work. Review patterns, progress, parts work, and Advisor-guided practices without over-focusing on scores." />
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
          {assessmentProgressTiles.map((tile) => <ClientHomeTile key={tile.title} {...tile} />)}
        </div>
      </section>

      <section className="mb-14">
        <SectionHeader title="Tools to Support Your IFS Path" subtitle="Use these when a module invites reflection, parts work, grounding, or deeper understanding." />
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
          {curriculumSupportTiles.map((tile) => <ClientHomeTile key={tile.title} {...tile} />)}
        </div>
      </section>

      <section className="mb-14">
        <SectionHeader title="Life Integration" subtitle="Use these short Daily Life Practice tools between modules and outside the app. They support your IFS Path without replacing it." />
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
          {lifeIntegrationTiles.map((tile) => <ClientHomeTile key={tile.title} {...tile} />)}
        </div>
      </section>

      <section className="mb-14 opacity-95">
        <SectionHeader title="Advisor-Guided Support" subtitle="Advisor support is here when you choose to use it, while your IFS self-guidance stays at the center." />
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
          {advisorTiles.map((tile) => <ClientHomeTile key={tile.title} {...tile} />)}
        </div>
        <p className="mt-4 rounded-2xl bg-brand-stone-100 px-4 py-3 text-xs text-brand-stone-600 dark:bg-slate-900/50 dark:text-slate-400">
          This app supports reflection and IFS practice between sessions. It is not monitored for emergencies.
        </p>
      </section>

      <section className="mb-6">
        <RecentActivityFeed limit={3} title="Recent Updates" className="mb-6" />
      </section>
    </div>
  );
};

export default Home;
