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
  ShieldCheck
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { loadClientSessionAgendas } from '../lib/sessionAgendas';
import { loadActiveTreatmentPlansForClient } from '../lib/treatmentPlans';
import { getActiveLiveSessionForClient } from '../lib/liveSession';
import { loadAssignedHomeworkForClient } from '../lib/assignedHomework';
import { LIFE_REFLECTION_TYPES, loadLifeIntegrationReflections } from '../lib/lifeIntegration';
import { loadHealingTimeline } from '../lib/healingTimeline';
import RecentActivityFeed from '../components/RecentActivityFeed';

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

const Home = ({ clientId, client }) => {
  const navigate = useNavigate();
  const [savedAssessment, setSavedAssessment] = useState(null);
  const [loading, setLoading] = useState(true);
  const [agendaSummary, setAgendaSummary] = useState({ lastSubmitted: null, hasDraft: false });
  const [growthGoals, setGrowthGoals] = useState([]);
  const [activeLiveSession, setActiveLiveSession] = useState(null);
  const [activeAssignedPractice, setActiveAssignedPractice] = useState(null);
  const [recentLifeReflection, setRecentLifeReflection] = useState(null);
  const [latestMilestone, setLatestMilestone] = useState(null);

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

          const [agendasResult, goalsResult, assignedResult, reflectionsResult, timelineResult] = await Promise.all([
            loadClientSessionAgendas(clientId),
            loadActiveTreatmentPlansForClient(clientId),
            loadAssignedHomeworkForClient(clientId),
            loadLifeIntegrationReflections(),
            loadHealingTimeline({ clientId, range: 'ALL' })
          ]);
          const agendas = agendasResult.data || [];
          setGrowthGoals((goalsResult.data || []).filter((goal) => ['active', 'completed'].includes(goal.status)).slice(0, 3));
          setAgendaSummary({
            lastSubmitted: agendas.find((agenda) => agenda.status === 'submitted' || agenda.status === 'reviewed')?.created_at || null,
            hasDraft: agendas.some((agenda) => agenda.status === 'draft')
          });
          setActiveAssignedPractice((assignedResult.data || []).find((item) => ['assigned', 'in_progress'].includes(item.status)) || null);
          setRecentLifeReflection((reflectionsResult.data || [])[0] || null);
          setLatestMilestone((timelineResult.data?.timeline || [])[0] || null);

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

  const todayTiles = [
    gentleFocus,
    { to: '/life-integration/return-to-self', icon: Sun, title: 'Return to Self-energy', description: 'Reconnect with calm, clarity, compassion, curiosity, courage, and connectedness.', buttonLabel: 'Return to Self', tone: 'gold' },
    { to: '/life-integration', icon: Sparkles, title: 'Practice IFS in daily life', description: 'Bring parts awareness into work, home, school, relationships, and daily stress.', buttonLabel: 'Open Daily Life', tone: 'stone' },
    { to: '/journal', icon: BookOpen, title: 'Reflect in your journal', description: 'Make space for parts, needs, and insights without pressure to perform.', buttonLabel: 'Open Journal', tone: 'emerald' }
  ];

  const innerSystemTiles = [
    { to: '/parts-mapping', icon: Compass, title: 'Parts / Inner System Map', description: 'Explore the parts of you that are showing up and build a more compassionate relationship with your inner system.', buttonLabel: 'Open Parts Map', tone: 'emerald' },
    { to: '/daily-checkin', icon: HeartPulse, title: 'Part Check-In', description: 'Notice which parts are present today and what they may be trying to help with.', buttonLabel: 'Check In', tone: 'gold' },
    { to: '/life-integration/notice-part', icon: Smile, title: 'Notice a Part in the Moment', description: 'Pause in a real-life moment and listen inward with curiosity.', buttonLabel: 'Notice a Part', tone: 'stone' },
    { to: '/life-integration/protector-check-in', icon: ShieldCheck, title: 'Protector Check-In', description: 'Appreciate a protector and ask what it needs from you today.', buttonLabel: 'Meet a Protector', tone: 'emerald' }
  ];

  const selfEnergyTiles = [
    { to: '/life-integration/return-to-self', icon: Sun, title: 'Return to Self-Energy', description: 'Use a short unblending practice to reconnect with calm, clarity, compassion, curiosity, courage, and connectedness.', buttonLabel: 'Begin Practice', tone: 'gold' },
    { to: '/exercises', icon: Play, title: 'Guided Practice Library', description: 'Choose a meditation or exercise that supports Self-energy and inner leadership.', buttonLabel: 'Choose Practice', tone: 'emerald' },
    { to: '/qualities', icon: Sparkles, title: "Qualities of Self", description: "Explore the 8 C's and 5 P's as gentle anchors for your day.", buttonLabel: 'Explore Qualities', tone: 'stone' }
  ];

  const dailyLifeTiles = [
    { to: '/life-integration/notice-part', icon: Smile, title: 'Notice a Part in the Moment', description: 'Pause and identify which part is showing up right now.', buttonLabel: 'Notice a Part', tone: 'emerald' },
    { to: '/life-integration/return-to-self', icon: ShieldCheck, title: 'Return to Self-Energy', description: 'Use a short unblending practice to reconnect with Self.', buttonLabel: 'Return to Self', tone: 'gold' },
    { to: '/life-integration/trigger-reflection', icon: BookOpen, title: 'Reflect on a Trigger', description: 'Explore what happened, which parts reacted, and what they may need.', buttonLabel: 'Reflect', tone: 'stone' },
    { to: '/life-integration/repair-after-conflict', icon: Heart, title: 'Repair After Conflict', description: 'Use IFS to understand your reaction and move toward repair.', buttonLabel: 'Start Repair Reflection', tone: 'emerald' },
    { to: '/life-integration/protector-check-in', icon: ShieldCheck, title: 'Protector Check-In', description: 'Appreciate a protector and ask what it needs from you today.', buttonLabel: 'Check In', tone: 'gold' },
    { to: '/life-integration/needs-boundaries', icon: Sparkles, title: 'Needs & Boundaries Reflection', description: 'Listen for the need beneath tension and choose a clear next step.', buttonLabel: 'Reflect', tone: 'stone' }
  ];

  const journalTiles = [
    { to: '/journal', icon: BookOpen, title: 'Healing Journal', description: 'Write freely about parts, needs, feelings, and moments of insight.', buttonLabel: 'Open Journal', tone: 'emerald' },
    { to: '/life-integration', icon: Feather, title: 'Life Integration Reflections', description: 'Review private-by-default reflections from daily-life IFS practices.', buttonLabel: 'View Reflections', tone: 'gold' },
    { to: '/weekly-reflection', icon: CalendarCheck, title: 'Weekly Reflection', description: 'Look back gently and notice what shifted without turning growth into pressure.', buttonLabel: 'Reflect on Week', tone: 'stone' }
  ];

  const healingTiles = [
    { to: '/healing-timeline', icon: Trophy, title: 'My Healing Timeline', description: 'Notice your growth without turning healing into pressure.', buttonLabel: 'View Timeline', tone: 'gold' },
    { to: '/progress-timeline', icon: CheckCircle2, title: 'My Growth Goals', description: 'Review the goals you and your Advisor are supporting over time.', buttonLabel: 'View Goals', tone: 'emerald' }
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

      <section className="mb-16 text-center lg:flex lg:items-center lg:justify-between lg:text-left">
        <div className="max-w-2xl">
          <p className="mb-4 text-xs font-bold uppercase tracking-[0.28em] text-brand-emerald-700 dark:text-brand-emerald-100">The Luminous Self</p>
          <h1 className="mb-4 text-4xl font-normal text-brand-stone-900 dark:text-slate-100 lg:text-6xl">
            Welcome back to your inner work
          </h1>
          <p className="mb-8 text-lg leading-relaxed text-brand-stone-600 dark:text-slate-400">
            Check in with your parts, return to Self-energy, and bring IFS into daily life.
          </p>
          <div className="flex flex-col justify-center gap-4 sm:flex-row lg:justify-start">
            <button onClick={() => navigate('/daily-checkin')} className="btn-sanctuary-primary justify-center">
              <Sun className="h-5 w-5" />
              Begin Today's Check-In
            </button>
            {!savedAssessment && (
              <button onClick={() => navigate('/assessments')} className="btn-sanctuary-secondary justify-center">
                <Brain className="h-5 w-5" />
                Explore Core Wounds
              </button>
            )}
          </div>
          <div className="mt-5 flex flex-wrap justify-center gap-2 text-xs lg:justify-start">
            <span className="rounded-full bg-white/80 px-3 py-1 font-semibold text-brand-emerald-700 shadow-sm dark:bg-slate-900/60 dark:text-brand-emerald-100">IFS-first self-guidance</span>
            {activeAssignedPractice && <span className="rounded-full bg-brand-gold-50 px-3 py-1 font-semibold text-brand-gold-700 dark:bg-brand-gold-950/30 dark:text-brand-gold-500">Advisor-guided practice ready</span>}
            {activeLiveSession && <span className="rounded-full bg-brand-emerald-600 px-3 py-1 font-semibold text-white">Advisor-guided practice available</span>}
          </div>
        </div>
        <div className="mt-10 hidden lg:block">
          <div className="relative flex h-56 w-56 items-center justify-center rounded-full border border-brand-gold-100 bg-gradient-to-br from-white to-brand-gold-50 shadow-2xl shadow-brand-gold-500/10 dark:border-brand-gold-900/30 dark:from-brand-cardDark dark:to-brand-gold-950/20">
            <Sun className="h-20 w-20 text-brand-gold-600" />
            <div className="absolute -right-5 top-8 h-16 w-16 rounded-full bg-brand-emerald-100/70 blur-2xl" />
          </div>
        </div>
      </section>

      <section className="mb-14">
        <SectionHeader title="Today's IFS Focus" subtitle="One gentle next step for noticing parts, unblending, and returning to Self-energy today." />
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
          {todayTiles.map((tile) => <ClientHomeTile key={tile.title} {...tile} />)}
        </div>
      </section>

      <section className="mb-14">
        <SectionHeader title="My Inner System" subtitle="Explore the parts of you that are showing up and build a more compassionate relationship with your inner system." />
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
          {innerSystemTiles.map((tile) => <ClientHomeTile key={tile.title} {...tile} />)}
        </div>
      </section>

      <section className="mb-14">
        <SectionHeader title="Self-Energy Practice" subtitle="Practice calm, clarity, compassion, curiosity, courage, and connectedness as gentle anchors for your day." />
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
          {selfEnergyTiles.map((tile) => <ClientHomeTile key={tile.title} {...tile} />)}
        </div>
      </section>

      <section className="mb-14">
        <div className="rounded-[2rem] border border-brand-gold-100 bg-gradient-to-br from-white via-brand-gold-50/60 to-brand-emerald-50 p-6 shadow-premium dark:border-slate-800 dark:from-brand-cardDark dark:via-brand-gold-950/20 dark:to-brand-emerald-950/20 lg:p-8">
          <SectionHeader eyebrow="Life Integration" title="IFS in Daily Life" subtitle="Bring IFS into real moments at work, home, school, relationships, and daily stress." />
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
            {dailyLifeTiles.map((tile) => <ClientHomeTile key={tile.title} {...tile} />)}
          </div>
          <Link to="/life-integration" className="mt-6 inline-flex items-center gap-2 text-sm font-bold text-brand-gold-700 dark:text-brand-gold-500">
            Open the Life Integration Toolkit <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </section>

      <section className="mb-14">
        <SectionHeader title="Journal / Reflection" subtitle="Give your parts room to be heard. Reflections stay private by default unless you choose to share one with your Advisor." />
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
          {journalTiles.map((tile) => <ClientHomeTile key={tile.title} {...tile} />)}
        </div>
      </section>

      <section className="mb-14">
        <SectionHeader title="My Healing Timeline" subtitle="Notice your growth without turning healing into pressure." />
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          {healingTiles.map((tile) => <ClientHomeTile key={tile.title} {...tile} />)}
        </div>

        {growthGoals.length > 0 && (
          <div className="soft-card mt-6 border border-brand-emerald-100 bg-white/80 p-6 dark:bg-brand-cardDark">
            <div className="mb-4 flex items-start justify-between gap-4">
              <div>
                <h3 className="text-xl font-semibold text-brand-stone-900 dark:text-slate-100">My Growth Goals</h3>
                <p className="mt-1 text-sm text-brand-stone-600 dark:text-slate-400">Client-safe goals you and your Advisor are supporting over time.</p>
              </div>
              <CheckCircle2 className="h-6 w-6 text-brand-emerald-700 dark:text-brand-emerald-100" />
            </div>
            <div className="grid gap-3 md:grid-cols-3">
              {growthGoals.map((goal) => (
                <div key={goal.id} className="rounded-2xl border border-brand-stone-100 p-4 dark:border-slate-800">
                  <div className="mb-2 flex items-center justify-between gap-2">
                    <h4 className="font-semibold text-brand-stone-900 dark:text-slate-100">{goal.goal_title}</h4>
                    <span className="rounded-full bg-brand-emerald-50 px-2 py-0.5 text-[10px] uppercase tracking-wide text-brand-emerald-700">{goal.status}</span>
                  </div>
                  {goal.goal_description && <p className="line-clamp-3 text-sm text-brand-stone-600 dark:text-slate-400">{goal.goal_description}</p>}
                  {goal.review_date && <p className="mt-3 text-xs text-brand-stone-500 dark:text-slate-500">Review date: {new Date(goal.review_date).toLocaleDateString()}</p>}
                </div>
              ))}
            </div>
          </div>
        )}
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
