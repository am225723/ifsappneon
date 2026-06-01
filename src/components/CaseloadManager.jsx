import { useEffect, useState, useCallback } from 'react';
import { Users, RefreshCw, UserPlus, UserCheck, UserX } from 'lucide-react';
import { useTheme } from '../contexts/ThemeContext';
import { clientAuth } from '../lib/supabasePersonalization';
import {
  assignClientToTherapist,
  dischargeClientAssignment,
  loadCaseloadClients,
  reactivateClientAssignment
} from '../lib/therapistAssignments';

export default function CaseloadManager() {
  const { theme } = useTheme();
  const isDark = theme.isDark;
  const therapist = clientAuth.getCurrentClient();
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [clientId, setClientId] = useState('');
  const [message, setMessage] = useState('');
  const [saving, setSaving] = useState(false);

  const textPrimary = isDark ? 'text-white' : 'text-gray-900';
  const textSecondary = isDark ? 'text-slate-300' : 'text-gray-600';
  const cardBg = isDark ? 'bg-slate-800/60' : 'bg-white';
  const cardBorder = isDark ? 'border-slate-700/50' : 'border-gray-200';
  const inputBg = isDark ? 'bg-slate-700 border-slate-600 text-white' : 'bg-white border-gray-300 text-gray-900';

  const loadCaseload = useCallback(async () => {
    setLoading(true);
    const rows = await loadCaseloadClients();
    setClients(rows);
    setLoading(false);
  }, []);

  useEffect(() => { loadCaseload(); }, [loadCaseload]);

  const activeClients = clients.filter((client) => client.assignment_status === 'active');
  const dischargedClients = clients.filter((client) => client.assignment_status !== 'active');

  const handleAssign = async (event) => {
    event.preventDefault();
    if (!therapist?.id || !clientId.trim()) return;
    if (activeClients.some((client) => client.id === clientId.trim())) {
      setMessage('That client is already active in your caseload.');
      return;
    }
    setSaving(true);
    const { error } = await assignClientToTherapist(therapist.id, clientId.trim());
    setMessage(error ? error.message : 'Client assigned to your caseload.');
    setClientId('');
    await loadCaseload();
    setSaving(false);
  };

  const handleStatus = async (client, nextStatus) => {
    if (!therapist?.id) return;
    setSaving(true);
    const action = nextStatus === 'active' ? reactivateClientAssignment : dischargeClientAssignment;
    const { error } = await action(therapist.id, client.id);
    setMessage(error ? error.message : `${client.name || 'Client'} ${nextStatus === 'active' ? 'reactivated' : 'discharged'}.`);
    await loadCaseload();
    setSaving(false);
  };

  const renderClient = (client, discharged = false) => (
    <div key={client.id} className={`flex flex-col gap-3 rounded-xl border ${cardBorder} p-4 sm:flex-row sm:items-center sm:justify-between`}>
      <div>
        <p className={`font-semibold ${textPrimary}`}>{client.name || 'Unnamed client'}</p>
        <p className={`text-xs ${textSecondary}`}>{client.email || client.id}</p>
        <p className={`text-xs ${textSecondary}`}>
          Status: {client.assignment_status || 'active'} · Assigned {client.assigned_at ? new Date(client.assigned_at).toLocaleDateString() : 'date unknown'}
          {client.discharged_at ? ` · Discharged ${new Date(client.discharged_at).toLocaleDateString()}` : ''}
        </p>
      </div>
      <button
        type="button"
        disabled={saving}
        onClick={() => handleStatus(client, discharged ? 'active' : 'discharged')}
        className={`inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold text-white disabled:opacity-50 ${discharged ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-rose-600 hover:bg-rose-700'}`}
      >
        {discharged ? <UserCheck className="h-4 w-4" /> : <UserX className="h-4 w-4" />}
        {discharged ? 'Reactivate' : 'Discharge'}
      </button>
    </div>
  );

  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      <div className="mb-6 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald-600 text-white">
            <Users className="h-5 w-5" />
          </div>
          <div>
            <h1 className={`text-2xl font-bold ${textPrimary}`}>Caseload Manager</h1>
            <p className={`text-sm ${textSecondary}`}>Manage your active and discharged client assignments.</p>
          </div>
        </div>
        <button type="button" onClick={loadCaseload} className="rounded-xl bg-slate-700 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800">
          <RefreshCw className="mr-2 inline h-4 w-4" /> Refresh
        </button>
      </div>

      <form onSubmit={handleAssign} className={`${cardBg} mb-6 rounded-2xl border ${cardBorder} p-5`}>
        <label className={`mb-2 block text-sm font-semibold ${textPrimary}`}>Assign existing client by internal client UUID</label>
        <div className="flex flex-col gap-3 sm:flex-row">
          <input
            value={clientId}
            onChange={(event) => setClientId(event.target.value)}
            placeholder="ifs_clients.id UUID"
            className={`flex-1 rounded-xl border px-4 py-3 text-sm ${inputBg}`}
          />
          <button type="submit" disabled={saving || !clientId.trim()} className="rounded-xl bg-emerald-600 px-5 py-3 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-50">
            <UserPlus className="mr-2 inline h-4 w-4" /> Assign
          </button>
        </div>
        {message && <p className={`mt-3 text-sm ${textSecondary}`}>{message}</p>}
      </form>

      {loading ? (
        <div className="py-16 text-center"><RefreshCw className="mx-auto h-8 w-8 animate-spin text-emerald-600" /></div>
      ) : (
        <div className="grid gap-6 lg:grid-cols-2">
          <section className={`${cardBg} rounded-2xl border ${cardBorder} p-5`}>
            <h2 className={`mb-4 text-lg font-semibold ${textPrimary}`}>Active clients ({activeClients.length})</h2>
            <div className="space-y-3">
              {activeClients.length ? activeClients.map((client) => renderClient(client)) : <p className={`text-sm ${textSecondary}`}>No active assigned clients yet.</p>}
            </div>
          </section>
          <section className={`${cardBg} rounded-2xl border ${cardBorder} p-5`}>
            <h2 className={`mb-4 text-lg font-semibold ${textPrimary}`}>Discharged clients ({dischargedClients.length})</h2>
            <div className="space-y-3">
              {dischargedClients.length ? dischargedClients.map((client) => renderClient(client, true)) : <p className={`text-sm ${textSecondary}`}>No discharged clients.</p>}
            </div>
          </section>
        </div>
      )}
    </div>
  );
}
