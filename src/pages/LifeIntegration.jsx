import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, CalendarDays, Heart, ShieldCheck, Sparkles } from 'lucide-react';
import { loadLifeIntegrationReflections } from '../lib/lifeIntegration';
import { normalizeLifeReflection } from '../lib/lifeIntegrationDisplay';
import { practiceCards } from '../components/life/practiceConfig';

function ReflectionCard({ reflection }) {
  const normalized = normalizeLifeReflection(reflection);

  return (
    <Link to={normalized.detailRoute} className="block rounded-3xl border border-brand-stone-100 bg-white/80 p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md dark:border-slate-800 dark:bg-slate-900/50">
      <div className="mb-3 flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-brand-gold-700 dark:text-brand-gold-500">{normalized.label}</p>
          <h3 className="mt-2 text-lg font-semibold text-brand-stone-900 dark:text-slate-100">{normalized.summary}</h3>
        </div>
        <span className={`shrink-0 rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide ${reflection.archived_at ? 'bg-brand-stone-100 text-brand-stone-600 dark:bg-slate-800 dark:text-slate-300' : normalized.isSharedWithAdvisor ? 'bg-brand-emerald-50 text-brand-emerald-700 dark:bg-brand-emerald-950/30 dark:text-brand-emerald-100' : 'bg-brand-stone-100 text-brand-stone-600 dark:bg-slate-800 dark:text-slate-300'}`}>
          {reflection.archived_at ? 'Archived' : normalized.privacyLabel}
        </span>
      </div>
      <div className="flex flex-wrap gap-2 text-xs text-brand-stone-500 dark:text-slate-500">
        <span className="inline-flex items-center gap-1"><CalendarDays className="h-3.5 w-3.5" /> {new Date(reflection.created_at).toLocaleDateString()}</span>
        {normalized.linkedPartName && <span>Linked part: {normalized.linkedPartName}</span>}
        <span className="inline-flex items-center gap-1 text-brand-gold-700 dark:text-brand-gold-500">View / Continue <ArrowRight className="h-3.5 w-3.5" /></span>
      </div>
    </Link>
  );
}

