export default function VirtualPaper({ prompt, value = {}, onChange, readOnly = false, lined = true }) {
  const text = typeof value === 'string' ? value : value?.text || '';
  return (
    <label className="block rounded-2xl border border-brand-stone-200 bg-white/80 p-4 dark:border-slate-700 dark:bg-slate-900/60">
      <span className="text-sm font-semibold text-brand-stone-800 dark:text-slate-100">{prompt || 'Use this space as your virtual piece of paper.'}</span>
      <textarea disabled={readOnly} value={text} onChange={(event) => onChange?.({ text: event.target.value })} rows={7} className={`mt-3 w-full rounded-xl border border-brand-stone-200 bg-white px-3 py-2 text-sm leading-7 dark:border-slate-700 dark:bg-slate-950 ${lined ? 'bg-[linear-gradient(transparent_30px,#e7dfd1_31px)] bg-[length:100%_31px]' : ''}`} placeholder="Write freely here inside the app..." />
      <div className="mt-2 flex items-center justify-between text-xs text-brand-stone-500"><span>{text.trim().split(/\s+/).filter(Boolean).length} words · {text.length} characters</span>{!readOnly && text && <button type="button" onClick={() => window.confirm('Clear this virtual paper response?') && onChange?.({ text: '' })} className="rounded-lg border border-brand-stone-200 px-2 py-1">Clear</button>}</div>
    </label>
  );
}
