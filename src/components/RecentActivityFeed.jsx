import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Activity, ArrowRight } from 'lucide-react';
import { loadNotifications } from '../lib/notifications';

function formatDate(value) {
  if (!value) return 'Just now';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Recently';
  return new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }).format(date);
}

export default function RecentActivityFeed({ limit = 3, title = 'Recent Activity', className = '' }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    const load = async () => {
      const { data, error } = await loadNotifications({ filter: 'all', limit });
      if (!isMounted) return;
      if (!error) setItems(data || []);
      setLoading(false);
    };
    load();
    return () => {
      isMounted = false;
    };
  }, [limit]);

  return (
    <section className={`soft-card p-6 ${className}`}>
      <div className="flex items-center justify-between gap-4 mb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-brand-gold-50 dark:bg-brand-gold-950/30 flex items-center justify-center text-brand-gold-700 dark:text-brand-gold-500">
            <Activity className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-brand-stone-900 dark:text-slate-100">{title}</h2>
            <p className="text-xs text-brand-stone-500 dark:text-slate-500">Latest secure in-app updates</p>
          </div>
        </div>
        <Link to="/notifications" className="text-sm font-semibold text-brand-gold-700 dark:text-brand-gold-500 inline-flex items-center gap-1">
          View all <ArrowRight className="w-4 h-4" />
        </Link>
      </div>

      {loading ? (
        <p className="text-sm text-brand-stone-500 dark:text-slate-400">Loading activity…</p>
      ) : items.length === 0 ? (
        <p className="text-sm text-brand-stone-500 dark:text-slate-400">No recent notifications yet.</p>
      ) : (
        <div className="space-y-3">
          {items.map((item) => (
            <div key={item.id} className="rounded-2xl border border-brand-stone-200/70 dark:border-slate-800 bg-white/60 dark:bg-slate-900/50 p-3">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-brand-stone-900 dark:text-slate-100 truncate">{item.title}</p>
                  {item.message && <p className="text-xs text-brand-stone-600 dark:text-slate-400 mt-0.5 line-clamp-2">{item.message}</p>}
                </div>
                {!item.read_at && !item.archived_at && <span className="w-2 h-2 rounded-full bg-brand-gold-600 mt-1.5 shrink-0" />}
              </div>
              <p className="text-[11px] text-brand-stone-500 dark:text-slate-500 mt-2">{formatDate(item.created_at)}</p>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
