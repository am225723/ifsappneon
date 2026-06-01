import { BarChart3 } from 'lucide-react';

export default function EmptyAnalyticsState({ title = 'No analytics data yet', message = 'Data will appear here once the client has matching activity in the selected range.' }) {
  return (
    <div className="rounded-2xl border border-dashed border-brand-stone-300 dark:border-slate-700 bg-brand-stone-50/70 dark:bg-slate-900/40 p-8 text-center">
      <BarChart3 className="mx-auto mb-3 h-10 w-10 text-brand-stone-400 dark:text-slate-500" aria-hidden="true" />
      <h3 className="text-base font-semibold text-brand-stone-900 dark:text-white">{title}</h3>
      <p className="mx-auto mt-2 max-w-md text-sm text-brand-stone-600 dark:text-slate-400">{message}</p>
    </div>
  );
}
