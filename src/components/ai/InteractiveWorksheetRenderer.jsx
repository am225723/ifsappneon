import { useMemo, useState } from 'react';
import FormattedAIContent from './FormattedAIContent';

export const ACTIVITY_BLOCK_TYPES = ['instruction', 'question', 'textarea', 'checklist', 'rating', 'virtual_paper', 'sort', 'match'];

export function parseActivityBlocks(source) {
  if (!source) return [];
  if (Array.isArray(source)) return source;
  if (typeof source === 'object' && Array.isArray(source.blocks)) return source.blocks;
  if (typeof source !== 'string') return [];
  const fenced = source.match(/```json\s*([\s\S]*?)```/i)?.[1];
  const candidate = fenced || source;
  try {
    const parsed = JSON.parse(candidate);
    return Array.isArray(parsed) ? parsed : Array.isArray(parsed?.blocks) ? parsed.blocks : [];
  } catch {
    return [];
  }
}

export default function InteractiveWorksheetRenderer({ blocks, fallbackText = '', value = {}, onChange }) {
  const parsedBlocks = useMemo(() => parseActivityBlocks(blocks), [blocks]);
  const [localValue, setLocalValue] = useState(value || {});
  const current = onChange ? value || {} : localValue;
  const update = (id, next) => {
    const merged = { ...current, [id]: next };
    if (onChange) onChange(merged); else setLocalValue(merged);
  };

  if (!parsedBlocks.length) {
    return (
      <div className="space-y-4">
        <FormattedAIContent content={fallbackText} />
        <label className="block rounded-2xl border border-brand-stone-200 bg-white/80 p-4 dark:border-slate-700 dark:bg-slate-900/60">
          <span className="text-sm font-semibold text-brand-stone-800 dark:text-slate-200">Virtual paper</span>
          <textarea value={current.virtual_paper || ''} onChange={(event) => update('virtual_paper', event.target.value)} rows={5} className="mt-2 w-full rounded-xl border border-brand-stone-200 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-950" placeholder="Write your response here inside the app..." />
        </label>
      </div>
    );
  }

  return <div className="space-y-4">{parsedBlocks.map((block, index) => {
    const id = block.id || `block_${index}`;
    const type = block.type || 'instruction';
    if (type === 'instruction') return <div key={id} className="rounded-2xl bg-brand-gold-50 p-4 dark:bg-brand-gold-950/20"><FormattedAIContent content={block.text || block.prompt || ''} /></div>;
    if (type === 'checklist') return <fieldset key={id} className="rounded-2xl border border-brand-stone-200 p-4 dark:border-slate-700"><legend className="px-1 text-sm font-semibold">{block.label || block.prompt || 'Checklist'}</legend>{(block.items || []).map((item) => <label key={item} className="mt-2 flex items-center gap-2 text-sm"><input type="checkbox" checked={(current[id] || []).includes(item)} onChange={(event) => update(id, event.target.checked ? [...(current[id] || []), item] : (current[id] || []).filter((x) => x !== item))} />{item}</label>)}</fieldset>;
    if (type === 'rating') return <label key={id} className="block rounded-2xl border border-brand-stone-200 p-4 dark:border-slate-700"><span className="text-sm font-semibold">{block.label || block.prompt || 'Rating'}</span><input type="range" min={block.min || 1} max={block.max || 10} value={current[id] || block.min || 1} onChange={(event) => update(id, event.target.value)} className="mt-3 w-full" /><span className="text-xs">{current[id] || block.min || 1}</span></label>;
    return <label key={id} className="block rounded-2xl border border-brand-stone-200 p-4 dark:border-slate-700"><span className="text-sm font-semibold">{block.label || block.prompt || (type === 'virtual_paper' ? 'Virtual paper' : 'Reflection prompt')}</span><textarea value={current[id] || ''} onChange={(event) => update(id, event.target.value)} rows={type === 'question' ? 2 : 5} className="mt-2 w-full rounded-xl border border-brand-stone-200 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-950" /></label>;
  })}</div>;
}
