import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Archive, CalendarDays, Check, Edit2, Save, ShieldCheck, X } from 'lucide-react';
import { supabase } from '../lib/supabase';
import {
  LIFE_REFLECTION_TYPES,
  archiveLifeIntegrationReflection,
  getLifeIntegrationReflection,
  updateLifeIntegrationReflection
} from '../lib/lifeIntegration';

const editableFields = [
  ['situation', 'Situation'],
  ['part_noticed', 'Part noticed'],
  ['body_sensation', 'Body sensation'],
  ['emotion', 'Emotion'],
  ['need_or_message', 'Need or message'],
  ['self_energy_response', 'Self-energy response'],
  ['next_step', 'Next step']
];

const emptyForm = {
  situation: '',
  part_noticed: '',
  part_id: '',
  body_sensation: '',
  emotion: '',
  need_or_message: '',
  self_energy_response: '',
  next_step: '',
  shared_with_advisor: true
};

function getClientId() {
  return localStorage.getItem('client_id');
}

function displayValue(value) {
  return value || 'Not added yet';
}

function ReflectionField({ label, value }) {
  return (
    <div className="rounded-2xl border border-brand-stone-100 bg-white/75 p-4 dark:border-slate-800 dark:bg-slate-900/50">
      <p className="text-xs font-bold uppercase tracking-[0.18em] text-brand-stone-500 dark:text-slate-500">{label}</p>
      <p className={`mt-2 whitespace-pre-wrap text-sm leading-relaxed ${value ? 'text-brand-stone-800 dark:text-slate-200' : 'text-brand-stone-400 dark:text-slate-500'}`}>{displayValue(value)}</p>
    </div>
  );
}

