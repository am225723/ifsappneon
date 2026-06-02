import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Bell } from 'lucide-react';
import { loadUnreadNotificationCount } from '../lib/notifications';

const POLL_INTERVAL_MS = 30000;

export default function NotificationBell({ className = '' }) {
  const [count, setCount] = useState(0);

  useEffect(() => {
    let isMounted = true;

    const refresh = async () => {
      const { data, error } = await loadUnreadNotificationCount();
      if (!isMounted) return;
      if (!error) setCount(Number(data) || 0);
    };

    refresh();
    const interval = setInterval(refresh, POLL_INTERVAL_MS);
    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, []);

  return (
    <Link
      to="/notifications"
      className={`relative p-2.5 rounded-xl transition-all text-brand-stone-500 dark:text-slate-400 hover:text-brand-gold-700 dark:hover:text-brand-gold-500 hover:bg-brand-gold-50 dark:hover:bg-slate-800/50 ${className}`}
      title="Notifications"
      aria-label={count > 0 ? `${count} unread notifications` : 'Notifications'}
    >
      <Bell className="w-5 h-5" />
      {count > 0 && (
        <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] flex items-center justify-center text-[10px] font-bold text-white bg-brand-emerald-600 rounded-full px-1">
          {count > 99 ? '99+' : count}
        </span>
      )}
    </Link>
  );
}
