import { useState, useEffect, createElement } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Heart,
  Brain,
  Play,
  ArrowRight,
  Zap,
  BookOpen,
  Compass,
  Sun,
  BarChart3,
  Smile,
  Library,
  Feather,
  Trophy,
  CalendarCheck,
  CheckCircle2,
  HeartPulse,
  MessageSquare,
  Sparkles,
  RefreshCw,
  ShieldCheck,
  Bell
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { loadClientSessionAgendas } from '../lib/sessionAgendas';
import { loadActiveTreatmentPlansForClient } from '../lib/treatmentPlans';
import { getActiveLiveSessionForClient } from '../lib/liveSession';
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
  const [activeTab, setActiveTab] = useState('anchors');
  const [agendaSummary, setAgendaSummary] = useState({ lastSubmitted: null, hasDraft: false });
  const [growthGoals, setGrowthGoals] = useState([]);
  const [activeLiveSession, setActiveLiveSession] = useState(null);

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

          const [agendasResult, goalsResult] = await Promise.all([
            loadClientSessionAgendas(clientId),
            loadActiveTreatmentPlansForClient(clientId)
          ]);
          const agendas = agendasResult.data || [];
          setGrowthGoals((goalsResult.data || []).filter((goal) => ['active', 'completed'].includes(goal.status)).slice(0, 3));
          setAgendaSummary({
            lastSubmitted: agendas.find((agenda) => agenda.status === 'submitted' || agenda.status === 'reviewed')?.created_at || null,
            hasDraft: agendas.some((agenda) => agenda.status === 'draft')
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

  const todayTiles = [
    { to: '/daily-checkin', icon: HeartPulse, title: "Today's IFS Check-In", description: 'Notice which parts are present and return to Self-energy.', buttonLabel: 'Start Check-In', tone: 'emerald' },
    { to: '/curriculum', icon: Sun, title: 'Continue Your IFS Path', description: 'Pick up where you left off in your guided curriculum.', buttonLabel: 'Resume Module', badge: '42%', progress: 42, tone: 'gold' },
    { to: '/exercises', icon: Sparkles, title: 'Self-Energy Practice', description: 'Strengthen calm, curiosity, compassion, and inner leadership.', buttonLabel: 'Choose Practice', tone: 'stone' }
  ];

  const innerSystemTiles = [
    { to: '/parts-mapping', icon: Compass, title: 'Parts Map', description: 'View and connect with the parts of your inner system.', buttonLabel: 'Open Parts Map', tone: 'emerald' },
    { to: '/parts-dialogue', icon: MessageSquare, title: 'Parts Dialogue', description: 'Listen inward and begin a compassionate conversation with a part.', buttonLabel: 'Start Dialogue', tone: 'gold' },
    { to: '/unburdening', icon: Feather, title: 'Unburdening Practice', description: 'Gently support parts carrying old pain when you feel ready.', buttonLabel: 'Begin Practice', tone: 'stone' }
  ];

  const dailyLifeTiles = [
    { to: '/life-integration/notice-part', icon: Smile, title: 'Notice a Part in the Moment', description: 'Pause and identify which part is showing up right now.', buttonLabel: 'Notice a Part', tone: 'emerald' },
    { to: '/life-integration/return-to-self', icon: ShieldCheck, title: 'Return to Self-Energy', description: 'Use a short unblending practice to reconnect with Self.', buttonLabel: 'Return to Self', tone: 'gold' },
    { to: '/life-integration/trigger-reflection', icon: BookOpen, title: 'Reflect on a Trigger', description: 'Explore what happened, which parts reacted, and what they may need.', buttonLabel: 'Reflect', tone: 'stone' },
    { to: '/life-integration/repair-after-conflict', icon: Heart, title: 'Repair After Conflict', description: 'Use IFS to understand your reaction and move toward repair.', buttonLabel: 'Start Repair Reflection', tone: 'emerald' },
    { to: '/life-integration/protector-check-in', icon: ShieldCheck, title: 'Protector Check-In', description: 'Appreciate a protector and ask what it needs from you today.', buttonLabel: 'Check In', tone: 'gold' },
    { to: '/life-integration/needs-boundaries', icon: Sparkles, title: 'Needs & Boundaries Reflection', description: 'Listen for the need beneath tension and choose a clear next step.', buttonLabel: 'Reflect', tone: 'stone' }
  ];

  const toolCategories = {
    anchors: {
      label: 'Anchors',
      description: 'Nervous system anchors and reflection tools for your current state.',
      items: [
        { to: '/exercises', icon: Play, title: 'Guided Meditation', description: 'Settle your nervous system and practice Self-energy.', buttonLabel: 'Begin Meditation', badge: '10 min', tone: 'gold' },
        { to: '/journal', icon: BookOpen, title: 'Healing Journal', description: 'Reflect on your parts, needs, and moments of insight.', buttonLabel: 'Open Journal', tone: 'emerald' },
        { to: '/affirmations', icon: Heart, title: 'Affirmations', description: 'Receive gentle reminders for healing and inner leadership.', buttonLabel: 'Read Affirmations', tone: 'stone' }
      ]
    },
    resources: {
      label: 'Resources',
      description: 'Reference materials and supportive learning for IFS practice.',
      items: [
        { to: '/resources', icon: Library, title: 'Resource Library', description: 'Deepen your understanding of Internal Family Systems with curated books and videos.', buttonLabel: 'Browse Library', tone: 'emerald' },
        { to: '/cheat-sheet', icon: Zap, title: 'IFS Cheat Sheet', description: "A quick reference guide to the 6 F's, the 8 C's, and the 5 P's of Self-energy.", buttonLabel: 'View Reference', tone: 'gold' },
        { to: '/mood-tracker', icon: BarChart3, title: 'Feelings & Needs Check', description: 'Name what you feel, notice what is needed, and track patterns gently.', buttonLabel: 'Check In', tone: 'stone' }
      ]
    }
  };

  const advisorTiles = [
    { to: '/assigned-practices', icon: BookOpen, title: 'Assigned by My Advisor', description: 'IFS practices and reflections your Advisor has shared with you.', buttonLabel: 'View Assigned Practices', tone: 'gold' },
    { to: '/pre-session-checkin', icon: CalendarCheck, title: 'Advisor Session Check-In', description: 'Share what feels important before your next Advisor session.', buttonLabel: agendaSummary.hasDraft ? 'Continue Check-In' : 'Start Check-In', badge: agendaSummary.lastSubmitted ? `Last ${new Date(agendaSummary.lastSubmitted).toLocaleDateString()}` : null, tone: 'emerald' },
    { to: '/live-session', icon: HeartPulse, title: 'Live Advisor-Guided Practice', description: activeLiveSession ? 'Your Advisor has started a live guided practice.' : 'Join a guided IFS practice when your Advisor starts one.', buttonLabel: activeLiveSession ? 'Join Practice' : 'Check for Guided Practice', badge: activeLiveSession ? 'Active now' : null, tone: activeLiveSession ? 'emerald' : 'stone' },
    { to: '/inbox', icon: MessageSquare, title: 'Messages', description: 'View supportive messages and updates from your Advisor.', buttonLabel: 'Open Messages', tone: 'gold' }
  ];

  const progressTiles = [
    { to: '/healing-timeline', icon: Trophy, title: 'My Healing Timeline', description: 'See milestones from your parts work, check-ins, practices, goals, and reflections.', buttonLabel: 'View Timeline', tone: 'gold' },
    { to: '/progress-timeline', icon: CheckCircle2, title: 'My Growth Goals', description: 'Review the goals you and your Advisor are supporting over time.', buttonLabel: 'View Goals', tone: 'emerald' },
    { to: '/weekly-reflection', icon: RefreshCw, title: 'Weekly Reflection', description: 'Look back gently and notice what changed this week.', buttonLabel: 'Reflect on Week', tone: 'stone' }
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
            Hello, <span className="font-serif italic text-brand-gold-700 dark:text-brand-gold-500">{client?.name?.split(' ')[0] || 'friend'}</span>
          </h1>
          <p className="mb-8 text-lg leading-relaxed text-brand-stone-600 dark:text-slate-400">
            Your internal world is a sacred space. Take a slow breath and choose a trailhead for today's healing.
          </p>
          <div className="flex flex-col justify-center gap-4 sm:flex-row lg:justify-start">
            <button onClick={() => navigate('/curriculum')} className="btn-sanctuary-primary justify-center">
              <Sun className="h-5 w-5" />
              Continue Your IFS Path
            </button>
            {!savedAssessment && (
              <button onClick={() => navigate('/assessments')} className="btn-sanctuary-secondary justify-center">
                <Brain className="h-5 w-5" />
                Take Wound Assessment
              </button>
            )}
          </div>
          <div className="mt-5 flex flex-wrap justify-center gap-2 text-xs lg:justify-start">
            <span className="rounded-full bg-white/80 px-3 py-1 font-semibold text-brand-emerald-700 shadow-sm dark:bg-slate-900/60 dark:text-brand-emerald-100">4 IFS practices this week</span>
            {agendaSummary.hasDraft && <span className="rounded-full bg-brand-gold-50 px-3 py-1 font-semibold text-brand-gold-700 dark:bg-brand-gold-950/30 dark:text-brand-gold-500">2 reflections waiting</span>}
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
        <SectionHeader title="Today's IFS Focus" subtitle="Begin with the practices that help you notice parts, unblend, and return to Self-energy." />
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
          {todayTiles.map((tile) => <ClientHomeTile key={tile.title} {...tile} />)}
        </div>
      </section>

      <section className="mb-14">
        <SectionHeader title="My Inner System" subtitle="Compassionate tools for mapping, listening to, and supporting the parts of your inner system." />
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
          {innerSystemTiles.map((tile) => <ClientHomeTile key={tile.title} {...tile} />)}
        </div>
      </section>

      <section className="mb-14">
        <SectionHeader title="IFS in Daily Life" subtitle="Practice noticing parts, unblending, and returning to Self-energy in real moments." />
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
          {dailyLifeTiles.map((tile) => <ClientHomeTile key={tile.title} {...tile} />)}
        </div>
      </section>

      <section className="mb-14">
        <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <SectionHeader title="Interactive Suite" subtitle={toolCategories[activeTab].description} />
          <div className="flex rounded-2xl border border-brand-stone-200/50 bg-brand-stone-100 p-1 dark:border-slate-800/60 dark:bg-slate-900">
            {Object.keys(toolCategories).map((key) => (
              <button
                key={key}
                onClick={() => setActiveTab(key)}
                className={`rounded-xl px-5 py-2.5 text-xs font-bold uppercase tracking-wider transition-all ${
                  activeTab === key
                    ? 'bg-white text-brand-gold-700 shadow-sm dark:bg-brand-cardDark dark:text-brand-gold-500'
                    : 'text-brand-stone-500 hover:text-brand-stone-800 dark:text-slate-400 dark:hover:text-slate-100'
                }`}
              >
                {toolCategories[key].label}
              </button>
            ))}
          </div>
        </div>
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
          {toolCategories[activeTab].items.map((tool) => <ClientHomeTile key={tool.title} {...tool} />)}
        </div>
      </section>

      <section className="mb-14">
        <SectionHeader title="My Progress" subtitle="Track growth gently without turning your healing into a metrics dashboard." />
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
          {progressTiles.map((tile) => <ClientHomeTile key={tile.title} {...tile} />)}
        </div>

        {growthGoals.length > 0 && (
          <div className="soft-card mt-6 border border-brand-emerald-100 bg-white/80 p-6 dark:bg-brand-cardDark">
            <div className="mb-4 flex items-start justify-between gap-4">
              <div>
                <h3 className="text-xl font-semibold text-brand-stone-900 dark:text-slate-100">Growth Goals Snapshot</h3>
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

      <section className="mb-14">
        <SectionHeader title="Advisor-Guided Support" subtitle="Shared practices and session tools from your Advisor, when you are working with one." />
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
          {advisorTiles.map((tile) => <ClientHomeTile key={tile.title} {...tile} />)}
        </div>
        <p className="mt-4 rounded-2xl bg-brand-stone-100 px-4 py-3 text-xs text-brand-stone-600 dark:bg-slate-900/50 dark:text-slate-400">
          This app supports reflection and IFS practice between sessions. It is not monitored for emergencies.
        </p>
      </section>

      <section className="mb-6">
        <RecentActivityFeed limit={3} title="Recent Updates" className="mb-6" />
        <div className="soft-card border-none bg-brand-stone-100 p-6 dark:bg-slate-900/40">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div className="flex items-start gap-4">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-brand-gold-50 text-brand-gold-700 dark:bg-brand-gold-950/30 dark:text-brand-gold-500">
                <Bell className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-brand-stone-900 dark:text-slate-100">Recent Updates</h3>
                <p className="mt-1 text-sm text-brand-stone-600 dark:text-slate-400">See new Advisor-guided practices, reminders, and updates.</p>
              </div>
            </div>
            <Link to="/notifications" className="btn-sanctuary-secondary justify-center">View Notifications <ArrowRight className="h-4 w-4" /></Link>
          </div>
        </div>
      </section>
    </div>
  );
};

export default Home;
