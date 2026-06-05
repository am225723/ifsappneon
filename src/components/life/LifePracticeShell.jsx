import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, ArrowRight, Check, Heart, PenLine, ShieldCheck } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { saveLifeIntegrationReflection } from '../../lib/lifeIntegration';
import { clientAuth } from '../../lib/supabasePersonalization';

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
  return clientAuth.getCurrentClient()?.id || localStorage.getItem('client_id');
}

function Field({ field, value, onChange }) {
  if (field.type === 'select') {
    return (
      <label className="block">
        <span className="text-sm font-semibold text-brand-stone-800 dark:text-slate-200">{field.label}</span>
        <select
          value={value}
          onChange={(event) => onChange(field.name, event.target.value)}
          className="mt-2 w-full rounded-2xl border border-brand-stone-200 bg-white/80 px-4 py-3 text-sm text-brand-stone-800 outline-none transition focus:border-brand-gold-400 focus:ring-2 focus:ring-brand-gold-100 dark:border-slate-700 dark:bg-slate-900/70 dark:text-slate-100"
        >
          <option value="">Choose if one fits</option>
          {field.options.map((option) => <option key={option} value={option}>{option}</option>)}
        </select>
      </label>
    );
  }

  return (
    <label className="block">
      <span className="text-sm font-semibold text-brand-stone-800 dark:text-slate-200">{field.label}</span>
      <textarea
        value={value}
        onChange={(event) => onChange(field.name, event.target.value)}
        placeholder={field.placeholder}
        rows={field.type === 'tags' ? 2 : 3}
        className="mt-2 w-full resize-none rounded-2xl border border-brand-stone-200 bg-white/80 px-4 py-3 text-sm leading-relaxed text-brand-stone-800 outline-none transition placeholder:text-brand-stone-400 focus:border-brand-gold-400 focus:ring-2 focus:ring-brand-gold-100 dark:border-slate-700 dark:bg-slate-900/70 dark:text-slate-100 dark:placeholder:text-slate-500"
      />
    </label>
  );
}

