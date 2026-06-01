export default function MetricCard({ icon: Icon, label, value, detail, tone = 'amber' }) {
  const tones = {
    amber: 'from-amber-500 to-orange-500',
    emerald: 'from-emerald-500 to-teal-500',
    blue: 'from-blue-500 to-indigo-500',
    rose: 'from-rose-500 to-pink-500',
    slate: 'from-slate-500 to-slate-700'
  };

  return (
    <div className="rounded-2xl border border-brand-stone-200/80 dark:border-slate-700 bg-white/80 dark:bg-slate-900/70 p-5 shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-brand-stone-500 dark:text-slate-400">{label}</p>
          <p className="mt-2 text-3xl font-bold text-brand-stone-900 dark:text-white">{value ?? 0}</p>
          {detail && <p className="mt-1 text-sm text-brand-stone-600 dark:text-slate-400">{detail}</p>}
        </div>
        {Icon && (
          <div className={`rounded-2xl bg-gradient-to-br ${tones[tone] || tones.amber} p-3 text-white shadow-sm`} aria-hidden="true">
            <Icon className="h-5 w-5" />
          </div>
        )}
      </div>
    </div>
  );
}
