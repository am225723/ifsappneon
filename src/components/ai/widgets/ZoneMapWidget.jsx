const DEFAULT_ZONES = ['Close to Self', 'Nearby', 'Protective edge', 'Deeply blended'];
function labelOf(item, index) { return typeof item === 'string' ? item : item?.label || item?.name || item?.id || `Part ${index + 1}`; }

export default function ZoneMapWidget({ label, core = 'Self-energy', rings = [], nodes = [], value = {}, onChange, readOnly = false }) {
  const zones = (Array.isArray(rings) && rings.length ? rings : DEFAULT_ZONES).map(String).slice(0, 5);
  const nodeLabels = (Array.isArray(nodes) && nodes.length ? nodes : ['Part or pattern']).map(labelOf).slice(0, 8);
  const placements = value?.placements || {};
  const setPlacement = (node, zone) => onChange?.({ placements: { ...placements, [node]: zone } });
  const onDropZone = (event, zone) => { event.preventDefault(); const node = event.dataTransfer.getData('text/plain'); if (node && !readOnly) setPlacement(node, zone); };
  return (
    <fieldset className="rounded-2xl border border-brand-stone-200 bg-white/80 p-4 dark:border-slate-700 dark:bg-slate-900/60">
      <legend className="px-1 text-sm font-semibold">{label || 'Zone map'}</legend>
      <p className="mt-1 text-xs text-brand-stone-500 dark:text-slate-400">Move parts closer or farther from {core}. Placement is exploration, not judgment.</p>
      <div className="mt-4 grid gap-4 lg:grid-cols-[1fr_1.4fr]">
        <div className="space-y-2">{nodeLabels.map(node => <div key={node} draggable={!readOnly} onDragStart={(event) => event.dataTransfer.setData('text/plain', node)} className="rounded-xl border border-brand-stone-200 bg-white p-3 text-sm shadow-sm dark:border-slate-700 dark:bg-slate-900"><p className="font-medium">{node}</p>{!readOnly && <label className="mt-2 block text-xs">Place in zone<select value={placements[node] || ''} onChange={(event) => setPlacement(node, event.target.value)} className="mt-1 w-full rounded-lg border border-brand-stone-200 bg-white px-2 py-1 dark:border-slate-700 dark:bg-slate-950"><option value="">Choose…</option>{zones.map(zone => <option key={zone} value={zone}>{zone}</option>)}</select></label>}</div>)}</div>
        <div className="rounded-2xl border border-brand-sage-200 bg-brand-sage-50/40 p-4 dark:border-emerald-900/50 dark:bg-emerald-950/20"><div className="grid gap-3">{zones.map((zone, index) => <section key={zone} onDragOver={(event) => event.preventDefault()} onDrop={(event) => onDropZone(event, zone)} className="rounded-2xl border border-dashed border-brand-sage-300 bg-white/70 p-3 dark:border-slate-700 dark:bg-slate-900/70"><h4 className="text-sm font-semibold">{index === 0 ? `${zone} · ${core}` : zone}</h4><div className="mt-2 flex flex-wrap gap-2">{nodeLabels.filter(node => placements[node] === zone).map(node => <span key={node} className="rounded-full bg-brand-gold-100 px-3 py-1 text-xs text-brand-stone-700">{node}</span>)}</div></section>)}</div></div>
      </div>
    </fieldset>
  );
}
