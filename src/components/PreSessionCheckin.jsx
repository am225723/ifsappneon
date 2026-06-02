import { useEffect, useMemo, useState } from 'react';
import { CalendarCheck, X, Loader2, AlertTriangle, CheckCircle2, Archive } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { clientAuth } from '../lib/supabasePersonalization';
import { archiveSessionAgenda, loadClientAgendaTherapist, loadClientSessionAgendas, saveDraftSessionAgenda, submitSessionAgenda } from '../lib/sessionAgendas';

const emptyForm = {
  sessionDate: new Date().toISOString().slice(0, 10),
  sessionDatetime: '',
  topics: '',
  activeParts: [],
  stuckPoints: '',
  goalsForSession: '',
  currentStressLevel: 5,
  currentMoodLabel: '',
  safetyConcerns: ''
};

function normalizePart(part) {
  return { id: part.id, name: part.part_name || part.name || 'Unnamed part' };
}

export default function PreSessionCheckin({ open, onClose, therapistId }) {
  const client = clientAuth.getCurrentClient();
  const [parts, setParts] = useState([]);
  const [agendas, setAgendas] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [assignedTherapistId, setAssignedTherapistId] = useState(therapistId || '');
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const shouldRender = open !== false;
  const selectedPartIds = useMemo(() => new Set(form.activeParts.map((part) => part.id)), [form.activeParts]);

  const loadData = async () => {
    if (!shouldRender) return;
    if (!client?.id) {
      setError('Client profile is not available. Please sign in again.');
      setLoading(false);
      return;
    }
    setLoading(true);
    setError('');
    try {
      const [partsResult, agendaResult, therapistResult] = await Promise.all([
        supabase.from('ifs_parts').select('id, part_name, part_type').eq('client_id', client.id).order('created_at', { ascending: false }),
        loadClientSessionAgendas(client.id),
        therapistId ? Promise.resolve({ data: therapistId, error: null }) : loadClientAgendaTherapist(client.id)
      ]);
      if (partsResult.error) throw partsResult.error;
      if (agendaResult.error) throw agendaResult.error;
      if (therapistResult.error) throw therapistResult.error;
      setParts(partsResult.data || []);
      setAgendas(agendaResult.data || []);
      if (therapistResult.data) setAssignedTherapistId(therapistResult.data);
    } catch (loadError) {
      console.error('Error loading pre-session check-in:', loadError);
      setParts([]);
      setAgendas([]);
      setError(loadError.message || 'Unable to load check-in details. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [shouldRender, client?.id, therapistId]);

  if (!shouldRender) return null;

  const togglePart = (part) => {
    const normalized = normalizePart(part);
    setForm((prev) => ({
      ...prev,
      activeParts: selectedPartIds.has(part.id)
        ? prev.activeParts.filter((item) => item.id !== part.id)
        : [...prev.activeParts, normalized]
    }));
  };

  const persistAgenda = async (status) => {
    setError('');
    setMessage('');
    if (!client?.id) {
      setError('Client profile is not available.');
      return;
    }
    if (!assignedTherapistId) {
      setError('No active therapist assignment was found for this check-in.');
      return;
    }
    if (!form.sessionDate || !form.topics.trim()) {
      setError('Session date and topics are required.');
      return;
    }

    setSaving(true);
    try {
      const payload = { ...form, clientId: client.id, therapistId: assignedTherapistId };
      const result = status === 'draft' ? await saveDraftSessionAgenda(payload) : await submitSessionAgenda(payload);

      if (result.error) {
        setError(result.error.message || 'Unable to save check-in.');
        return;
      }

      setMessage(status === 'draft' ? 'Draft saved.' : 'Pre-session check-in submitted.');
      setForm(emptyForm);
      await loadData();
      if (status === 'submitted') onClose?.();
    } catch (saveError) {
      console.error('Error saving pre-session check-in:', saveError);
      setError(saveError.message || 'Unable to save check-in.');
    } finally {
      setSaving(false);
    }
  };

  const archiveAgenda = async (agendaId) => {
    setError('');
    const result = await archiveSessionAgenda(agendaId);
    if (result.error) setError(result.error.message || 'Unable to archive agenda.');
    else {
      setMessage('Agenda archived.');
      await loadData();
    }
  };

  const content = (
    <div className="w-full max-w-5xl rounded-2xl bg-white p-6 shadow-xl space-y-6 dark:bg-slate-900">
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          <CalendarCheck className="w-7 h-7 text-amber-600 mt-1" />
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Pre-Session Check-In</h1>
            <p className="text-sm text-gray-600 dark:text-slate-300">Use this to let your therapist know what feels important before your next session.</p>
          </div>
        </div>
        {onClose && <button type="button" onClick={onClose} aria-label="Close"><X className="w-5 h-5" /></button>}
      </div>

      {loading ? (
        <div className="flex items-center gap-2 text-sm text-gray-600"><Loader2 className="w-4 h-4 animate-spin" /> Loading check-in details...</div>
      ) : (
        <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
          <form onSubmit={(event) => { event.preventDefault(); persistAgenda('submitted'); }} className="space-y-4">
            {error && <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div>}
            {message && <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-700">{message}</div>}

            <label className="block text-sm font-medium text-gray-700 dark:text-slate-200">Session date
              <input type="date" required value={form.sessionDate} onChange={(e) => setForm({ ...form, sessionDate: e.target.value })} className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 dark:border-slate-700 dark:bg-slate-800" />
            </label>

            <label className="block text-sm font-medium text-gray-700 dark:text-slate-200">Topics I want to discuss
              <textarea required value={form.topics} onChange={(e) => setForm({ ...form, topics: e.target.value })} rows={4} className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 dark:border-slate-700 dark:bg-slate-800" />
            </label>

            <div>
              <p className="text-sm font-medium text-gray-700 dark:text-slate-200 mb-2">Active parts showing up lately</p>
              <div className="flex flex-wrap gap-2 rounded-xl border border-gray-200 p-3 dark:border-slate-700">
                {parts.length === 0 && <span className="text-sm text-gray-500">No parts mapped yet. You can still submit your check-in without selecting active parts.</span>}
                {parts.map((part) => {
                  const selected = selectedPartIds.has(part.id);
                  return <button key={part.id} type="button" onClick={() => togglePart(part)} className={`px-3 py-1.5 rounded-full text-sm ${selected ? 'bg-amber-600 text-white' : 'bg-gray-100 text-gray-700 dark:bg-slate-800 dark:text-slate-200'}`}>{part.part_name || 'Unnamed part'}</button>;
                })}
              </div>
            </div>

            <label className="block text-sm font-medium text-gray-700 dark:text-slate-200">Stuck points
              <textarea value={form.stuckPoints} onChange={(e) => setForm({ ...form, stuckPoints: e.target.value })} rows={3} className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 dark:border-slate-700 dark:bg-slate-800" />
            </label>

            <label className="block text-sm font-medium text-gray-700 dark:text-slate-200">Goals for this session
              <textarea value={form.goalsForSession} onChange={(e) => setForm({ ...form, goalsForSession: e.target.value })} rows={3} className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 dark:border-slate-700 dark:bg-slate-800" />
            </label>

            <div className="grid gap-4 sm:grid-cols-2">
              <label className="block text-sm font-medium text-gray-700 dark:text-slate-200">Current stress level, 1–10
                <input type="number" min="1" max="10" required value={form.currentStressLevel} onChange={(e) => setForm({ ...form, currentStressLevel: e.target.value })} className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 dark:border-slate-700 dark:bg-slate-800" />
              </label>
              <label className="block text-sm font-medium text-gray-700 dark:text-slate-200">Current mood label
                <input value={form.currentMoodLabel} onChange={(e) => setForm({ ...form, currentMoodLabel: e.target.value })} placeholder="e.g., anxious, hopeful" className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 dark:border-slate-700 dark:bg-slate-800" />
              </label>
            </div>

            <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
              <div className="flex gap-2"><AlertTriangle className="w-5 h-5 flex-shrink-0" /><p>This form is reviewed as part of routine care and is not monitored for emergencies. If you are in immediate danger or may harm yourself or someone else, call 911 or your local crisis line now.</p></div>
              <label className="block font-medium mt-3">Safety concerns / anything urgent the therapist should know
                <textarea value={form.safetyConcerns} onChange={(e) => setForm({ ...form, safetyConcerns: e.target.value })} rows={3} className="mt-1 w-full rounded-lg border border-amber-300 px-3 py-2 bg-white text-gray-900" />
              </label>
            </div>

            <div className="flex flex-col sm:flex-row gap-3">
              <button type="button" onClick={() => persistAgenda('draft')} disabled={saving} className="flex-1 rounded-lg border border-amber-600 px-4 py-2.5 font-semibold text-amber-700 disabled:opacity-60">Save draft</button>
              <button disabled={saving} className="flex-1 rounded-lg bg-amber-600 px-4 py-2.5 font-semibold text-white disabled:bg-gray-400 flex items-center justify-center gap-2">{saving && <Loader2 className="w-4 h-4 animate-spin" />} Submit check-in</button>
            </div>
          </form>

          <aside className="space-y-3">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Previous check-ins</h2>
            {agendas.length === 0 ? <p className="rounded-xl border border-gray-200 p-4 text-sm text-gray-500 dark:border-slate-700">No previous agendas yet.</p> : agendas.map((agenda) => (
              <div key={agenda.id} className="rounded-xl border border-gray-200 p-4 text-sm dark:border-slate-700">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-semibold text-gray-900 dark:text-white">{agenda.session_date ? new Date(`${agenda.session_date}T00:00:00`).toLocaleDateString() : 'No session date'}</p>
                    <p className="text-xs uppercase tracking-wide text-gray-500">{agenda.status}</p>
                  </div>
                  {(agenda.status === 'draft' || agenda.status === 'submitted') && <button type="button" onClick={() => archiveAgenda(agenda.id)} className="text-gray-400 hover:text-amber-700" title="Archive agenda"><Archive className="w-4 h-4" /></button>}
                </div>
                <p className="mt-2 text-gray-700 dark:text-slate-300 line-clamp-3">{agenda.topics}</p>
                {agenda.status === 'reviewed' && <p className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-emerald-700"><CheckCircle2 className="w-3 h-3" /> Reviewed</p>}
              </div>
            ))}
          </aside>
        </div>
      )}
    </div>
  );

  if (onClose || open) {
    return <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center overflow-y-auto px-4 py-8">{content}</div>;
  }

  return <div className="max-w-6xl mx-auto px-4 py-8">{content}</div>;
}
