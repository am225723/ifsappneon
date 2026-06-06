function normalizeItem(item, index) {
  if (typeof item === 'string') return { id: item, label: item };
  return { id: String(item?.id || item?.value || item?.label || item?.text || `card_${index + 1}`), label: item?.label || item?.text || String(item?.value || `Card ${index + 1}`) };
}

function ensureArray(value) { return Array.isArray(value) ? value : []; }

export default function SortingWidget({ label, items = [], columns = [], value = {}, onChange, readOnly = false }) {
  const cards = ensureArray(items).map(normalizeItem).slice(0, 8);
  const columnNames = ensureArray(columns).map(String).filter(Boolean).slice(0, 6);
  const assignments = value?.assignments || {};
  const sortedCount = cards.filter(card => assignments[card.id]).length;
  const updateCard = (cardId, columnName) => onChange?.({ assignments: { ...assignments, [cardId]: columnName } });
  const clearCard = (cardId) => {
    const next = { ...assignments };
    delete next[cardId];
    onChange?.({ assignments: next });
  };
  const onDropToColumn = (event, columnName) => {
    event.preventDefault();
    const cardId = event.dataTransfer.getData('text/plain');
    if (cardId && !readOnly) updateCard(cardId, columnName);
  };
  const renderCard = (card) => (
    <div key={card.id} draggable={!readOnly} onDragStart={(event) => event.dataTransfer.setData('text/plain', card.id)} className="rounded-xl border border-brand-stone-200 bg-white p-3 text-sm shadow-sm transition hover:border-brand-sage-300 hover:shadow-md dark:border-slate-700 dark:bg-slate-900" aria-label={`Sortable card: ${card.label}`}>
      <p className="font-medium text-brand-stone-800 dark:text-slate-100">{card.label}</p>
      {!readOnly && <label className="mt-2 block text-xs text-brand-stone-500 dark:text-slate-400">Move to…<select value={assignments[card.id] || ''} onChange={(event) => event.target.value ? updateCard(card.id, event.target.value) : clearCard(card.id)} className="mt-1 w-full rounded-lg border border-brand-stone-200 bg-white px-2 py-1 dark:border-slate-700 dark:bg-slate-950"><option value="">Unsorted</option>{columnNames.map(column => <option key={column} value={column}>{column}</option>)}</select></label>}
    </div>
  );
  return (
    <fieldset className="rounded-2xl border border-brand-stone-200 bg-white/80 p-4 dark:border-slate-700 dark:bg-slate-900/60">
      <legend className="px-1 text-sm font-semibold text-brand-stone-800 dark:text-slate-100">{label || 'Sort these items'}</legend>
      <p className="mt-1 text-xs text-brand-stone-500 dark:text-slate-400">Drag cards into a column, or use each card’s “Move to…” menu. {sortedCount} of {cards.length} cards sorted.</p>
      <div className="mt-4 grid gap-3 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.6fr)]">
        <section className="rounded-2xl border border-dashed border-brand-stone-300 bg-brand-stone-50/70 p-3 dark:border-slate-700 dark:bg-slate-950/40" onDragOver={(event) => event.preventDefault()} onDrop={(event) => { event.preventDefault(); const cardId = event.dataTransfer.getData('text/plain'); if (cardId) clearCard(cardId); }}>
          <h4 className="text-xs font-semibold uppercase tracking-wide text-brand-stone-500">Unsorted</h4>
          <div className="mt-2 space-y-2">{cards.filter(card => !assignments[card.id]).map(renderCard)}{sortedCount === cards.length && <p className="text-xs text-brand-stone-500">All cards have a place for now.</p>}</div>
        </section>
        <div className="grid gap-3 sm:grid-cols-2">
          {columnNames.map(column => (
            <section key={column} onDragOver={(event) => event.preventDefault()} onDrop={(event) => onDropToColumn(event, column)} className="min-h-32 rounded-2xl border border-brand-sage-200 bg-brand-sage-50/60 p-3 dark:border-emerald-900/50 dark:bg-emerald-950/20" aria-label={`Drop zone: ${column}`}>
              <h4 className="text-sm font-semibold text-brand-stone-800 dark:text-slate-100">{column}</h4>
              <div className="mt-2 space-y-2">{cards.filter(card => assignments[card.id] === column).map(renderCard)}</div>
            </section>
          ))}
        </div>
      </div>
    </fieldset>
  );
}
