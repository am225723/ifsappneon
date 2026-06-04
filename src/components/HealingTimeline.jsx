import { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import {
  ArrowLeft,
  BadgeCheck,
  BookOpen,
  CalendarCheck,
  CalendarDays,
  CheckCircle,
  ClipboardCheck,
  Heart,
  Loader2,
  MessageCircleHeart,
  PenLine,
  PlayCircle,
  Smile,
  Sparkles,
  Target
} from 'lucide-react';
import { loadHealingTimeline } from '../lib/healingTimeline';
import { clientAuth } from '../lib/supabasePersonalization';

const RANGE_OPTIONS = [
  { value: '1M', label: '1M' },
  { value: '3M', label: '3M' },
  { value: '6M', label: '6M' },
  { value: '1Y', label: '1Y' },
  { value: 'ALL', label: 'All' }
];

const ICONS = {
  heart: Heart,
  sparkles: Sparkles,
  'book-open': BookOpen,
  'play-circle': PlayCircle,
  'check-circle': CheckCircle,
  'clipboard-check': ClipboardCheck,
  'calendar-check': CalendarCheck,
  'message-circle-heart': MessageCircleHeart,
  target: Target,
  'badge-check': BadgeCheck,
  'calendar-days': CalendarDays,
  'pen-line': PenLine,
  smile: Smile
};

const TONE_CLASSES = {
  growth: 'bg-emerald-50 text-emerald-700 border-emerald-100 dark:bg-emerald-950/40 dark:text-emerald-200 dark:border-emerald-900/40',
  reflection: 'bg-blue-50 text-blue-700 border-blue-100 dark:bg-blue-950/40 dark:text-blue-200 dark:border-blue-900/40',
  consistency: 'bg-amber-50 text-amber-700 border-amber-100 dark:bg-amber-950/40 dark:text-amber-200 dark:border-amber-900/40',
  completion: 'bg-violet-50 text-violet-700 border-violet-100 dark:bg-violet-950/40 dark:text-violet-200 dark:border-violet-900/40',
  connection: 'bg-rose-50 text-rose-700 border-rose-100 dark:bg-rose-950/40 dark:text-rose-200 dark:border-rose-900/40',
  care: 'bg-brand-gold-50 text-brand-gold-700 border-brand-gold-100 dark:bg-brand-gold-950/40 dark:text-brand-gold-500 dark:border-brand-gold-900/40'
};

const BADGE_LABELS = {
  first_part_created: 'System Mapping',
  part_created: 'Parts Work',
  part_status_progress: 'Goal Progress',
  homework_assigned: 'Support Module',
  homework_started: 'Started Practice',
  homework_completed: 'Module Completed',
  homework_reviewed: 'Reviewed',
  agenda_submitted: 'Prepared for Session',
  agenda_reviewed: 'Shared Care',
  goal_created: 'Care Plan',
  goal_completed: 'Goal Progress',
  goal_review_reached: 'Reflection Point',
  first_journal_entry: 'Reflection',
  journal_entry: 'Reflection',
  mood_checkins: 'Check-In',
  first_module_completed: 'Progress',
  module_progress_completed: 'Progress',
  life_integration_notice_part: 'Life Integration',
  life_integration_return_to_self: 'Life Integration',
  life_integration_trigger_reflection: 'Life Integration',
  life_integration_repair_after_conflict: 'Life Integration',
  life_integration_protector_check_in: 'Life Integration',
  life_integration_needs_boundaries: 'Life Integration'
};

function formatDate(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Recent';
  return new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric', year: 'numeric' }).format(date);
}

function SummaryCard({ label, value, detail, icon: Icon }) {
  return (
    <div className="rounded-2xl border border-brand-stone-100 bg-white/85 p-4 shadow-sm dark:border-slate-800 dark:bg-brand-cardDark/80">
      <div className="flex items-center justify-between gap-3">
        <span className="text-sm font-medium text-brand-stone-600 dark:text-slate-400">{label}</span>
        <Icon className="h-5 w-5 text-brand-gold-700 dark:text-brand-gold-500" />
      </div>
      <p className="mt-3 text-3xl font-semibold text-brand-stone-900 dark:text-slate-100">{value}</p>
      {detail && <p className="mt-1 text-xs text-brand-stone-500 dark:text-slate-500">{detail}</p>}
    </div>
  );
}

function TimelineItem({ item, isLast }) {
  const Icon = ICONS[item.icon] || Sparkles;
  const toneClass = TONE_CLASSES[item.tone] || TONE_CLASSES.growth;

  return (
    <div className="relative grid grid-cols-[auto_1fr] gap-4">
      <div className="flex flex-col items-center">
        <div className={`z-10 flex h-11 w-11 items-center justify-center rounded-2xl border shadow-sm ${toneClass}`}>
          <Icon className="h-5 w-5" />
        </div>
        {!isLast && <div className="mt-3 h-full w-px bg-gradient-to-b from-brand-stone-200 to-transparent dark:from-slate-700" />}
      </div>
      <article className="pb-6">
        <div className="rounded-3xl border border-brand-stone-100 bg-white/90 p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md dark:border-slate-800 dark:bg-brand-cardDark/90">
          <div className="mb-3 flex flex-wrap items-center gap-2 text-xs font-semibold uppercase tracking-wide">
            <span className="text-brand-stone-500 dark:text-slate-500">{formatDate(item.date)}</span>
            <span className="rounded-full bg-brand-stone-100 px-2.5 py-1 text-brand-stone-600 dark:bg-slate-900 dark:text-slate-300">{item.source}</span>
            <span className={`rounded-full border px-2.5 py-1 normal-case tracking-normal ${toneClass}`}>{BADGE_LABELS[item.type] || 'Milestone'}</span>
          </div>
          <h3 className="text-lg font-semibold text-brand-stone-900 dark:text-slate-100">{item.title}</h3>
          <p className="mt-2 text-sm leading-relaxed text-brand-stone-600 dark:text-slate-400">{item.description}</p>
        </div>
      </article>
    </div>
  );
}

function EmptyState({ range }) {
  return (
    <div className="rounded-3xl border border-dashed border-brand-stone-200 bg-white/70 p-10 text-center dark:border-slate-700 dark:bg-brand-cardDark/60">
      <Sparkles className="mx-auto h-10 w-10 text-brand-gold-700 dark:text-brand-gold-500" />
      <h2 className="mt-4 text-xl font-semibold text-brand-stone-900 dark:text-slate-100">Your timeline will grow with you.</h2>
      <p className="mx-auto mt-2 max-w-xl text-sm leading-relaxed text-brand-stone-600 dark:text-slate-400">
        {range === 'ALL'
          ? 'Start with the curriculum or an assessment to begin your IFS path. As you map parts, complete modules, check in, and reflect, gentle milestones will appear here.'
          : 'No milestones appeared in this range. Try widening the range or return after your next reflection, check-in, or module.'}
      </p>
    </div>
  );
}

export default function HealingTimeline() {
  const [searchParams, setSearchParams] = useSearchParams();
  const currentClient = clientAuth.getCurrentClient();
  const [range, setRange] = useState(() => (searchParams.get('range') || 'ALL').toUpperCase());
  const [timelineData, setTimelineData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const controller = new AbortController();

    async function load() {
      if (!currentClient?.id) {
        setError('Sign in to view your healing timeline.');
        setLoading(false);
        return;
      }

      setLoading(true);
      setError('');
      const result = await loadHealingTimeline({ clientId: currentClient.id, range });
      if (controller.signal.aborted) return;
      if (result.error) {
        setError(result.error);
        setTimelineData(null);
      } else {
        setTimelineData(result.data);
      }
      setLoading(false);
    }

    load();
    return () => controller.abort();
  }, [currentClient?.id, range]);

  const summary = timelineData?.summary || {};
  const timeline = useMemo(() => timelineData?.timeline || [], [timelineData]);

  const handleRangeChange = (nextRange) => {
    setRange(nextRange);
    setSearchParams(nextRange === 'ALL' ? {} : { range: nextRange });
  };

  return (
    <main className="min-h-screen bg-brand-sanctuary px-4 py-8 dark:bg-brand-midnight sm:px-6 lg:px-8">
      <div className="mx-auto max-w-5xl">
        <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <Link to="/" className="inline-flex items-center gap-2 text-sm font-semibold text-brand-stone-600 hover:text-brand-gold-700 dark:text-slate-400 dark:hover:text-brand-gold-500">
            <ArrowLeft className="h-4 w-4" /> Back home
          </Link>
          <div className="inline-flex rounded-2xl border border-brand-stone-200 bg-white/80 p-1 shadow-sm dark:border-slate-800 dark:bg-brand-cardDark/80">
            {RANGE_OPTIONS.map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => handleRangeChange(option.value)}
                className={`rounded-xl px-4 py-2 text-sm font-semibold transition ${range === option.value
                  ? 'bg-brand-gold-600 text-white shadow-sm'
                  : 'text-brand-stone-600 hover:bg-brand-stone-100 dark:text-slate-300 dark:hover:bg-slate-900'}`}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>

        <section className="mb-8 overflow-hidden rounded-[2rem] border border-brand-emerald-100 bg-gradient-to-br from-white via-brand-emerald-50/50 to-brand-gold-50/70 p-8 shadow-sm dark:border-slate-800 dark:from-brand-cardDark dark:via-slate-900/60 dark:to-brand-midnight">
          <p className="text-xs font-bold uppercase tracking-[0.28em] text-brand-emerald-700 dark:text-brand-emerald-100">Assessments & Progress</p>
          <h1 className="mt-3 text-4xl font-serif font-normal text-brand-stone-900 dark:text-slate-100">My Healing Timeline</h1>
          <p className="mt-3 max-w-2xl text-base leading-relaxed text-brand-stone-600 dark:text-slate-400">
            A gentle look at your progress, milestones, and moments of engagement over time.
          </p>
        </section>

        <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          <SummaryCard icon={Sparkles} label="Milestones" value={summary.totalMilestones || 0} detail={`Range: ${range === 'ALL' ? 'All time' : range}`} />
          <SummaryCard icon={CheckCircle} label="Modules Completed" value={summary.modulesCompleted || 0} detail="Curriculum modules" />
          <SummaryCard icon={CalendarCheck} label="Check-Ins" value={(summary.checkInsSubmitted || 0) + (summary.moodCheckIns || 0)} detail="Practice and mood check-ins" />
          <SummaryCard icon={Target} label="Growth Milestones" value={summary.goalsCompleted || 0} detail="Supportive milestones" />
          <SummaryCard icon={PenLine} label="Reflections" value={(summary.journalEntries || 0) + (summary.lifeIntegrationReflections || 0)} detail="Journal + Life Integration" />
        </div>

        {loading && (
          <div className="rounded-3xl border border-brand-stone-100 bg-white/80 p-8 text-center text-brand-stone-600 shadow-sm dark:border-slate-800 dark:bg-brand-cardDark/80 dark:text-slate-300">
            <Loader2 className="mx-auto mb-3 h-8 w-8 animate-spin text-brand-gold-700 dark:text-brand-gold-500" />
            Loading your healing timeline…
          </div>
        )}

        {!loading && error && (
          <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-medium text-red-700 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-300">{error}</div>
        )}

        {!loading && !error && timeline.length === 0 && <EmptyState range={range} />}

        {!loading && !error && timeline.length > 0 && (
          <section className="rounded-[2rem] border border-brand-stone-100 bg-white/50 p-5 shadow-sm dark:border-slate-800 dark:bg-brand-cardDark/40 sm:p-7">
            <div className="mb-6 flex items-center justify-between gap-4">
              <div>
                <h2 className="text-2xl font-serif text-brand-stone-900 dark:text-slate-100">Progress moments</h2>
                <p className="text-sm text-brand-stone-600 dark:text-slate-400">Supportive milestones from curriculum, parts work, assessments, Life Integration, and reflections.</p>
              </div>
            </div>
            <div>
              {timeline.map((item, index) => <TimelineItem key={item.id} item={item} isLast={index === timeline.length - 1} />)}
            </div>
          </section>
        )}
      </div>
    </main>
  );
}
