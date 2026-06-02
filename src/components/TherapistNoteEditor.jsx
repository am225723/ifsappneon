import { useEffect, useState } from 'react';
import { CheckCircle, FileText, X } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { clientAuth } from '../lib/supabasePersonalization';
import { loadAssignedClients } from '../lib/therapistAssignments';
import { loadActiveTreatmentPlansForClient } from '../lib/treatmentPlans';
import { createTherapistNote, loadTherapistNotesForClient } from '../lib/therapistNotes';

const noteTypes = [
  { value: 'session_note', label: 'Session note' },
  { value: 'prep_note', label: 'Prep note' },
  { value: 'homework_review', label: 'Assigned IFS practice review' },
  { value: 'treatment_plan_review', label: 'Growth Goals review' },
  { value: 'general', label: 'General' }
];

export default function TherapistNoteEditor({ initialClientId = '', assignedClients = null, onSaved = null }) {
  const therapist = clientAuth.getCurrentClient();
  const [clients, setClients] = useState(assignedClients || []);
  const [clientId, setClientId] = useState(initialClientId);
  const [parts, setParts] = useState([]);
  const [goals, setGoals] = useState([]);
  const [notes, setNotes] = useState([]);
  const [taggedParts, setTaggedParts] = useState([]);
  const [taggedGoals, setTaggedGoals] = useState([]);
  const [form, setForm] = useState({ noteType: 'session_note', clinicalSummary: '', content: '', sessionDate: new Date().toISOString().split('T')[0] });
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (assignedClients) {
      setClients(assignedClients);
      return;
    }
    if (!therapist?.id) return;
    loadAssignedClients(therapist.id).then((rows) => setClients(rows || []));
  }, [assignedClients, therapist?.id]);

  useEffect(() => {
    if (initialClientId) setClientId(initialClientId);
  }, [initialClientId]);

  const loadClientContext = async () => {
    if (!clientId) {
      setParts([]);
      setGoals([]);
      setNotes([]);
      return;
    }
    const [{ data: partRows }, { data: goalRows }, { data: noteRows }] = await Promise.all([
      supabase.from('ifs_parts').select('id, part_name, part_type').eq('client_id', clientId).order('created_at', { ascending: false }),
      loadActiveTreatmentPlansForClient(clientId),
      loadTherapistNotesForClient(clientId)
    ]);
    setParts(partRows || []);
    setGoals((goalRows || []).filter((goal) => goal.status === 'active'));
    setNotes((noteRows || []).filter((note) => note.note_type !== 'archived'));
  };

  useEffect(() => {
    setTaggedParts([]);
    setTaggedGoals([]);
    loadClientContext();
  }, [clientId]);

  const togglePart = (part) => {
    const tag = { id: part.id, name: part.part_name };
    setTaggedParts((prev) => prev.some((item) => item.id === tag.id) ? prev.filter((item) => item.id !== tag.id) : [...prev, tag]);
  };

  const toggleGoal = (goal) => {
    const tag = { id: goal.id, goal_title: goal.goal_title };
    setTaggedGoals((prev) => prev.some((item) => item.id === tag.id) ? prev.filter((item) => item.id !== tag.id) : [...prev, tag]);
  };

  const saveNote = async () => {
    if (!therapist?.id || !clientId || !form.content.trim()) return;
    setMessage('');
    const { data, error } = await createTherapistNote({
      therapistId: therapist.id,
      clientId,
      noteType: form.noteType,
      clinicalSummary: form.clinicalSummary,
      content: form.content,
      sessionDate: form.sessionDate,
      taggedParts,
      taggedTreatmentGoals: taggedGoals
    });
    if (error) {
      setMessage(error.message || 'Unable to save Advisor note.');
      return;
    }
    setForm({ noteType: 'session_note', clinicalSummary: '', content: '', sessionDate: new Date().toISOString().split('T')[0] });
    setTaggedParts([]);
    setTaggedGoals([]);
    await loadClientContext();
    onSaved?.(data);
    setMessage('Advisor note saved.');
  };

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-5 space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2"><FileText className="w-5 h-5 text-amber-600" /> Advisor Notes</h3>
          <p className="text-sm text-gray-500">Tag Advisor notes to client parts and Growth Goals.</p>
        </div>
        {!initialClientId && (
          <select value={clientId} onChange={(e) => setClientId(e.target.value)} className="rounded-lg border px-3 py-2 text-sm">
            <option value="">Select assigned client...</option>
            {clients.map((client) => <option key={client.id} value={client.id}>{client.name}</option>)}
          </select>
        )}
      </div>

      {message && <div className="rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-700">{message}</div>}

      {clientId && (
        <div className="grid lg:grid-cols-[0.9fr_1.1fr] gap-5">
          <div className="space-y-3 rounded-lg bg-gray-50 p-4">
            <div className="grid sm:grid-cols-2 gap-3">
              <select value={form.noteType} onChange={(e) => setForm({ ...form, noteType: e.target.value })} className="rounded-lg border px-3 py-2">
                {noteTypes.map((type) => <option key={type.value} value={type.value}>{type.label}</option>)}
              </select>
              <input type="date" value={form.sessionDate} onChange={(e) => setForm({ ...form, sessionDate: e.target.value })} className="rounded-lg border px-3 py-2" />
            </div>
            <input value={form.clinicalSummary} onChange={(e) => setForm({ ...form, clinicalSummary: e.target.value })} placeholder="Brief Advisor note summary" className="w-full rounded-lg border px-3 py-2" />
            <textarea value={form.content} onChange={(e) => setForm({ ...form, content: e.target.value })} rows={8} placeholder="Write Advisor note..." className="w-full rounded-lg border px-3 py-2" />

            <div>
              <p className="text-xs font-semibold uppercase text-gray-500 mb-2">Tag parts</p>
              <div className="flex flex-wrap gap-2">{parts.length ? parts.map((part) => <button type="button" key={part.id} onClick={() => togglePart(part)} className={`px-2 py-1 rounded-full text-xs ${taggedParts.some((item) => item.id === part.id) ? 'bg-amber-600 text-white' : 'bg-white border text-gray-600'}`}>{part.part_name}</button>) : <span className="text-xs text-gray-500">No parts found.</span>}</div>
            </div>
            <div>
              <p className="text-xs font-semibold uppercase text-gray-500 mb-2">Tag Growth Goals</p>
              <div className="flex flex-wrap gap-2">{goals.length ? goals.map((goal) => <button type="button" key={goal.id} onClick={() => toggleGoal(goal)} className={`px-2 py-1 rounded-full text-xs ${taggedGoals.some((item) => item.id === goal.id) ? 'bg-emerald-600 text-white' : 'bg-white border text-gray-600'}`}>{goal.goal_title}</button>) : <span className="text-xs text-gray-500">No active Growth Goals found.</span>}</div>
            </div>
            {(taggedParts.length > 0 || taggedGoals.length > 0) && (
              <div className="flex flex-wrap gap-1">
                {taggedParts.map((part) => <span key={part.id} className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-xs text-amber-700">@{part.name}<X className="w-3 h-3" /></span>)}
                {taggedGoals.map((goal) => <span key={goal.id} className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-xs text-emerald-700">{goal.goal_title}<X className="w-3 h-3" /></span>)}
              </div>
            )}
            <button onClick={saveNote} disabled={!form.content.trim()} className="w-full rounded-lg bg-amber-600 px-3 py-2 text-white disabled:bg-gray-400 flex items-center justify-center gap-2"><CheckCircle className="w-4 h-4" /> Save Advisor note</button>
          </div>

          <div className="space-y-3 max-h-[640px] overflow-y-auto pr-1">
            {notes.length === 0 && <div className="rounded-lg border border-dashed p-6 text-center text-sm text-gray-500">No tagged notes yet.</div>}
            {notes.slice(0, 12).map((note) => (
              <div key={note.id} className="rounded-lg border p-4 space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-semibold uppercase text-amber-700">{note.note_type || 'general'}</span>
                  <span className="text-xs text-gray-400">{note.session_date || note.created_at?.slice(0, 10)}</span>
                </div>
                {note.clinical_summary && <p className="text-sm font-medium text-gray-800">{note.clinical_summary}</p>}
                <p className="text-sm text-gray-600 line-clamp-4 whitespace-pre-wrap">{note.content}</p>
                <div className="flex flex-wrap gap-1">
                  {(note.tagged_parts || []).map((part) => <span key={part.id} className="rounded-full bg-amber-100 px-2 py-0.5 text-xs text-amber-700">@{part.name}</span>)}
                  {(note.tagged_treatment_goals || []).map((goal) => <span key={goal.id} className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs text-emerald-700">{goal.goal_title}</span>)}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