export default function LifeIntegrationReflectionDetail() {
  const { reflectionId } = useParams();
  const navigate = useNavigate();
  const [reflection, setReflection] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [parts, setParts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [archiving, setArchiving] = useState(false);
  const [editing, setEditing] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const linkedPartName = useMemo(() => {
    if (!reflection) return '';
    return reflection.linked_part_name || reflection.linked_part_alias || parts.find((part) => part.id === reflection.part_id)?.part_name || parts.find((part) => part.id === reflection.part_id)?.name || '';
  }, [parts, reflection]);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setError('');
      const [{ data, error: reflectionError }] = await Promise.all([getLifeIntegrationReflection(reflectionId)]);
      if (reflectionError) {
        setError(reflectionError.message || 'Unable to load this Life Integration reflection.');
        setLoading(false);
        return;
      }
      setReflection(data);
      setForm({
        situation: data?.situation || '',
        part_noticed: data?.part_noticed || '',
        part_id: data?.part_id || '',
        body_sensation: data?.body_sensation || '',
        emotion: data?.emotion || '',
        need_or_message: data?.need_or_message || '',
        self_energy_response: data?.self_energy_response || '',
        next_step: data?.next_step || '',
        shared_with_advisor: true
      });
      setLoading(false);
    };
    load();
  }, [reflectionId]);

  useEffect(() => {
    const loadParts = async () => {
      const clientId = getClientId();
      if (!clientId) return;
      const { data, error: partsError } = await supabase
        .from('ifs_parts')
        .select('id, part_name, name, part_type, type')
        .eq('client_id', clientId)
        .order('updated_at', { ascending: false })
        .limit(50);
      if (!partsError) setParts(data || []);
    };
    loadParts();
  }, []);

  const updateField = (name, value) => setForm((current) => ({ ...current, [name]: value }));

  const handleSave = async () => {
    setSaving(true);
    setError('');
    setNotice('');
    const updates = {
      situation: form.situation,
      part_noticed: form.part_noticed,
      part_id: form.part_id || null,
      body_sensation: form.body_sensation,
      emotion: form.emotion,
      need_or_message: form.need_or_message,
      self_energy_response: form.self_energy_response,
      next_step: form.next_step,
      shared_with_advisor: true
    };
    const { data, error: saveError } = await updateLifeIntegrationReflection(reflectionId, updates);
    setSaving(false);
    if (saveError) {
      setError(saveError.message || 'Unable to save this reflection.');
      return;
    }
    setReflection(data);
    setEditing(false);
    setNotice('Reflection saved.');
  };



  const handleArchive = async () => {
    if (!window.confirm('Archive this Life Integration reflection? It will no longer appear in your recent reflections.')) return;
    setArchiving(true);
    setError('');
    const { error: archiveError } = await archiveLifeIntegrationReflection(reflectionId);
    setArchiving(false);
    if (archiveError) {
      setError(archiveError.message || 'Unable to archive this reflection.');
      return;
    }
    navigate('/life-integration');
  };

  if (loading) {
    return <main className="min-h-screen bg-brand-sanctuary px-4 py-8 dark:bg-brand-midnight"><div className="mx-auto max-w-4xl soft-card p-6 text-sm text-brand-stone-600 dark:text-slate-400">Loading Life Integration reflection…</div></main>;
  }

  if (error && !reflection) {
    return <main className="min-h-screen bg-brand-sanctuary px-4 py-8 dark:bg-brand-midnight"><div className="mx-auto max-w-4xl rounded-3xl bg-red-50 p-6 text-sm text-red-700 dark:bg-red-950/20 dark:text-red-300">{error}</div></main>;
  }

  const title = LIFE_REFLECTION_TYPES[reflection.reflection_type] || 'Life Integration reflection';

  return (
    <main className="min-h-screen bg-brand-sanctuary px-4 py-8 dark:bg-brand-midnight sm:px-6 lg:px-8">
      <div className="mx-auto max-w-5xl">
        <Link to="/life-integration" className="mb-6 inline-flex items-center gap-2 text-sm font-semibold text-brand-stone-600 transition hover:text-brand-gold-700 dark:text-slate-400 dark:hover:text-brand-gold-500">
          <ArrowLeft className="h-4 w-4" /> Back to IFS in Daily Life
        </Link>

        <section className="overflow-hidden rounded-[2rem] border border-brand-gold-100 bg-white/85 shadow-xl shadow-brand-gold-500/10 dark:border-slate-800 dark:bg-brand-cardDark/90">
          <div className="bg-gradient-to-br from-brand-gold-50 via-white to-brand-emerald-50 px-6 py-8 dark:from-brand-gold-950/20 dark:via-brand-cardDark dark:to-brand-emerald-950/20 sm:px-8">
            <div className="flex flex-col gap-5 md:flex-row md:items-start md:justify-between">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.26em] text-brand-gold-700 dark:text-brand-gold-500">Life Integration Reflection</p>
                <h1 className="mt-3 text-4xl font-serif font-normal text-brand-stone-900 dark:text-slate-100">{title}</h1>
                <div className="mt-4 flex flex-wrap gap-2 text-sm text-brand-stone-600 dark:text-slate-400">
                  <span className="inline-flex items-center gap-1 rounded-full bg-white/80 px-3 py-1.5 shadow-sm dark:bg-slate-900/60"><CalendarDays className="h-4 w-4" /> {new Date(reflection.created_at).toLocaleString()}</span>
                  {linkedPartName && <span className="rounded-full bg-white/80 px-3 py-1.5 shadow-sm dark:bg-slate-900/60">Linked part: {linkedPartName}</span>}
                  {reflection.archived_at && <span className="rounded-full bg-brand-stone-100 px-3 py-1.5 text-brand-stone-600 dark:bg-slate-800 dark:text-slate-300">Archived</span>}
                </div>
              </div>
              <span className={`inline-flex w-fit items-center gap-2 rounded-full px-4 py-2 text-xs font-bold uppercase tracking-wide bg-brand-emerald-50 text-brand-emerald-700 dark:bg-brand-emerald-950/30 dark:text-brand-emerald-100`}>
                <ShieldCheck className="h-4 w-4" />
                Visible to Advisor
              </span>
            </div>
          </div>

          <div className="grid gap-0 lg:grid-cols-[1fr_0.65fr]">
            <div className="p-6 sm:p-8">
              {error && <div className="mb-5 rounded-2xl bg-red-50 p-4 text-sm text-red-700 dark:bg-red-950/20 dark:text-red-300">{error}</div>}
              {notice && <div className="mb-5 rounded-2xl bg-brand-emerald-50 p-4 text-sm text-brand-emerald-700 dark:bg-brand-emerald-950/20 dark:text-brand-emerald-100">{notice}</div>}

              {editing ? (
                <div className="space-y-4">
                  <label className="block">
                    <span className="text-sm font-semibold text-brand-stone-800 dark:text-slate-200">Linked part</span>
                    <select value={form.part_id} onChange={(event) => updateField('part_id', event.target.value)} className="mt-2 w-full rounded-2xl border border-brand-stone-200 bg-white/80 px-4 py-3 text-sm text-brand-stone-800 outline-none transition focus:border-brand-gold-400 focus:ring-2 focus:ring-brand-gold-100 dark:border-slate-700 dark:bg-slate-900/70 dark:text-slate-100">
                      <option value="">No linked part</option>
                      {parts.map((part) => <option key={part.id} value={part.id}>{part.part_name || part.name || 'Unnamed part'}{part.part_type || part.type ? ` · ${part.part_type || part.type}` : ''}</option>)}
                    </select>
                  </label>
                  {editableFields.map(([name, label]) => (
                    <label key={name} className="block">
                      <span className="text-sm font-semibold text-brand-stone-800 dark:text-slate-200">{label}</span>
                      <textarea value={form[name]} onChange={(event) => updateField(name, event.target.value)} rows={3} className="mt-2 w-full resize-none rounded-2xl border border-brand-stone-200 bg-white/80 px-4 py-3 text-sm leading-relaxed text-brand-stone-800 outline-none transition focus:border-brand-gold-400 focus:ring-2 focus:ring-brand-gold-100 dark:border-slate-700 dark:bg-slate-900/70 dark:text-slate-100" />
                    </label>
                  ))}
                  <div className="rounded-2xl border border-brand-emerald-100 bg-brand-emerald-50/60 p-4 text-sm text-brand-stone-700 dark:border-brand-emerald-900/50 dark:bg-brand-emerald-950/20 dark:text-slate-300">
                    <span className="font-semibold text-brand-stone-900 dark:text-slate-100">Visible to Advisor.</span> Your Advisor can review this to support your work together.
                  </div>
                </div>
              ) : (
                <div className="grid gap-4 md:grid-cols-2">
                  <ReflectionField label="Situation" value={reflection.situation} />
                  <ReflectionField label="Part noticed" value={reflection.part_noticed} />
                  <ReflectionField label="Body sensation" value={reflection.body_sensation} />
                  <ReflectionField label="Emotion" value={reflection.emotion} />
                  <ReflectionField label="Need or message" value={reflection.need_or_message} />
                  <ReflectionField label="Self-energy response" value={reflection.self_energy_response} />
                  <div className="md:col-span-2"><ReflectionField label="Next step" value={reflection.next_step} /></div>
                </div>
              )}
            </div>

            <aside className="border-t border-brand-stone-100 p-6 dark:border-slate-800 lg:border-l lg:border-t-0 sm:p-8">
              <div className="space-y-4">
                <div className="rounded-3xl bg-brand-emerald-50/70 p-5 dark:bg-brand-emerald-950/20">
                  <ShieldCheck className="mb-3 h-6 w-6 text-brand-emerald-700 dark:text-brand-emerald-100" />
                  <p className="text-sm leading-relaxed text-brand-stone-700 dark:text-slate-300">
                    Your Advisor can review this to support your work together.
                  </p>
                </div>
                <div className="rounded-3xl bg-white/75 p-5 text-sm leading-relaxed text-brand-stone-600 dark:bg-slate-900/50 dark:text-slate-400">
                  Your Life Integration reflections are visible to your assigned Advisor where Advisor review exists. This app supports reflection and IFS practice between sessions. It is not monitored for emergencies.
                </div>
                <div className="rounded-3xl bg-brand-gold-50/70 p-5 text-xs leading-relaxed text-brand-stone-600 dark:bg-brand-gold-950/20 dark:text-slate-400">
                  This space supports reflection and IFS practice between sessions. It is not monitored for emergencies. If you are in immediate danger or may harm yourself or someone else, call 911 or your local crisis line now.
                </div>
              </div>

              <div className="mt-6 flex flex-col gap-3">
                {editing ? (
                  <>
                    <button onClick={handleSave} disabled={saving} className="inline-flex items-center justify-center gap-2 rounded-full bg-brand-emerald-700 px-5 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-brand-emerald-800 disabled:opacity-60"><Save className="h-4 w-4" /> {saving ? 'Saving…' : 'Save reflection'}</button>
                    <button onClick={() => { setEditing(false); setForm({ situation: reflection.situation || '', part_noticed: reflection.part_noticed || '', part_id: reflection.part_id || '', body_sensation: reflection.body_sensation || '', emotion: reflection.emotion || '', need_or_message: reflection.need_or_message || '', self_energy_response: reflection.self_energy_response || '', next_step: reflection.next_step || '', shared_with_advisor: true }); }} className="inline-flex items-center justify-center gap-2 rounded-full border border-brand-stone-200 px-5 py-3 text-sm font-bold text-brand-stone-700 transition hover:bg-brand-stone-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"><X className="h-4 w-4" /> Cancel</button>
                  </>
                ) : (
                  <button onClick={() => setEditing(true)} className="inline-flex items-center justify-center gap-2 rounded-full bg-brand-stone-900 px-5 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-brand-stone-700 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-white"><Edit2 className="h-4 w-4" /> Edit reflection</button>
                )}

                <button onClick={handleArchive} disabled={archiving} className="inline-flex items-center justify-center gap-2 rounded-full border border-red-200 px-5 py-3 text-sm font-bold text-red-700 transition hover:bg-red-50 disabled:opacity-60 dark:border-red-900/60 dark:text-red-300 dark:hover:bg-red-950/20"><Archive className="h-4 w-4" /> {archiving ? 'Archiving…' : 'Archive reflection'}</button>
              </div>

              {reflection.updated_at && <p className="mt-5 inline-flex items-center gap-2 text-xs text-brand-stone-500 dark:text-slate-500"><Check className="h-3.5 w-3.5" /> Last updated {new Date(reflection.updated_at).toLocaleString()}</p>}
            </aside>
          </div>
        </section>
      </div>
    </main>
  );
}
