import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Archive, Bell, Check, CheckCheck, Clock, ExternalLink, Inbox, SlidersHorizontal } from 'lucide-react';
import { archiveNotification, loadNotifications, markAllNotificationsRead, markNotificationRead } from '../lib/notifications';

const FILTERS = [
  { id: 'unread', label: 'Unread' },
  { id: 'all', label: 'All' },
  { id: 'archived', label: 'Archived' }
];

const TYPE_LABELS = {
  homework_assigned: 'Assigned Practice',
  homework_started: 'Assigned Practice',
  homework_completed: 'Assigned Practice',
  homework_reviewed: 'Assigned Practice',
  session_agenda_submitted: 'Agenda',
  session_agenda_reviewed: 'Agenda',
  treatment_goal_created: 'Treatment Goal',
  treatment_goal_updated: 'Treatment Goal',
  treatment_goal_completed: 'Treatment Goal',
  live_session_started: 'Live Session',
  live_session_joined: 'Live Session',
  live_session_ended: 'Live Session',
  report_generated: 'Report',
  therapist_note_created: 'Advisor Activity',
  general_update: 'Update'
};

function formatDate(value) {
  if (!value) return 'Just now';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Recently';
  return new Intl.DateTimeFormat(undefined, {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit'
  }).format(date);
}

function safeLinkFor(notification, role) {
  const type = notification.notification_type || '';
  if (type.startsWith('homework_')) return role === 'client' ? '/homework' : '/advisor-homework';
  if (type.startsWith('session_agenda_')) return role === 'client' ? '/pre-session-checkin' : '/therapist-dashboard';
  if (type.startsWith('treatment_goal_')) return role === 'client' ? '/home' : '/treatment-plans';
  if (type.startsWith('live_session_')) return role === 'client' ? '/live-session' : '/live-co-therapy';
  if (type === 'report_generated') return role === 'client' ? null : '/reports';
  if (type === 'therapist_note_created') return role === 'client' ? null : '/therapist-dashboard';
  return null;
}

function sourceLabel(notification, role) {
  if (notification.actor_name) return notification.actor_name;
  if (role === 'client' && notification.therapist_name) return notification.therapist_name;
  if (role !== 'client' && notification.client_name) return notification.client_name;
  return 'The Luminous Self';
}

