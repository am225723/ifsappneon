import { useEffect, useState } from 'react';
import { CalendarCheck, X, Loader2 } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { clientAuth } from '../lib/supabasePersonalization';
import { schedulePreSessionAgendaReminder } from '../lib/pushNotifications';

export default function PreSessionCheckin({ open, onClose, therapistId }) {
  const client = clientAuth.getCurrentClient();
  const [parts, setParts] = useState([]);
  const [form, setForm] = useState({ topics: '', activeParts: [], stuckPoints: '', sessionDate: new Date().toISOString().slice(0, 10) });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open || !client?.id) return;
    supabase.from('ifs_parts').select('id, part_name, part_type').eq('client_id', client.id).order('created_at', { ascending: false })
      .then(({ data }) => setParts(data || []));
  }, [open, client?.id]);

  if (!open) return null;

  const togglePart = (part) => {
    setForm(prev => {
      const exists = prev.activeParts.some(item => item.id === part.id);
      return { ...prev, activeParts: exists ? prev.activeParts.filter(item => item.id !== part.id) : [...prev.activeParts, part] };
    });
  };

  const save = async (event) => {
    event.preventDefault();
    if (!client?.id || !form.topics.trim()) return;
    setSaving(true);
    const { data } = await supabase.from('ifs_session_agendas').insert({
      client_id: client.id,
      therapist_id: therapistId || client.therapist_id || client.assigned_therapist_id || 'unassigned',
      topics: form.topics,
      active_parts: form.activeParts,
      stuck_points: form.stuckPoints || null,
      session_date: form.sessionDate
    }).select().single();
    await schedulePreSessionAgendaReminder({ clientId: client.id, sessionDate: form.sessionDate, agendaId: data?.id });
    setSaving(false);
    onClose?.();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center px-4">
      <form onSubmit={save} className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3"><CalendarCheck className="w-6 h-6 text-amber-600" /><h2 className="text-xl font-bold">Pre-session check-in</h2></div>
          <button type="button" onClick={onClose}><X className="w-5 h-5" /></button>
        </div>
        <label className="block text-sm font-medium text-gray-700">What topics feel important today?<textarea required value={form.topics} onChange={(e) => setForm({ ...form, topics: e.target.value })} rows={3} className="mt-1 w-full rounded-lg border px-3 py-2" /></label>
        <div>
          <p className="text-sm font-medium text-gray-700 mb-2">Active parts</p>
          <div className="flex flex-wrap gap-2 max-h-32 overflow-y-auto">
            {parts.length === 0 && <span className="text-sm text-gray-500">No parts mapped yet.</span>}
            {parts.map(part => {
              const selected = form.activeParts.some(item => item.id === part.id);
              return <button key={part.id} type="button" onClick={() => togglePart(part)} className={`px-3 py-1.5 rounded-full text-sm ${selected ? 'bg-amber-600 text-white' : 'bg-gray-100 text-gray-700'}`}>{part.part_name}</button>;
            })}
          </div>
        </div>
        <label className="block text-sm font-medium text-gray-700">Where are you feeling stuck?<textarea value={form.stuckPoints} onChange={(e) => setForm({ ...form, stuckPoints: e.target.value })} rows={3} className="mt-1 w-full rounded-lg border px-3 py-2" /></label>
        <label className="block text-sm font-medium text-gray-700">Session date<input type="date" value={form.sessionDate} onChange={(e) => setForm({ ...form, sessionDate: e.target.value })} className="mt-1 w-full rounded-lg border px-3 py-2" /></label>
        <button disabled={saving} className="w-full rounded-lg bg-amber-600 py-2.5 font-semibold text-white disabled:bg-gray-400 flex items-center justify-center gap-2">{saving && <Loader2 className="w-4 h-4 animate-spin" />} Save Check-in</button>
      </form>
    </div>
  );
}
