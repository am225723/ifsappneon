import { useEffect, useMemo, useState } from 'react';
import { CheckCircle, Clock, Edit3, PauseCircle, Plus, Save, Target, Trash2 } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { clientAuth } from '../lib/supabasePersonalization';
import { loadAssignedClients } from '../lib/therapistAssignments';
import {
  archiveTreatmentPlan,
  completeTreatmentPlan,
  createTreatmentPlan,
  loadTreatmentPlansForClient,
  pauseTreatmentPlan,
  updateTreatmentPlan
} from '../lib/treatmentPlans';

const woundOptions = ['abandonment', 'shame', 'neglect', 'betrayal', 'helplessness'];
const emptyForm = {
  goalTitle: '',
  goalDescription: '',
  targetWoundsText: '',
  objectivesText: '',
  interventionsText: '',
  reviewDate: '',
  targetParts: []
};

function linesToList(value) {
  return String(value || '').split('\n').map((item) => item.trim()).filter(Boolean);
}

function listToLines(value) {
  return Array.isArray(value) ? value.map((item) => (typeof item === 'string' ? item : item?.text || item?.title || '')).filter(Boolean).join('\n') : '';
}

export default function TreatmentPlanManager({ initialClientId = '', assignedClients = null }) {
  const therapist = clientAuth.getCurrentClient();
  const [clients, setClients] = useState(assignedClients || []);
  const [selectedClientId, setSelectedClientId] = useState(initialClientId);
  const [plans, setPlans] = useState([]);
  const [parts, setParts] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  const activePlans = useMemo(() => plans.filter((plan) => plan.status !== 'archived'), [plans]);

  useEffect(() => {
    if (assignedClients) {
      setClients(assignedClients);
      return;
    }
    if (!therapist?.id) return;
    loadAssignedClients(therapist.id).then((rows) => setClients(rows || []));
  }, [assignedClients, therapist?.id]);

  useEffect(() => {
    if (initialClientId) setSelectedClientId(initialClientId);
  }, [initialClientId]);

  const loadData = async (clientId = selectedClientId) => {
    if (!clientId) {
      setPlans([]);
      setParts([]);
      return;
    }
    setLoading(true);
    const [{ data: planRows, error }, { data: partRows }] = await Promise.all([
      loadTreatmentPlansForClient(clientId),
      supabase.from('ifs_parts').select('id, part_name, part_type').eq('client_id', clientId).order('created_at', { ascending: false })
    ]);
    if (error) setMessage(error.message || 'Unable to load treatment plan goals.');
    setPlans(planRows || []);
    setParts(partRows || []);
    setLoading(false);
  };

  useEffect(() => {
    loadData();
  }, [selectedClientId]);

  const resetForm = () => {
    setForm(emptyForm);
    setEditingId(null);
  };

  const toggleWound = (wound) => {
    const current = linesToList(form.targetWoundsText);
    const next = current.includes(wound) ? current.filter((item) => item !== wound) : [...current, wound];
    setForm((prev) => ({ ...prev, targetWoundsText: next.join('\n') }));
  };

  const togglePart = (part) => {
    setForm((prev) => {
      const exists = prev.targetParts.some((item) => item.id === part.id);
      return {
        ...prev,
        targetParts: exists
          ? prev.targetParts.filter((item) => item.id !== part.id)
          : [...prev.targetParts, { id: part.id, name: part.part_name }]
      };
    });
  };

  const editPlan = (plan) => {
    setEditingId(plan.id);
    setForm({
      goalTitle: plan.goal_title || '',
      goalDescription: plan.goal_description || '',
      targetWoundsText: listToLines(plan.target_wounds),
      objectivesText: listToLines(plan.objectives),
      interventionsText: listToLines(plan.interventions),
      reviewDate: plan.review_date || '',
      targetParts: Array.isArray(plan.target_parts) ? plan.target_parts : []
    });
  };

  const savePlan = async () => {
    if (!selectedClientId || !therapist?.id || !form.goalTitle.trim()) return;
    setMessage('');
    const payload = {
      therapistId: therapist.id,
      clientId: selectedClientId,
      goalTitle: form.goalTitle,
      goalDescription: form.goalDescription,
      targetWounds: linesToList(form.targetWoundsText),
      targetParts: form.targetParts,
      objectives: linesToList(form.objectivesText),
      interventions: linesToList(form.interventionsText),
      reviewDate: form.reviewDate || null
    };
    const result = editingId
      ? await updateTreatmentPlan(editingId, payload)
      : await createTreatmentPlan(payload);
    if (result.error) {
      setMessage(result.error.message || 'Unable to save treatment plan goal.');
      return;
    }
    resetForm();
    await loadData();
  };

  const setStatus = async (plan, action) => {
    const result = action === 'pause'
      ? await pauseTreatmentPlan(plan.id)
      : action === 'complete'
        ? await completeTreatmentPlan(plan.id)
        : await archiveTreatmentPlan(plan.id);
    if (result.error) setMessage(result.error.message || 'Unable to update goal.');
    await loadData();
  };

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-5 space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2"><Target className="w-5 h-5 text-amber-600" /> Treatment Plan Goals</h3>
          <p className="text-sm text-gray-500">Create and review clinically useful goals for assigned clients.</p>
        </div>
        {!initialClientId && (
          <select value={selectedClientId} onChange={(e) => setSelectedClientId(e.target.value)} className="rounded-lg border px-3 py-2 text-sm">
            <option value="">Select assigned client...</option>
            {clients.map((client) => <option key={client.id} value={client.id}>{client.name}</option>)}
          </select>
        )}
      </div>

      {message && <div className="rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-700">{message}</div>}

      {selectedClientId && (
        <div className="grid lg:grid-cols-[0.9fr_1.1fr] gap-5">
          <div className="space-y-3 rounded-lg bg-gray-50 p-4">
            <input value={form.goalTitle} onChange={(e) => setForm({ ...form, goalTitle: e.target.value })} placeholder="Goal title" className="w-full rounded-lg border px-3 py-2" />
            <textarea value={form.goalDescription} onChange={(e) => setForm({ ...form, goalDescription: e.target.value })} placeholder="Goal description" rows={3} className="w-full rounded-lg border px-3 py-2" />
            <div>
              <p className="text-xs font-semibold uppercase text-gray-500 mb-2">Target wounds</p>
              <div className="flex flex-wrap gap-2 mb-2">{woundOptions.map((wound) => <button type="button" key={wound} onClick={() => toggleWound(wound)} className={`px-2 py-1 rounded-full text-xs ${linesToList(form.targetWoundsText).includes(wound) ? 'bg-amber-600 text-white' : 'bg-white text-gray-600 border'}`}>{wound}</button>)}</div>
              <textarea value={form.targetWoundsText} onChange={(e) => setForm({ ...form, targetWoundsText: e.target.value })} placeholder="Or add one target wound per line" rows={2} className="w-full rounded-lg border px-3 py-2 text-sm" />
            </div>
            <div>
              <p className="text-xs font-semibold uppercase text-gray-500 mb-2">Target parts</p>
              <div className="flex flex-wrap gap-2">{parts.length ? parts.map((part) => <button key={part.id} type="button" onClick={() => togglePart(part)} className={`px-2 py-1 rounded-full text-xs ${form.targetParts.some((item) => item.id === part.id) ? 'bg-emerald-600 text-white' : 'bg-white text-gray-600 border'}`}>{part.part_name}</button>) : <span className="text-xs text-gray-500">No parts found for this client.</span>}</div>
            </div>
            <textarea value={form.objectivesText} onChange={(e) => setForm({ ...form, objectivesText: e.target.value })} placeholder="Objectives (one per line)" rows={3} className="w-full rounded-lg border px-3 py-2" />
            <textarea value={form.interventionsText} onChange={(e) => setForm({ ...form, interventionsText: e.target.value })} placeholder="Interventions (one per line)" rows={3} className="w-full rounded-lg border px-3 py-2" />
            <input type="date" value={form.reviewDate} onChange={(e) => setForm({ ...form, reviewDate: e.target.value })} className="w-full rounded-lg border px-3 py-2" />
            <div className="flex gap-2">
              <button onClick={savePlan} className="rounded-lg bg-amber-600 px-3 py-2 text-white flex items-center gap-2"><Plus className="w-4 h-4" /> {editingId ? 'Save goal' : 'Add goal'}</button>
              {editingId && <button onClick={resetForm} className="rounded-lg border px-3 py-2 text-gray-600">Cancel</button>}
            </div>
          </div>

          <div className="space-y-3 max-h-[720px] overflow-y-auto pr-1">
            {loading && <p className="text-sm text-gray-500">Loading goals...</p>}
            {!loading && activePlans.length === 0 && <div className="rounded-lg border border-dashed p-6 text-center text-sm text-gray-500">No treatment plan goals yet.</div>}
            {activePlans.map((plan) => (
              <div key={plan.id} className="rounded-lg border p-4 space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-semibold text-gray-900">{plan.goal_title}</p>
                    <p className="text-xs text-gray-500">{plan.status} {plan.review_date ? `· review ${plan.review_date}` : ''}</p>
                  </div>
                  <button onClick={() => editPlan(plan)} className="p-1 text-gray-500 hover:text-amber-600"><Edit3 className="w-4 h-4" /></button>
                </div>
                {plan.goal_description && <p className="text-sm text-gray-600">{plan.goal_description}</p>}
                {Array.isArray(plan.objectives) && plan.objectives.length > 0 && <ul className="list-disc pl-5 text-sm text-gray-600">{plan.objectives.map((obj, index) => <li key={index}>{typeof obj === 'string' ? obj : obj?.text}</li>)}</ul>}
                <div className="flex flex-wrap gap-1">
                  {(plan.target_wounds || []).map((wound) => <span key={wound} className="rounded-full bg-amber-100 px-2 py-0.5 text-xs text-amber-700">{wound}</span>)}
                  {(plan.target_parts || []).map((part) => <span key={part.id || part.name} className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs text-emerald-700">{part.name}</span>)}
                </div>
                <div className="flex flex-wrap gap-2 pt-2 border-t">
                  {plan.status === 'active' && <button onClick={() => setStatus(plan, 'pause')} className="text-xs px-2 py-1 rounded border text-gray-600 flex items-center gap-1"><PauseCircle className="w-3 h-3" /> Pause</button>}
                  {plan.status !== 'completed' && <button onClick={() => setStatus(plan, 'complete')} className="text-xs px-2 py-1 rounded border text-emerald-700 flex items-center gap-1"><CheckCircle className="w-3 h-3" /> Complete</button>}
                  {plan.status === 'paused' && <button onClick={() => updateTreatmentPlan(plan.id, { status: 'active' }).then(() => loadData())} className="text-xs px-2 py-1 rounded border text-blue-700 flex items-center gap-1"><Clock className="w-3 h-3" /> Resume</button>}
                  <button onClick={() => setStatus(plan, 'archive')} className="text-xs px-2 py-1 rounded border text-red-600 flex items-center gap-1"><Trash2 className="w-3 h-3" /> Archive</button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
