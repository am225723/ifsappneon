import { useEffect, useState } from 'react';
import { AlertTriangle, RefreshCw, ShieldAlert } from 'lucide-react';
import { supabase } from '../lib/supabase';

async function getAuthHeaders() {
  try {
    const token = await window.Clerk?.session?.getToken?.();
    return token ? { Authorization: `Bearer ${token}` } : {};
  } catch {
    return {};
  }
}

export default function RiskAlertWidget({ therapistId, clients = [], onSelectClient }) {
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const loadAlerts = async () => {
    if (!therapistId) return;
    setLoading(true);
    setError('');
    try {
      const response = await fetch(`/api/risk-alerts?therapistId=${encodeURIComponent(therapistId)}`, { headers: await getAuthHeaders() });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload?.error?.message || 'Unable to load risk alerts');
      setAlerts(payload.data || []);
    } catch (err) {
      setError(err.message);
      const fallback = await buildFallbackAlerts(clients);
      setAlerts(fallback);
    }
    setLoading(false);
  };

  useEffect(() => {
    loadAlerts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [therapistId, clients.length]);

  return (
    <section className="mb-8 rounded-3xl border border-amber-300 bg-amber-50/80 p-5 shadow-sm dark:border-amber-700/70 dark:bg-amber-950/20">
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-start gap-3">
          <div className="rounded-2xl bg-amber-200 p-2 text-amber-800 dark:bg-amber-900/60 dark:text-amber-100">
            <ShieldAlert className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-amber-950 dark:text-amber-100">Risk & Escalation Queue</h2>
            <p className="text-sm text-amber-800 dark:text-amber-200">Passive flags from mood logs, inactivity, and pre-session agendas.</p>
          </div>
        </div>
        <button type="button" onClick={loadAlerts} className="inline-flex items-center gap-2 rounded-xl border border-amber-300 bg-white/70 px-3 py-2 text-xs font-semibold text-amber-800 hover:bg-white dark:border-amber-700 dark:bg-slate-900/50 dark:text-amber-100">
          <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      <div className="mb-4 rounded-2xl border border-red-200 bg-white p-3 text-sm font-medium text-red-700 dark:border-red-900/60 dark:bg-slate-950/40 dark:text-red-200">
        Note: This is a passive monitoring tool, not a 24/7 emergency response system. Always follow standard clinical safety protocols.
      </div>

      {error && <p className="mb-3 text-xs text-amber-700 dark:text-amber-200">Showing local fallback alerts because the risk API could not load: {error}</p>}

      {alerts.length === 0 ? (
        <div className="rounded-2xl border border-emerald-200 bg-white/80 p-4 text-sm text-emerald-700 dark:border-emerald-900/50 dark:bg-slate-950/30 dark:text-emerald-200">
          No clients currently meet the passive risk criteria.
        </div>
      ) : (
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {alerts.map((alert) => (
            <button
              key={alert.client_id}
              type="button"
              onClick={() => onSelectClient?.(alert.client_id)}
              className="rounded-2xl border-l-4 border-red-500 bg-white p-4 text-left shadow-sm transition hover:-translate-y-0.5 hover:shadow-md dark:bg-slate-900"
            >
              <div className="mb-2 flex items-center gap-2 text-red-700 dark:text-red-200">
                <AlertTriangle className="h-4 w-4" />
                <span className="font-semibold">{alert.name || 'Client'}</span>
              </div>
              <ul className="space-y-1 text-xs text-slate-600 dark:text-slate-300">
                {(alert.reasons || []).map((reason) => <li key={reason}>• {reason}</li>)}
              </ul>
              {alert.latest_agenda_at && <p className="mt-3 text-[11px] text-slate-400">Latest agenda: {new Date(alert.latest_agenda_at).toLocaleDateString()}</p>}
            </button>
          ))}
        </div>
      )}
    </section>
  );
}

async function buildFallbackAlerts(clients) {
  const clientIds = clients.map(client => client.id).filter(Boolean);
  if (clientIds.length === 0) return [];
  const since = new Date(Date.now() - 7 * 86400000).toISOString();
  const [{ data: moods }, { data: agendas }] = await Promise.all([
    supabase.from('ifs_mood_entries').select('client_id, mood, date').in('client_id', clientIds).gte('date', since).order('date', { ascending: false }),
    supabase.from('ifs_session_agendas').select('client_id, topics, stuck_points, created_at').in('client_id', clientIds).order('created_at', { ascending: false }),
  ]);

  return clients.map(client => {
    const reasons = [];
    const lowMood = (moods || []).find(entry => entry.client_id === client.id && entry.mood <= 2);
    if (lowMood) reasons.push(`Mood score ${lowMood.mood}/5 in the last 7 days`);
    if (!client.lastActive || Date.now() - new Date(client.lastActive).getTime() >= 7 * 86400000) reasons.push('7+ days without login or module progress');
    const latestAgenda = (agendas || []).find(agenda => agenda.client_id === client.id);
    const agendaText = `${latestAgenda?.topics || ''} ${latestAgenda?.stuck_points || ''}`.toLowerCase();
    if (agendaText.includes('stuck')) reasons.push('Latest pre-session agenda mentions “stuck”');
    if (agendaText.includes('crisis')) reasons.push('Latest pre-session agenda mentions “crisis”');
    return reasons.length ? { client_id: client.id, name: client.name, latest_agenda_at: latestAgenda?.created_at, reasons } : null;
  }).filter(Boolean);
}
