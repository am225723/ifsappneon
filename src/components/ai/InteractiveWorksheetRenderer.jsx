import { useMemo, useState } from 'react';
import FormattedAIContent from './FormattedAIContent';
import { parseInteractiveShortcodes } from '../../lib/interactiveShortcodeParser';

export const ACTIVITY_BLOCK_TYPES = ['instruction', 'question', 'textarea', 'checklist', 'rating', 'virtual_paper', 'sort', 'match', 'body_map', 'zone_map', 'blank', 'slider', 'timeline', 'focus_card'];

export function parseActivityBlocks(source) {
  if (!source) return [];
  if (Array.isArray(source)) return source;
  if (typeof source === 'object' && Array.isArray(source.blocks)) return source.blocks;
  if (typeof source !== 'string') return [];
  const shortcodeBlocks = parseInteractiveShortcodes(source);
  if (shortcodeBlocks.length) return shortcodeBlocks;
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
      const columns = block.columns || [];
      return (
        <fieldset key={id} className="rounded-2xl border border-brand-stone-200 p-4 dark:border-slate-700">
          <legend className="px-1 text-sm font-semibold">{blockLabel(block, 'Sort these items')}</legend>
          <p className="mt-1 text-xs text-brand-stone-500 dark:text-slate-400">{columns.length ? 'Choose the column that best fits each item.' : 'Number the items in the order that fits your experience.'}</p>
          <div className="mt-3 space-y-2">
            {normalizeOptions(block).map((item, itemIndex) => {
              const itemText = typeof item === 'string' ? item : item.label || item.text || String(item.value || `Item ${itemIndex + 1}`);
              return columns.length
                ? <label key={itemText} className="block text-sm"><span className="font-medium">{itemText}</span><select className="mt-1 w-full rounded-xl border border-brand-stone-200 bg-white px-3 py-2 dark:border-slate-700 dark:bg-slate-950" value={current[id]?.[itemText] || ''} onChange={(event) => update(id, { ...(current[id] || {}), [itemText]: event.target.value })}><option value="">Choose a column...</option>{columns.map((column) => <option key={column} value={column}>{column}</option>)}</select></label>
                : <label key={itemText} className="flex items-center gap-3 text-sm"><input type="number" min="1" className="w-16 rounded-lg border border-brand-stone-200 px-2 py-1 dark:border-slate-700 dark:bg-slate-950" value={current[id]?.[itemText] || ''} onChange={(event) => update(id, { ...(current[id] || {}), [itemText]: event.target.value })} /><span>{itemText}</span></label>;
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

    if (type === 'body_map') {
      const areas = block.presets?.length ? block.presets : ['Head/face', 'Throat', 'Chest/heart', 'Belly', 'Shoulders', 'Hands', 'Back', 'Legs/feet'];
      return (
        <fieldset key={id} className="rounded-2xl border border-brand-stone-200 p-4 dark:border-slate-700">
          <legend className="px-1 text-sm font-semibold">{blockLabel(block, 'Body map')}</legend>
          <p className="mt-1 text-xs text-brand-stone-500 dark:text-slate-400">{block.prompt || 'Select places you notice sensation, then add any notes.'}</p>
          <div className="mt-3 grid gap-2 sm:grid-cols-2">{areas.map((area) => <label key={area} className="flex items-center gap-2 rounded-xl border border-brand-stone-200 px-3 py-2 text-sm dark:border-slate-700"><input type="checkbox" checked={(current[id]?.areas || []).includes(area)} onChange={(event) => update(id, { ...(current[id] || {}), areas: event.target.checked ? [...(current[id]?.areas || []), area] : (current[id]?.areas || []).filter((x) => x !== area) })} />{area}</label>)}</div>
          <textarea value={current[id]?.notes || ''} onChange={(event) => update(id, { ...(current[id] || {}), notes: event.target.value })} rows={3} className="mt-3 w-full rounded-xl border border-brand-stone-200 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-950" placeholder="What do you notice?" />
        </fieldset>
      );
    }

    if (type === 'zone_map') {
      const rings = block.rings?.length ? block.rings : ['Close to Self', 'Nearby', 'Protective edge', 'Deeply blended'];
      const nodes = block.nodes?.length ? block.nodes : ['Part or pattern'];
      return <fieldset key={id} className="rounded-2xl border border-brand-stone-200 p-4 dark:border-slate-700"><legend className="px-1 text-sm font-semibold">{blockLabel(block, 'Zone map')}</legend><p className="mt-1 text-xs text-brand-stone-500 dark:text-slate-400">Core: {block.core || 'Self-energy'}</p><div className="mt-3 space-y-3">{nodes.map((node) => <label key={node} className="block text-sm"><span className="font-medium">{node}</span><select className="mt-1 w-full rounded-xl border border-brand-stone-200 bg-white px-3 py-2 dark:border-slate-700 dark:bg-slate-950" value={current[id]?.[node] || ''} onChange={(event) => update(id, { ...(current[id] || {}), [node]: event.target.value })}><option value="">Choose proximity...</option>{rings.map((ring) => <option key={ring} value={ring}>{ring}</option>)}</select></label>)}</div></fieldset>;
    }

    if (type === 'blank') {
      return <fieldset key={id} className="rounded-2xl border border-brand-stone-200 p-4 dark:border-slate-700"><legend className="px-1 text-sm font-semibold">{blockLabel(block, 'Fill in the blanks')}</legend><div className="mt-3 flex flex-wrap items-center gap-2 text-sm">{(block.template || []).map((segment, segmentIndex) => segment.type === 'input' ? <input key={segmentIndex} value={current[id]?.[segmentIndex] || ''} onChange={(event) => update(id, { ...(current[id] || {}), [segmentIndex]: event.target.value })} placeholder={segment.placeholder} className="min-w-40 rounded-lg border border-brand-stone-200 px-2 py-1 dark:border-slate-700 dark:bg-slate-950" /> : <span key={segmentIndex}>{segment.text}</span>)}</div></fieldset>;
    }

    if (type === 'slider') {
      const metrics = block.metrics?.length ? block.metrics : [{ id: 'rating', label: blockLabel(block, 'Rating') }];
      return <fieldset key={id} className="rounded-2xl border border-brand-stone-200 p-4 dark:border-slate-700"><legend className="px-1 text-sm font-semibold">{blockLabel(block, 'Sliders')}</legend><div className="mt-3 space-y-3">{metrics.map((metric) => { const metricId = metric.id || metric.label; return <label key={metricId} className="block text-sm"><span className="font-medium">{metric.label || metricId}</span><input type="range" min={block.min ?? 0} max={block.max ?? 10} value={current[id]?.[metricId] || block.min || 0} onChange={(event) => update(id, { ...(current[id] || {}), [metricId]: event.target.value })} className="mt-2 w-full" /><span className="text-xs text-brand-stone-500">{current[id]?.[metricId] || block.min || 0}</span></label>; })}</div></fieldset>;
    }

    if (type === 'timeline') {
      return <label key={id} className="block rounded-2xl border border-brand-stone-200 p-4 dark:border-slate-700"><span className="text-sm font-semibold">{blockLabel(block, 'Timeline anchor')}</span><p className="mt-1 text-xs text-brand-stone-500 dark:text-slate-400">{block.prompt}</p><input value={current[id]?.anchor || ''} onChange={(event) => update(id, { ...(current[id] || {}), anchor: event.target.value })} className="mt-3 w-full rounded-xl border border-brand-stone-200 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-950" placeholder={block.range || 'Approximate age or season'} /><textarea value={current[id]?.notes || ''} onChange={(event) => update(id, { ...(current[id] || {}), notes: event.target.value })} rows={3} className="mt-2 w-full rounded-xl border border-brand-stone-200 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-950" placeholder="What made this strategy important?" /></label>;
    }

    if (type === 'focus_card') {
      return <div key={id} className="rounded-2xl border border-brand-gold-200 bg-brand-gold-50/70 p-4 text-sm dark:border-brand-gold-900/40 dark:bg-brand-gold-950/20"><p className="font-semibold">{blockLabel(block, 'Focus card')}</p><p className="mt-1 text-brand-stone-600 dark:text-slate-400">Review this part field only if it is already available in your current client-owned or Advisor-scoped data.</p><p className="mt-2 text-xs uppercase tracking-wide text-brand-stone-500">Field: {block.field || 'part focus'} · Part: {block.part_id || 'selected part'}</p><textarea value={current[id] || ''} onChange={(event) => update(id, event.target.value)} rows={3} className="mt-3 w-full rounded-xl border border-brand-stone-200 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-950" placeholder="What feels important to review?" /></div>;
    }

    return <label key={id} className="block rounded-2xl border border-brand-stone-200 p-4 dark:border-slate-700"><span className="text-sm font-semibold">{blockLabel(block, type === 'virtual_paper' ? 'Virtual paper' : 'Reflection prompt')}</span><textarea value={current[id] || ''} onChange={(event) => update(id, event.target.value)} rows={type === 'question' ? 2 : 5} className="mt-2 w-full rounded-xl border border-brand-stone-200 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-950" /></label>;
  })}</div>;
}
