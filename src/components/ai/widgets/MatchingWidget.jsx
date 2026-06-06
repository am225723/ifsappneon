function normalizeItem(item, index, prefix) {
  if (typeof item === 'string') return { id: item, label: item };
  return { id: String(item?.id || item?.value || item?.label || item?.text || `${prefix}_${index + 1}`), label: item?.label || item?.text || String(item?.value || `Item ${index + 1}`) };
}

export default function MatchingWidget({ label, left = [], right = [], value = {}, onChange, readOnly = false }) {
  const leftItems = (Array.isArray(left) ? left : []).map((item, index) => normalizeItem(item, index, 'left')).slice(0, 6);
  const rightItems = (Array.isArray(right) ? right : []).map((item, index) => normalizeItem(item, index, 'right')).slice(0, 6);
  const pairs = Array.isArray(value?.pairs) ? value.pairs : [];
  const pairFor = (leftId) => pairs.find(pair => pair.leftId === leftId);
  const match = (leftItem, rightId) => {
    const rightItem = rightItems.find(item => item.id === rightId);
    const filtered = pairs.filter(pair => pair.leftId !== leftItem.id && pair.rightId !== rightId);
    onChange?.({ pairs: rightId ? [...filtered, { leftId: leftItem.id, leftLabel: leftItem.label, rightId, rightLabel: rightItem?.label || rightId }] : filtered });
  };
  const onDropRight = (event, rightId) => {
    event.preventDefault();
    const leftId = event.dataTransfer.getData('text/plain');
    const leftItem = leftItems.find(item => item.id === leftId);
    if (leftItem && !readOnly) match(leftItem, rightId);
  };
  return (
    <fieldset className="rounded-2xl border border-brand-stone-200 bg-white/80 p-4 dark:border-slate-700 dark:bg-slate-900/60">
      <legend className="px-1 text-sm font-semibold text-brand-stone-800 dark:text-slate-100">{label || 'Match the pairs'}</legend>
      <p className="mt-1 text-xs text-brand-stone-500 dark:text-slate-400">Drag a left card onto a right card, or choose a pairing from the menu.</p>
      <div className="mt-4 grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          {leftItems.map(leftItem => {
            const current = pairFor(leftItem.id);
            return <div key={leftItem.id} draggable={!readOnly} onDragStart={(event) => event.dataTransfer.setData('text/plain', leftItem.id)} className="rounded-xl border border-brand-stone-200 bg-white p-3 shadow-sm dark:border-slate-700 dark:bg-slate-900"><p className="text-sm font-medium">{leftItem.label}</p>{!readOnly && <div className="mt-2 flex gap-2"><select value={current?.rightId || ''} onChange={(event) => match(leftItem, event.target.value)} className="min-w-0 flex-1 rounded-lg border border-brand-stone-200 bg-white px-2 py-1 text-xs dark:border-slate-700 dark:bg-slate-950"><option value="">Choose match…</option>{rightItems.map(item => <option key={item.id} value={item.id}>{item.label}</option>)}</select>{current && <button type="button" onClick={() => match(leftItem, '')} className="rounded-lg border border-brand-stone-200 px-2 py-1 text-xs">Clear match</button>}</div>}{current && <p className="mt-2 text-xs text-emerald-700 dark:text-emerald-300">Paired with {current.rightLabel}</p>}</div>;
          })}
        </div>
        <div className="space-y-2">
          {rightItems.map(rightItem => <div key={rightItem.id} onDragOver={(event) => event.preventDefault()} onDrop={(event) => onDropRight(event, rightItem.id)} className="rounded-xl border border-dashed border-brand-sage-300 bg-brand-sage-50/70 p-3 text-sm dark:border-emerald-900/50 dark:bg-emerald-950/20"><span className="font-medium">{rightItem.label}</span><p className="mt-1 text-xs text-brand-stone-500">{pairs.find(pair => pair.rightId === rightItem.id)?.leftLabel || 'Drop a matching card here.'}</p></div>)}
        </div>
      </div>
    </fieldset>
  );
}