export default function LifeIntegration() {
  const [reflections, setReflections] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const loadReflections = async () => {
      setLoading(true);
      const { data, error: loadError } = await loadLifeIntegrationReflections();
      if (loadError) setError(loadError.message || 'Unable to load recent reflections.');
      else setReflections(data || []);
      setLoading(false);
    };
    loadReflections();
  }, []);

  return (
    <main className="min-h-screen bg-brand-sanctuary px-4 py-8 dark:bg-brand-midnight sm:px-6 lg:px-8">
      <div className="mx-auto max-w-6xl">
        <section className="relative overflow-hidden rounded-[2rem] border border-brand-gold-100 bg-gradient-to-br from-white via-brand-gold-50/70 to-brand-emerald-50 p-8 shadow-2xl shadow-brand-gold-500/10 dark:border-slate-800 dark:from-brand-cardDark dark:via-brand-gold-950/20 dark:to-brand-emerald-950/20 lg:p-12">
          <div className="absolute -right-16 -top-16 h-48 w-48 rounded-full bg-brand-gold-100/70 blur-3xl dark:bg-brand-gold-900/20" />
          <div className="relative max-w-3xl">
            <p className="mb-4 text-xs font-bold uppercase tracking-[0.28em] text-brand-emerald-700 dark:text-brand-emerald-100">Life Integration Toolkit</p>
            <h1 className="text-5xl font-serif font-normal text-brand-stone-900 dark:text-slate-100">IFS in Daily Life</h1>
            <p className="mt-4 text-lg leading-relaxed text-brand-stone-600 dark:text-slate-400">Practice noticing parts, unblending, and returning to Self-energy in real moments.</p>
            <p className="mt-3 text-base leading-relaxed text-brand-stone-600 dark:text-slate-400">Use these short practices when something comes up in daily life. They are here to support your IFS Path, not replace it.</p>
            <div className="mt-6 flex flex-wrap gap-3 text-sm text-brand-stone-600 dark:text-slate-400">
              <span className="rounded-full bg-white/80 px-4 py-2 shadow-sm dark:bg-slate-900/60">There is no right way to do this.</span>
              <span className="rounded-full bg-white/80 px-4 py-2 shadow-sm dark:bg-slate-900/60">Go gently. You can stop at any time.</span>
            </div>
          </div>
        </section>

        <section className="mt-10">
          <div className="mb-6 flex items-end justify-between gap-4">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.22em] text-brand-gold-700 dark:text-brand-gold-500">Start a practice</p>
              <h2 className="mt-2 text-3xl font-serif font-normal text-brand-stone-900 dark:text-slate-100">Small IFS supports for real moments</h2>
            </div>
          </div>
          <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
            {practiceCards.map((practice) => (
              <Link key={practice.type} to={practice.route} className="soft-card-interactive group flex h-full flex-col justify-between p-6">
                <div>
                  <div className="mb-5 flex items-start justify-between gap-3">
                    <div className="flex h-14 w-14 items-center justify-center rounded-3xl bg-brand-gold-50 text-3xl shadow-sm dark:bg-brand-gold-950/30">{practice.icon}</div>
                    <span className="rounded-full bg-brand-stone-100 px-3 py-1 text-[10px] font-bold uppercase tracking-wide text-brand-stone-600 dark:bg-slate-800 dark:text-slate-300">{practice.eyebrow.replace('A ', '')}</span>
                  </div>
                  <h3 className="text-xl font-semibold text-brand-stone-900 dark:text-slate-100">{practice.title}</h3>
                  <p className="mt-3 text-sm leading-relaxed text-brand-stone-600 dark:text-slate-400">{practice.description}</p>
                </div>
                <span className="mt-6 inline-flex items-center gap-2 text-sm font-bold text-brand-gold-700 dark:text-brand-gold-500">Begin gently <ArrowRight className="h-4 w-4 transition group-hover:translate-x-1" /></span>
              </Link>
            ))}
          </div>
        </section>

        <section className="mt-12 grid gap-8 lg:grid-cols-[1fr_0.65fr]">
          <div>
            <div className="mb-5 flex items-center justify-between gap-4">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.22em] text-brand-gold-700 dark:text-brand-gold-500">Recent reflections</p>
                <h2 className="mt-2 text-3xl font-serif font-normal text-brand-stone-900 dark:text-slate-100">What you have noticed lately</h2>
              </div>
            </div>

            {loading && <div className="soft-card p-6 text-sm text-brand-stone-600 dark:text-slate-400">Loading your recent Life Integration reflections…</div>}
            {error && <div className="rounded-3xl bg-red-50 p-5 text-sm text-red-700 dark:bg-red-950/20 dark:text-red-300">{error}</div>}
            {!loading && !error && reflections.length === 0 && (
              <div className="soft-card p-8 text-center">
                <Sparkles className="mx-auto mb-3 h-8 w-8 text-brand-gold-700 dark:text-brand-gold-500" />
                <h3 className="text-xl font-semibold text-brand-stone-900 dark:text-slate-100">No saved reflections yet</h3>
                <p className="mt-2 text-sm text-brand-stone-600 dark:text-slate-400">Your daily-life reflections will appear here after you save them.</p>
              </div>
            )}
            <div className="grid gap-4 md:grid-cols-2">
              {reflections.slice(0, 6).map((reflection) => <ReflectionCard key={reflection.id} reflection={reflection} />)}
            </div>
          </div>

          <aside className="space-y-4">
            <div className="soft-card bg-white/85 p-6 dark:bg-brand-cardDark/90">
              <ShieldCheck className="mb-3 h-6 w-6 text-brand-emerald-700 dark:text-brand-emerald-100" />
              <h3 className="text-xl font-semibold text-brand-stone-900 dark:text-slate-100">Visible to Advisor</h3>
              <p className="mt-2 text-sm leading-relaxed text-brand-stone-600 dark:text-slate-400">Your Advisor can review saved reflections to support your work together.</p>
            </div>
            <div className="soft-card bg-white/85 p-6 dark:bg-brand-cardDark/90">
              <ShieldCheck className="mb-3 h-6 w-6 text-brand-gold-700 dark:text-brand-gold-500" />
              <h3 className="text-xl font-semibold text-brand-stone-900 dark:text-slate-100">Gentle boundary</h3>
              <p className="mt-2 text-sm leading-relaxed text-brand-stone-600 dark:text-slate-400">This space supports reflection and IFS practice between sessions. It is not monitored for emergencies.</p>
              <p className="mt-3 text-xs leading-relaxed text-brand-stone-500 dark:text-slate-500">If you are in immediate danger or may harm yourself or someone else, call 911 or your local crisis line now.</p>
            </div>
            <div className="soft-card bg-brand-emerald-50/70 p-6 dark:bg-brand-emerald-950/20">
              <Heart className="mb-3 h-6 w-6 text-brand-emerald-700 dark:text-brand-emerald-100" />
              <p className="text-sm leading-relaxed text-brand-stone-700 dark:text-slate-300">A reflection can be one sentence, one word, or simply a pause. Your inner system gets to move at its own pace.</p>
            </div>
            <div className="soft-card bg-white/85 p-6 dark:bg-brand-cardDark/90">
              <h3 className="text-xl font-semibold text-brand-stone-900 dark:text-slate-100">Connect with your existing tools</h3>
              <div className="mt-4 flex flex-col gap-2 text-sm font-semibold">
                <Link to="/curriculum" className="rounded-2xl bg-brand-emerald-50 px-4 py-3 text-brand-emerald-700 transition hover:bg-brand-emerald-100 dark:bg-brand-emerald-950/30 dark:text-brand-emerald-100">Continue Curriculum / IFS Path</Link>
                <Link to="/journal" className="rounded-2xl bg-brand-gold-50 px-4 py-3 text-brand-gold-700 transition hover:bg-brand-gold-100 dark:bg-brand-gold-950/30 dark:text-brand-gold-500">Open Journal</Link>
                <Link to="/parts-relationships" className="rounded-2xl bg-white px-4 py-3 text-brand-stone-700 transition hover:bg-brand-stone-50 dark:bg-slate-900/50 dark:text-slate-200 dark:hover:bg-slate-800">Open Inner System Map</Link>
                <Link to="/parts-dialogue" className="rounded-2xl bg-white px-4 py-3 text-brand-stone-700 transition hover:bg-brand-stone-50 dark:bg-slate-900/50 dark:text-slate-200 dark:hover:bg-slate-800">Start Parts Dialogue</Link>
                <Link to="/meditation" className="rounded-2xl bg-white px-4 py-3 text-brand-stone-700 transition hover:bg-brand-stone-50 dark:bg-slate-900/50 dark:text-slate-200 dark:hover:bg-slate-800">Guided Meditation</Link>
                <Link to="/healing-timeline" className="rounded-2xl bg-white px-4 py-3 text-brand-stone-700 transition hover:bg-brand-stone-50 dark:bg-slate-900/50 dark:text-slate-200 dark:hover:bg-slate-800">View Healing Timeline</Link>
              </div>
            </div>
          </aside>
        </section>
      </div>
    </main>
  );
}