export default function Notifications({ currentClient }) {
  const [filter, setFilter] = useState('unread');
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const role = currentClient?.user_role || 'client';

  const refresh = useCallback(async () => {
    setLoading(true);
    setError('');
    const { data, error: requestError } = await loadNotifications({
      includeArchived: filter === 'archived',
      filter,
      limit: 75
    });
    if (requestError) {
      setError(requestError.message || 'Unable to load notifications.');
      setNotifications([]);
    } else {
      setNotifications(data || []);
    }
    setLoading(false);
  }, [filter]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const unreadCount = useMemo(() => notifications.filter((item) => !item.read_at && !item.archived_at).length, [notifications]);

  const handleMarkRead = async (notificationId) => {
    const { error } = await markNotificationRead(notificationId);
    if (error) return setError(error.message || 'Unable to mark notification read.');
    refresh();
  };

  const handleMarkAllRead = async () => {
    const { error } = await markAllNotificationsRead();
    if (error) return setError(error.message || 'Unable to mark all notifications read.');
    refresh();
  };

  const handleArchive = async (notificationId) => {
    const { error } = await archiveNotification(notificationId);
    if (error) return setError(error.message || 'Unable to archive notification.');
    refresh();
  };

  return (
    <main className="max-w-4xl mx-auto px-6 py-10">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.25em] text-brand-emerald-700 dark:text-brand-emerald-100 mb-2">Activity Center</p>
          <h1 className="text-3xl font-serif font-semibold text-brand-stone-900 dark:text-slate-100">Notifications</h1>
          <p className="text-sm text-brand-stone-600 dark:text-slate-400 mt-2">Secure in-app updates for your care activity.</p>
        </div>
        <div className="flex flex-col sm:flex-row gap-2">
          <Link to="/notification-preferences" className="px-4 py-2.5 rounded-2xl font-semibold border border-brand-stone-200 dark:border-slate-700 text-brand-stone-700 dark:text-slate-200 bg-white/70 dark:bg-slate-900/60 hover:border-brand-gold-300 inline-flex items-center justify-center gap-2">
            <SlidersHorizontal className="w-4 h-4" />
            Notification Preferences
          </Link>
          <button onClick={handleMarkAllRead} disabled={!unreadCount} className="btn-sanctuary-primary disabled:opacity-50 disabled:cursor-not-allowed">
            <CheckCheck className="w-4 h-4" />
            Mark all read
          </button>
        </div>
      </div>

      <div className="flex gap-2 mb-6 overflow-x-auto">
        {FILTERS.map((item) => (
          <button
            key={item.id}
            onClick={() => setFilter(item.id)}
            className={`px-4 py-2 rounded-full text-sm font-semibold transition-all ${filter === item.id ? 'bg-brand-gold-600 text-white shadow-sm' : 'bg-white/70 dark:bg-slate-900/60 text-brand-stone-600 dark:text-slate-300 border border-brand-stone-200 dark:border-slate-700'}`}
          >
            {item.label}
          </button>
        ))}
      </div>

      {error && (
        <div className="mb-6 rounded-2xl border border-red-200 bg-red-50 text-red-700 px-4 py-3 text-sm dark:bg-red-950/30 dark:border-red-900 dark:text-red-200">
          {error}
        </div>
      )}

      {loading ? (
        <div className="soft-card p-10 text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-brand-gold-600 mx-auto mb-4" />
          <p className="text-sm text-brand-stone-600 dark:text-slate-400">Loading notifications…</p>
        </div>
      ) : notifications.length === 0 ? (
        <div className="soft-card p-10 text-center">
          <Inbox className="w-10 h-10 mx-auto mb-3 text-brand-stone-400 dark:text-slate-500" />
          <h2 className="font-semibold text-brand-stone-900 dark:text-slate-100">No notifications</h2>
          <p className="text-sm text-brand-stone-600 dark:text-slate-400 mt-1">There are no {filter === 'all' ? '' : filter} notifications to show.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {notifications.map((notification) => {
            const unread = !notification.read_at && !notification.archived_at;
            const link = safeLinkFor(notification, role);
            return (
              <article key={notification.id} className={`rounded-3xl border p-5 transition-all ${unread ? 'bg-brand-gold-50/80 border-brand-gold-200 dark:bg-brand-gold-950/20 dark:border-brand-gold-900/50' : 'bg-white/75 border-brand-stone-200 dark:bg-slate-900/60 dark:border-slate-800'}`}>
                <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2 mb-2">
                      <span className="inline-flex items-center gap-1 rounded-full bg-brand-emerald-100 text-brand-emerald-800 dark:bg-brand-emerald-950/50 dark:text-brand-emerald-100 px-2.5 py-1 text-xs font-bold">
                        <Bell className="w-3 h-3" />
                        {TYPE_LABELS[notification.notification_type] || 'Update'}
                      </span>
                      <span className="inline-flex items-center gap-1 text-xs text-brand-stone-500 dark:text-slate-400">
                        <Clock className="w-3 h-3" />
                        {formatDate(notification.created_at)}
                      </span>
                      {unread && <span className="w-2 h-2 rounded-full bg-brand-gold-600" title="Unread" />}
                    </div>
                    <h2 className="text-lg font-semibold text-brand-stone-900 dark:text-slate-100">{notification.title}</h2>
                    {notification.message && <p className="text-sm text-brand-stone-600 dark:text-slate-400 mt-1">{notification.message}</p>}
                    <p className="text-xs text-brand-stone-500 dark:text-slate-500 mt-2">Source: {sourceLabel(notification, role)}</p>
                    {link && (
                      <Link to={link} className="inline-flex items-center gap-1 text-sm font-semibold text-brand-gold-700 dark:text-brand-gold-500 mt-3">
                        Open related page <ExternalLink className="w-3.5 h-3.5" />
                      </Link>
                    )}
                  </div>
                  <div className="flex sm:flex-col gap-2 shrink-0">
                    {!notification.read_at && (
                      <button onClick={() => handleMarkRead(notification.id)} className="px-3 py-2 rounded-xl text-xs font-semibold bg-white dark:bg-slate-800 border border-brand-stone-200 dark:border-slate-700 text-brand-stone-700 dark:text-slate-200 hover:border-brand-gold-300">
                        <Check className="w-4 h-4 inline mr-1" /> Read
                      </button>
                    )}
                    {!notification.archived_at && (
                      <button onClick={() => handleArchive(notification.id)} className="px-3 py-2 rounded-xl text-xs font-semibold bg-white dark:bg-slate-800 border border-brand-stone-200 dark:border-slate-700 text-brand-stone-700 dark:text-slate-200 hover:border-brand-gold-300">
                        <Archive className="w-4 h-4 inline mr-1" /> Archive
                      </button>
                    )}
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </main>
  );
}
