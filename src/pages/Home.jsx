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
import { LIFE_REFLECTION_TYPES, loadLifeIntegrationReflections } from '../lib/lifeIntegration';
import { loadHealingTimeline } from '../lib/healingTimeline';
import RecentActivityFeed from '../components/RecentActivityFeed';
import { curriculumModules, getNextModule } from '../data/curriculumData';

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

const Home = ({ clientId, client, mode = 'home', selfProfileResult = null }) => {
  const navigate = useNavigate();
  const [savedAssessment, setSavedAssessment] = useState(null);
  const [loading, setLoading] = useState(true);
  const [agendaSummary, setAgendaSummary] = useState({ lastSubmitted: null, hasDraft: false });
  const [growthGoals, setGrowthGoals] = useState([]);
  const [activeLiveSession, setActiveLiveSession] = useState(null);
  const [activeAssignedPractice, setActiveAssignedPractice] = useState(null);
  const [recentLifeReflection, setRecentLifeReflection] = useState(null);
  const [latestMilestone, setLatestMilestone] = useState(null);
  const [curriculumSummary, setCurriculumSummary] = useState(null);
  const [assignedPracticeCount, setAssignedPracticeCount] = useState(0);

  useEffect(() => {
    const loadData = async () => {
      if (clientId) {
        try {
          const { data } = await supabase
            .from('ifs_interactive_data')
            .select('data')
            .eq('client_id', clientId)
            .eq('module_id', 'assessment_wounds')
            .maybeSingle();

          if (data?.data) setSavedAssessment(data.data);

          const [agendasResult, goalsResult, assignedResult, reflectionsResult, timelineResult, progressResult] = await Promise.all([
            loadClientSessionAgendas(clientId),
            loadActiveTreatmentPlansForClient(clientId),
            loadAssignedHomeworkForClient(clientId),
            loadLifeIntegrationReflections({ clientId, self: mode === 'my-ifs' }),
            loadHealingTimeline({ clientId, range: 'ALL' }),
            supabase
              .from('ifs_client_progress')
              .select('module_id, completed, current_step, updated_at')
              .eq('client_id', clientId)
          ]);
          const agendas = agendasResult.data || [];
          setGrowthGoals((goalsResult.data || []).filter((goal) => ['active', 'completed'].includes(goal.status)).slice(0, 3));
          setAgendaSummary({
            lastSubmitted: agendas.find((agenda) => agenda.status === 'submitted' || agenda.status === 'reviewed')?.created_at || null,
            hasDraft: agendas.some((agenda) => agenda.status === 'draft')
          });
          const assignedPractices = assignedResult.data || [];
          setAssignedPracticeCount(assignedPractices.filter((item) => ['assigned', 'in_progress'].includes(item.status)).length);
          setActiveAssignedPractice(assignedPractices.find((item) => ['assigned', 'in_progress'].includes(item.status)) || null);
          setRecentLifeReflection((reflectionsResult.data || [])[0] || null);
          setLatestMilestone((timelineResult.data?.timeline || [])[0] || null);

          const progressRows = progressResult.data || [];
          const completedModuleIds = progressRows.filter((row) => row.completed).map((row) => row.module_id);
          const completedCount = completedModuleIds.length;
          const totalModules = curriculumModules.length || 1;
          const nextModule = getNextModule(completedModuleIds) || curriculumModules.find((module) => !completedModuleIds.includes(module.id)) || curriculumModules[0];
          const lastCompletedId = [...progressRows]
            .filter((row) => row.completed)
            .sort((a, b) => new Date(b.updated_at || 0) - new Date(a.updated_at || 0))[0]?.module_id;
          const lastCompletedModule = curriculumModules.find((module) => module.id === lastCompletedId);
          const activeAssignedModuleId = assignedPractices.find((item) => ['assigned', 'in_progress'].includes(item.status) && item.module_id)?.module_id;
          const assignedModule = curriculumModules.find((module) => module.id === activeAssignedModuleId);
          setCurriculumSummary({
            completedCount,
            totalModules,
            percent: Math.round((completedCount / totalModules) * 100),
            nextModule,
            lastCompletedModule,
            assignedModule
          });

          const liveResult = await getActiveLiveSessionForClient();
          if (!liveResult.error) setActiveLiveSession(liveResult.data || null);
        } catch (err) {
          console.error('Error loading home data:', err);
        }
      }
      setLoading(false);
    };

    loadData();
  }, [clientId]);

  const clientFirstName = (client?.name || client?.full_name || '').split(' ').filter(Boolean)[0];
  const assessmentPrimary = savedAssessment?.primaryWound?.name || savedAssessment?.primaryWound?.id || savedAssessment?.topWound?.name || savedAssessment?.topWound?.id || null;
  const curriculumProgress = curriculumSummary?.percent ?? 0;
  const currentModule = curriculumSummary?.assignedModule || curriculumSummary?.nextModule;
  const isMyIFSMode = mode === 'my-ifs';
  const hasSelfData = selfProfileResult?.hasPersonalData !== false;
  const selfDataSignals = selfProfileResult?.dataSignals || [];

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
              description: LIFE_REFLECTION_TYPES[recentLifeReflection.reflection_type] || 'Revisit a Life Integration reflection with curiosity.',
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
    { to: '/assessments', icon: Brain, title: 'Wound Assessment', description: savedAssessment ? 'Review your assessment and how it can personalize your IFS path.' : 'Take the first assessment so the curriculum can better support your parts work.', buttonLabel: 'Take / Review Assessment', badge: savedAssessment ? 'Complete' : 'Start here', tone: savedAssessment ? 'emerald' : 'gold' },
    { to: '/profile', icon: ClipboardCheck, title: 'Assessment Insights', description: assessmentPrimary ? `Your current assessment points to ${assessmentPrimary} themes. Review insights gently.` : 'Your assessments help personalize how the curriculum supports your parts work.', buttonLabel: 'View Insights', tone: 'stone' },
    { to: '/curriculum', icon: BookOpen, title: 'Curriculum Progress', description: curriculumSummary ? `${curriculumSummary.completedCount} of ${curriculumSummary.totalModules} modules completed on your IFS Path.` : 'Start your guided IFS curriculum step by step.', buttonLabel: 'View Progress', progress: curriculumProgress, tone: 'emerald' },
    { to: '/healing-timeline', icon: Trophy, title: 'Healing Timeline', description: latestMilestone?.title || 'Notice milestones, reflections, and growth without turning healing into pressure.', buttonLabel: 'View Timeline', tone: 'gold' },
    { to: '/assigned-practices', icon: CalendarCheck, title: 'Assigned IFS Practices', description: assignedPracticeCount ? `${assignedPracticeCount} Advisor-guided practice${assignedPracticeCount === 1 ? '' : 's'} ready to support your curriculum.` : 'View practices your Advisor shares to support what you are learning.', buttonLabel: 'View Assigned Practices', badge: assignedPracticeCount ? `${assignedPracticeCount} active` : null, tone: 'emerald' },
    { to: '/parts-relationships', icon: Map, title: 'Parts / Inner System Progress', description: 'See how your parts relationships and inner system understanding are unfolding.', buttonLabel: 'View Inner System', tone: 'stone' }
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

  const advisorTiles = [
    { to: '/assigned-practices', icon: BookOpen, title: 'Assigned by My Advisor', description: 'IFS practices and reflections shared by your Advisor.', buttonLabel: 'View Assigned Practices', badge: activeAssignedPractice ? 'Active' : null, tone: 'gold' },
    { to: '/pre-session-checkin', icon: CalendarCheck, title: 'Pre-Session Check-In', description: 'Prepare for your next Advisor session by naming what feels important.', buttonLabel: agendaSummary.hasDraft ? 'Continue Check-In' : 'Start Check-In', badge: agendaSummary.lastSubmitted ? `Last ${new Date(agendaSummary.lastSubmitted).toLocaleDateString()}` : null, tone: 'emerald' },
    { to: '/live-session', icon: HeartPulse, title: 'Live Advisor-Guided Practice', description: activeLiveSession ? 'Your Advisor has started a live guided practice.' : 'Join a guided IFS practice when your Advisor starts one.', buttonLabel: activeLiveSession ? 'Join Practice' : 'Check for Guided Practice', badge: activeLiveSession ? 'Active now' : null, tone: activeLiveSession ? 'emerald' : 'stone' },
    { to: '/inbox', icon: MessageSquare, title: 'Advisor Messages', description: 'View supportive messages and updates from your Advisor.', buttonLabel: 'Open Messages', tone: 'gold' }
  ];

  if (loading) return null;

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

      {isMyIFSMode && (
        <section className="mb-8 rounded-3xl border border-brand-gold-200/70 bg-brand-gold-50/80 p-5 text-sm text-brand-stone-700 dark:border-brand-gold-900/50 dark:bg-brand-gold-950/20 dark:text-slate-300">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.24em] text-brand-gold-700 dark:text-brand-gold-500">My IFS Work</p>
              <p className="mt-1">You are viewing your own IFS path as the authenticated user. Admin/advisor permissions stay available separately.</p>
              {!hasSelfData && (
                <p className="mt-2 font-semibold">No personal IFS records were found yet for this linked profile. Start curriculum or take an assessment to begin, or verify a manual Clerk link if your self-work exists in another row.</p>
              )}
            </div>
            {selfDataSignals.length > 0 && (
              <div className="rounded-2xl bg-white/70 px-4 py-3 text-xs dark:bg-slate-900/50">
                <span className="font-bold">Connected data:</span> {selfDataSignals.join(', ')}
              </div>
            )}
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
                      {curriculumSummary?.assignedModule ? 'Assigned by your Advisor' : curriculumSummary ? 'Next lesson' : 'Warm beginning'}
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
                  <Link to={currentModule?.id ? `/curriculum/module/${currentModule.id}` : '/curriculum'} className="btn-sanctuary-primary">Resume Module <ArrowRight className="h-4 w-4" /></Link>
                  <Link to="/curriculum" className="btn-sanctuary-secondary">View Full Curriculum</Link>
                </div>
              </div>
            </div>
            <div className="rounded-[2rem] border border-white/70 bg-white/70 p-5 dark:border-slate-800 dark:bg-slate-900/45">
              <h3 className="font-semibold text-brand-stone-900 dark:text-slate-100">IFS Path at a glance</h3>
              <div className="mt-4 space-y-3 text-sm text-brand-stone-600 dark:text-slate-400">
                <p><span className="font-semibold text-brand-stone-900 dark:text-slate-100">Modules:</span> {curriculumSummary ? `${curriculumSummary.completedCount} of ${curriculumSummary.totalModules} complete` : 'Ready to begin'}</p>
                <p><span className="font-semibold text-brand-stone-900 dark:text-slate-100">Assessment:</span> {savedAssessment ? 'Available for personalization' : 'Not completed yet'}</p>
                <p><span className="font-semibold text-brand-stone-900 dark:text-slate-100">Assigned IFS Practices:</span> {assignedPracticeCount || 'None active'}</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="mb-14">
        <SectionHeader title="My Assessments & Progress" subtitle="Review your assessment insights and see how they connect to your IFS path. Track your curriculum, reflections, parts work, and Advisor-guided practices." />
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
