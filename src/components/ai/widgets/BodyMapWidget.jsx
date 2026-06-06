const DEFAULT_AREAS = ['Head/face', 'Throat', 'Shoulders', 'Chest/heart', 'Belly', 'Back', 'Hands', 'Legs/feet'];
const areaId = (label) => String(label).toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '');

export default function BodyMapWidget({ prompt, presets = [], value = {}, onChange, readOnly = false }) {
  const selectedAreas = Array.isArray(value?.selectedAreas) ? value.selectedAreas : [];
  const presetsUsed = Array.isArray(value?.presetsUsed) ? value.presetsUsed : [];
  const areas = [...new Set([...DEFAULT_AREAS, ...(Array.isArray(presets) ? presets.map(p => typeof p === 'string' ? p : p.label || p.area).filter(Boolean) : [])])].slice(0, 12);
  const getArea = (label) => selectedAreas.find(item => item.area === areaId(label));
  const setArea = (label, patch) => {
    const idValue = areaId(label);
    const existing = getArea(label) || { area: idValue, label, intensity: 5, note: '' };
    const nextArea = { ...existing, ...patch };
    const next = selectedAreas.filter(item => item.area !== idValue);
    onChange?.({ selectedAreas: patch.selected === false ? next : [...next, nextArea].sort((a, b) => a.label.localeCompare(b.label)), presetsUsed });
  };
  const togglePreset = (preset) => {
    const label = typeof preset === 'string' ? preset : preset.label || preset.area;
    const nextUsed = presetsUsed.includes(label) ? presetsUsed.filter(item => item !== label) : [...presetsUsed, label];
    if (!getArea(label) && !presetsUsed.includes(label)) {
      onChange?.({ selectedAreas: [...selectedAreas, { area: areaId(label), label, intensity: 5, note: '' }], presetsUsed: nextUsed });
    } else {
      onChange?.({ selectedAreas, presetsUsed: nextUsed });
    }
  };
  return (
    <fieldset className="rounded-2xl border border-brand-stone-200 bg-white/80 p-4 dark:border-slate-700 dark:bg-slate-900/60">
      <legend className="px-1 text-sm font-semibold">Body map</legend>
      <p className="mt-1 text-xs text-brand-stone-500 dark:text-slate-400">{prompt || 'Notice where this part shows up in or around your body.'}</p>
      {presets?.length > 0 && <div className="mt-3 flex flex-wrap gap-2">{presets.slice(0, 8).map((preset) => { const label = typeof preset === 'string' ? preset : preset.label || preset.area; return <button key={label} type="button" disabled={readOnly} onClick={() => togglePreset(preset)} className={`rounded-full border px-3 py-1 text-xs ${presetsUsed.includes(label) ? 'border-brand-gold-300 bg-brand-gold-100 text-brand-stone-800' : 'border-brand-stone-200 bg-white text-brand-stone-600'}`}>{label}</button>; })}</div>}
      <div className="mt-4 grid gap-3 md:grid-cols-[0.7fr_1.3fr]">
        <div className="rounded-[2rem] border border-brand-sage-200 bg-gradient-to-b from-brand-sage-50 to-brand-gold-50 p-4 text-center dark:border-emerald-900/50 dark:from-emerald-950/20 dark:to-slate-900"><div className="mx-auto h-10 w-10 rounded-full border-2 border-brand-sage-400" /><div className="mx-auto mt-1 h-32 w-20 rounded-[3rem] border-2 border-brand-sage-400" /><div className="mx-auto mt-1 grid w-32 grid-cols-2 gap-8"><div className="h-20 rounded-full border-2 border-brand-sage-400" /><div className="h-20 rounded-full border-2 border-brand-sage-400" /></div><p className="mt-3 text-xs text-brand-stone-500">Body-awareness only — not a medical assessment.</p></div>
        <div className="grid gap-2 sm:grid-cols-2">{areas.map(label => { const current = getArea(label); return <div key={label} className={`rounded-xl border p-3 ${current ? 'border-brand-sage-300 bg-brand-sage-50/70' : 'border-brand-stone-200 bg-white'} dark:border-slate-700 dark:bg-slate-900`}><label className="flex items-center gap-2 text-sm font-medium"><input type="checkbox" disabled={readOnly} checked={Boolean(current)} onChange={(event) => event.target.checked ? setArea(label, {}) : setArea(label, { selected: false })} />{label}</label>{current && <div className="mt-2 space-y-2"><label className="block text-xs">Intensity {current.intensity}<input type="range" min="1" max="10" disabled={readOnly} value={current.intensity || 5} onChange={(event) => setArea(label, { intensity: Number(event.target.value) })} className="w-full" /></label><input disabled={readOnly} value={current.note || ''} onChange={(event) => setArea(label, { note: event.target.value })} placeholder="Optional note" className="w-full rounded-lg border border-brand-stone-200 px-2 py-1 text-xs dark:border-slate-700 dark:bg-slate-950" /></div>}</div>; })}</div>
      </div>
    </fieldset>
  );
}
