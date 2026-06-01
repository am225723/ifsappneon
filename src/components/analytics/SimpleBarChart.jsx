import EmptyAnalyticsState from './EmptyAnalyticsState';

export default function SimpleBarChart({ data = [], valueKey = 'count', labelKey = 'label', color = 'bg-emerald-500', title = 'Bar chart' }) {
  const rows = (Array.isArray(data) ? data : []).filter((item) => Number.isFinite(Number(item?.[valueKey])));
  if (!rows.length) return <EmptyAnalyticsState title={`No ${title.toLowerCase()} data`} />;
  const max = Math.max(1, ...rows.map((item) => Number(item[valueKey]) || 0));

  return (
    <div className="space-y-3" role="img" aria-label={title}>
      {rows.map((item, index) => {
        const value = Number(item[valueKey]) || 0;
        const label = item[labelKey] || item.week || `Item ${index + 1}`;
        return (
          <div key={`${label}-${index}`} className="grid grid-cols-[minmax(88px,140px)_1fr_auto] items-center gap-3 text-sm">
            <span className="truncate text-brand-stone-600 dark:text-slate-400" title={label}>{label}</span>
            <div className="h-3 overflow-hidden rounded-full bg-brand-stone-100 dark:bg-slate-800">
              <div className={`h-full rounded-full ${color}`} style={{ width: `${Math.max(4, (value / max) * 100)}%` }} />
            </div>
            <span className="font-semibold text-brand-stone-900 dark:text-white">{value}</span>
          </div>
        );
      })}
    </div>
  );
}