export default function LifePracticeShell({ type, config }) {
  const [stepIndex, setStepIndex] = useState(0);
  const [form, setForm] = useState(emptyForm);
  const [parts, setParts] = useState([]);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(null);
  const [error, setError] = useState('');

  const progress = useMemo(() => Math.round(((stepIndex + 1) / config.steps.length) * 100), [config.steps.length, stepIndex]);

  useEffect(() => {
    const loadParts = async () => {
      const clientId = getClientId();
      if (!clientId) return;
      const { data, error: partsError } = await supabase
        .from('ifs_parts')
        .select('id, part_name, name, part_type, type')
        .eq('client_id', clientId)
        .order('updated_at', { ascending: false })
        .limit(30);
      if (!partsError) setParts(data || []);
    };
    loadParts();
  }, []);

  const updateField = (name, value) => setForm((current) => ({ ...current, [name]: value }));

  const handleSave = async () => {
    setSaving(true);
    setError('');
    setSaved(null);

    const payload = {
      reflection_type: type,
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

    const result = await saveLifeIntegrationReflection(payload);
    setSaving(false);
    if (result.error) {
      setError(result.error.message || 'Unable to save this reflection.');
      return;
    }
    setSaved(result.data);
  };

  return (
    <main className="min-h-screen bg-brand-sanctuary px-4 py-8 dark:bg-brand-midnight sm:px-6 lg:px-8">
      <div className="mx-auto max-w-4xl">
        <Link to="/life-integration" className="mb-6 inline-flex items-center gap-2 text-sm font-semibold text-brand-stone-600 transition hover:text-brand-gold-700 dark:text-slate-400 dark:hover:text-brand-gold-500">
          <ArrowLeft className="h-4 w-4" /> Back to IFS in Daily Life
        </Link>

        <section className="overflow-hidden rounded-[2rem] border border-brand-gold-100 bg-white/85 shadow-xl shadow-brand-gold-500/10 dark:border-slate-800 dark:bg-brand-cardDark/90">
          <div className="bg-gradient-to-br from-brand-gold-50 via-white to-brand-emerald-50 px-6 py-8 dark:from-brand-gold-950/20 dark:via-brand-cardDark dark:to-brand-emerald-950/20 sm:px-8">
            <div className="flex flex-col gap-5 md:flex-row md:items-start md:justify-between">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.26em] text-brand-gold-700 dark:text-brand-gold-500">{config.eyebrow}</p>
                <h1 className="mt-3 text-4xl font-serif font-normal text-brand-stone-900 dark:text-slate-100">{config.title}</h1>
                <p className="mt-3 max-w-2xl text-base leading-relaxed text-brand-stone-600 dark:text-slate-400">{config.description}</p>
              </div>
              <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-3xl bg-white text-3xl shadow-sm dark:bg-slate-900/70">{config.icon}</div>
            </div>
            <div className="mt-8 h-2 rounded-full bg-white/80 dark:bg-slate-900/60">
              <div className="h-full rounded-full bg-brand-gold-600 transition-all" style={{ width: `${progress}%` }} />
            </div>
          </div>

          <div className="grid gap-0 lg:grid-cols-[1fr_0.9fr]">
            <div className="border-b border-brand-stone-100 p-6 dark:border-slate-800 sm:p-8 lg:border-b-0 lg:border-r">
              <p className="mb-3 text-xs font-bold uppercase tracking-[0.22em] text-brand-emerald-700 dark:text-brand-emerald-100">Step {stepIndex + 1} of {config.steps.length}</p>
              <div className="rounded-3xl bg-brand-stone-50 p-6 dark:bg-slate-900/50">
                <p className="text-2xl font-serif leading-relaxed text-brand-stone-900 dark:text-slate-100">{config.steps[stepIndex]}</p>
                <p className="mt-4 text-sm leading-relaxed text-brand-stone-600 dark:text-slate-400">There is no right way to do this. Go gently. You can stop at any time.</p>
              </div>
              <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
                <button
                  type="button"
                  onClick={() => setStepIndex((index) => Math.max(0, index - 1))}
                  disabled={stepIndex === 0}
                  className="btn-sanctuary-secondary disabled:cursor-not-allowed disabled:opacity-40"
                >
                  <ArrowLeft className="h-4 w-4" /> Previous
                </button>
                <button
                  type="button"
                  onClick={() => setStepIndex((index) => Math.min(config.steps.length - 1, index + 1))}
                  disabled={stepIndex === config.steps.length - 1}
                  className="btn-sanctuary-primary disabled:cursor-not-allowed disabled:opacity-40"
                >
                  Next <ArrowRight className="h-4 w-4" />
                </button>
              </div>
            </div>

            <div className="p-6 sm:p-8">
              <div className="mb-5">
                <h2 className="text-xl font-semibold text-brand-stone-900 dark:text-slate-100">Optional reflection</h2>
                <p className="mt-2 text-sm leading-relaxed text-brand-stone-600 dark:text-slate-400">Write only what helps. Your Advisor can review your reflections to support your work together, or you can skip writing and keep practicing offline.</p>
              </div>

              <div className="space-y-4">
                {config.fields.map((field) => (
                  <Field key={field.name} field={field} value={form[field.name] || ''} onChange={updateField} />
                ))}

                <label className="block">
                  <span className="text-sm font-semibold text-brand-stone-800 dark:text-slate-200">Connect to an existing part (optional)</span>
                  <select
                    value={form.part_id}
                    onChange={(event) => updateField('part_id', event.target.value)}
                    className="mt-2 w-full rounded-2xl border border-brand-stone-200 bg-white/80 px-4 py-3 text-sm text-brand-stone-800 outline-none transition focus:border-brand-gold-400 focus:ring-2 focus:ring-brand-gold-100 dark:border-slate-700 dark:bg-slate-900/70 dark:text-slate-100"
                  >
                    <option value="">No linked part</option>
                    {parts.map((part) => (
                      <option key={part.id} value={part.id}>{part.part_name || part.name || 'Unnamed part'}{part.part_type || part.type ? ` · ${part.part_type || part.type}` : ''}</option>
                    ))}
                  </select>
                </label>

                <div className="flex items-start gap-3 rounded-2xl border border-brand-emerald-100 bg-brand-emerald-50/70 p-4 dark:border-brand-emerald-900/40 dark:bg-brand-emerald-950/20">
                  <Check className="mt-0.5 h-4 w-4 text-brand-emerald-700 dark:text-brand-emerald-100" />
                  <span>
                    <span className="flex items-center gap-2 text-sm font-semibold text-brand-stone-900 dark:text-slate-100">Visible to Advisor</span>
                    <span className="mt-1 block text-xs leading-relaxed text-brand-stone-600 dark:text-slate-400">Your Advisor can review this to support your work together.</span>
                  </span>
                </div>

                {error && <p className="rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-700 dark:bg-red-950/20 dark:text-red-300">{error}</p>}
                {saved && <p className="rounded-2xl bg-brand-emerald-50 px-4 py-3 text-sm font-semibold text-brand-emerald-700 dark:bg-brand-emerald-950/30 dark:text-brand-emerald-100"><Check className="mr-2 inline h-4 w-4" />Reflection saved.</p>}

                <div className="grid gap-3 sm:grid-cols-2">
                  <button type="button" onClick={handleSave} disabled={saving} className="btn-sanctuary-primary justify-center disabled:opacity-60">
                    {saving ? 'Saving…' : 'Save reflection'}
                  </button>
                  <Link to="/life-integration" className="btn-sanctuary-secondary justify-center">
                    Skip writing
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="mt-6 rounded-3xl border border-brand-stone-100 bg-white/75 p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900/45">
          <div className="flex items-start gap-3">
            <PenLine className="mt-1 h-5 w-5 shrink-0 text-brand-gold-700 dark:text-brand-gold-500" />
            <div>
              <h2 className="text-base font-semibold text-brand-stone-900 dark:text-slate-100">Keep going gently</h2>
              <p className="mt-1 text-sm leading-relaxed text-brand-stone-600 dark:text-slate-400">This Daily Life Practice can connect back into your IFS Path and the tools you already use.</p>
              <div className="mt-4 flex flex-wrap gap-2">
                <Link to="/curriculum" className="rounded-full bg-brand-emerald-50 px-3 py-1.5 text-xs font-semibold text-brand-emerald-700 transition hover:bg-brand-emerald-100 dark:bg-brand-emerald-950/30 dark:text-brand-emerald-100">Continue Curriculum</Link>
                <Link to="/journal" className="rounded-full bg-brand-gold-50 px-3 py-1.5 text-xs font-semibold text-brand-gold-700 transition hover:bg-brand-gold-100 dark:bg-brand-gold-950/30 dark:text-brand-gold-500">Open Journal</Link>
                {(config.relatedLinks || []).map((link) => (
                  <Link key={`${link.label}-${link.to}`} to={link.to} className="rounded-full bg-brand-stone-100 px-3 py-1.5 text-xs font-semibold text-brand-stone-700 transition hover:bg-brand-stone-200 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700">{link.label}</Link>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section className="mt-6 grid gap-4 md:grid-cols-2">
          <div className="rounded-3xl bg-white/70 p-5 text-sm leading-relaxed text-brand-stone-600 shadow-sm dark:bg-slate-900/40 dark:text-slate-400">
            <ShieldCheck className="mb-2 h-5 w-5 text-brand-emerald-700 dark:text-brand-emerald-100" />
            Your Advisor can review your reflections to support your work together.
          </div>
          <div className="rounded-3xl bg-white/70 p-5 text-sm leading-relaxed text-brand-stone-600 shadow-sm dark:bg-slate-900/40 dark:text-slate-400">
            <Heart className="mb-2 h-5 w-5 text-brand-gold-700 dark:text-brand-gold-500" />
            These practices support reflection and IFS self-guidance. They are not monitored for emergencies. If you are in immediate danger or may harm yourself or someone else, call 911 or your local crisis line now.
          </div>
        </section>
      </div>
    </main>
  );
}
