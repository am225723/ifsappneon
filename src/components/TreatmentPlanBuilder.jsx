import { useEffect, useState } from 'react';
import { Plus, Trash2, Save } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { clientAuth } from '../lib/supabasePersonalization';

const woundOptions = ['abandonment', 'shame', 'neglect', 'betrayal', 'helplessness'];

export default function TreatmentPlanBuilder({ clientId }) {
  const therapist = clientAuth.getCurrentClient();
  const [plans, setPlans] = useState([]);
  const [form, setForm] = useState({ goal_title: '', target_wounds: [], status: 'active' });

  const load = () => {
    if (!clientId) return;
    supabase.from('ifs_treatment_plans').select('*').eq('client_id', clientId).order('created_at', { ascending: false }).then(({ data }) => setPlans(data || []));
  };
  useEffect(load, [clientId]);

  const save = async () => {
    if (!clientId || !therapist?.id || !form.goal_title.trim()) return;
    await supabase.from('ifs_treatment_plans').insert({ ...form, client_id: clientId, therapist_id: therapist.id, updated_at: new Date().toISOString() });
    setForm({ goal_title: '', target_wounds: [], status: 'active' });
    load();
  };
  const updateStatus = async (plan, status) => { await supabase.from('ifs_treatment_plans').update({ status, updated_at: new Date().toISOString() }).eq('id', plan.id); load(); };
  const remove = async (plan) => { await supabase.from('ifs_treatment_plans').delete().eq('id', plan.id); load(); };
  const toggleWound = (wound) => setForm(prev => ({ ...prev, target_wounds: prev.target_wounds.includes(wound) ? prev.target_wounds.filter(w => w !== wound) : [...prev.target_wounds, wound] }));

  return <div className="rounded-xl border border-gray-200 bg-white p-5 space-y-4"><h3 className="font-bold text-gray-900">Treatment Plans</h3><div className="space-y-3 rounded-lg bg-gray-50 p-3"><input value={form.goal_title} onChange={(e) => setForm({ ...form, goal_title: e.target.value })} placeholder="Treatment goal" className="w-full rounded-lg border px-3 py-2" /><div className="flex flex-wrap gap-2">{woundOptions.map(wound => <button type="button" key={wound} onClick={() => toggleWound(wound)} className={`px-2 py-1 rounded-full text-xs ${form.target_wounds.includes(wound) ? 'bg-amber-600 text-white' : 'bg-white text-gray-600 border'}`}>{wound}</button>)}</div><button onClick={save} className="rounded-lg bg-amber-600 px-3 py-2 text-white flex items-center gap-2"><Plus className="w-4 h-4" /> Add goal</button></div><div className="space-y-2">{plans.map(plan => <div key={plan.id} className="rounded-lg border p-3"><div className="flex items-start justify-between gap-2"><div><p className="font-semibold text-gray-900">{plan.goal_title}</p><p className="text-xs text-gray-500">{(plan.target_wounds || []).join(', ') || 'No target wounds'} · {plan.status}</p></div><div className="flex gap-1"><button onClick={() => updateStatus(plan, plan.status === 'active' ? 'completed' : 'active')} className="p-1 text-emerald-600"><Save className="w-4 h-4" /></button><button onClick={() => remove(plan)} className="p-1 text-red-600"><Trash2 className="w-4 h-4" /></button></div></div></div>)}</div></div>;
}
