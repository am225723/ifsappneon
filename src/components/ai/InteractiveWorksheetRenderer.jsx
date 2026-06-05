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

function normalizeOptions(block) {
  return block.options || block.items || block.prompts || [];
}

function blockLabel(block, fallback) {
  return block.label || block.prompt || block.text || fallback;
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
    const type = ACTIVITY_BLOCK_TYPES.includes(block.type) ? block.type : 'instruction';

    if (type === 'instruction') {
      return <div key={id} className="rounded-2xl bg-brand-gold-50 p-4 dark:bg-brand-gold-950/20"><FormattedAIContent content={block.text || block.prompt || ''} /></div>;
    }

    if (type === 'checklist') {
      return (
        <fieldset key={id} className="rounded-2xl border border-brand-stone-200 p-4 dark:border-slate-700">
          <legend className="px-1 text-sm font-semibold">{blockLabel(block, 'Checklist')}</legend>
          {normalizeOptions(block).map((item) => {
            const itemText = typeof item === 'string' ? item : item.label || item.text || String(item.value || 'Option');
            return <label key={itemText} className="mt-2 flex items-center gap-2 text-sm"><input type="checkbox" checked={(current[id] || []).includes(itemText)} onChange={(event) => update(id, event.target.checked ? [...(current[id] || []), itemText] : (current[id] || []).filter((x) => x !== itemText))} />{itemText}</label>;
          })}
        </fieldset>
      );
    }

    if (type === 'rating') {
      return <label key={id} className="block rounded-2xl border border-brand-stone-200 p-4 dark:border-slate-700"><span className="text-sm font-semibold">{blockLabel(block, 'Rating')}</span><input type="range" min={block.min || 1} max={block.max || 10} value={current[id] || block.min || 1} onChange={(event) => update(id, event.target.value)} className="mt-3 w-full" /><span className="text-xs">{current[id] || block.min || 1}</span></label>;
    }

    if (type === 'sort') {
      return (
        <fieldset key={id} className="rounded-2xl border border-brand-stone-200 p-4 dark:border-slate-700">
          <legend className="px-1 text-sm font-semibold">{blockLabel(block, 'Sort these items')}</legend>
          <p className="mt-1 text-xs text-brand-stone-500 dark:text-slate-400">Number the items in the order that fits your experience.</p>
          <div className="mt-3 space-y-2">
            {normalizeOptions(block).map((item, itemIndex) => {
              const itemText = typeof item === 'string' ? item : item.label || item.text || String(item.value || `Item ${itemIndex + 1}`);
              return <label key={itemText} className="flex items-center gap-3 text-sm"><input type="number" min="1" className="w-16 rounded-lg border border-brand-stone-200 px-2 py-1 dark:border-slate-700 dark:bg-slate-950" value={current[id]?.[itemText] || ''} onChange={(event) => update(id, { ...(current[id] || {}), [itemText]: event.target.value })} /><span>{itemText}</span></label>;
            })}
          </div>
        </fieldset>
      );
    }

    if (type === 'match') {
      const leftItems = block.left || block.items || [];
      const rightItems = block.right || block.options || [];
      return (
        <fieldset key={id} className="rounded-2xl border border-brand-stone-200 p-4 dark:border-slate-700">
          <legend className="px-1 text-sm font-semibold">{blockLabel(block, 'Match the pairs')}</legend>
          <div className="mt-3 space-y-3">
            {leftItems.map((item, itemIndex) => {
              const itemText = typeof item === 'string' ? item : item.label || item.text || String(item.value || `Item ${itemIndex + 1}`);
              return (
                <label key={itemText} className="block text-sm">
                  <span className="font-medium">{itemText}</span>
                  <select className="mt-1 w-full rounded-xl border border-brand-stone-200 bg-white px-3 py-2 dark:border-slate-700 dark:bg-slate-950" value={current[id]?.[itemText] || ''} onChange={(event) => update(id, { ...(current[id] || {}), [itemText]: event.target.value })}>
                    <option value="">Choose a match...</option>
                    {rightItems.map((option, optionIndex) => {
                      const optionText = typeof option === 'string' ? option : option.label || option.text || String(option.value || `Option ${optionIndex + 1}`);
                      return <option key={optionText} value={optionText}>{optionText}</option>;
                    })}
                  </select>
                </label>
              );
            })}
          </div>
        </fieldset>
      );
    }

    return <label key={id} className="block rounded-2xl border border-brand-stone-200 p-4 dark:border-slate-700"><span className="text-sm font-semibold">{blockLabel(block, type === 'virtual_paper' ? 'Virtual paper' : 'Reflection prompt')}</span><textarea value={current[id] || ''} onChange={(event) => update(id, event.target.value)} rows={type === 'question' ? 2 : 5} className="mt-2 w-full rounded-xl border border-brand-stone-200 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-950" /></label>;
  })}</div>;
}
