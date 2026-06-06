import { useMemo, useState } from 'react';
import FormattedAIContent from './FormattedAIContent';
import { parseInteractiveShortcodes } from '../../lib/interactiveShortcodeParser';
import { initializeWorksheetState, updateWidgetResponse } from '../../lib/interactiveWorksheetState';
import SortingWidget from './widgets/SortingWidget';
import MatchingWidget from './widgets/MatchingWidget';
import BodyMapWidget from './widgets/BodyMapWidget';
import ZoneMapWidget from './widgets/ZoneMapWidget';
import VirtualPaper from './widgets/VirtualPaper';

const ACTIVITY_BLOCK_TYPES = ['instruction', 'question', 'textarea', 'checklist', 'rating', 'virtual_paper', 'sort', 'sorting', 'match', 'matching', 'body_map', 'zone_map', 'blank', 'slider', 'timeline', 'focus_card'];

function parseActivityBlocks(source) {
  if (!source) return [];
  if (Array.isArray(source)) return source;
  if (typeof source === 'object' && Array.isArray(source.blocks)) return source.blocks;
  if (typeof source !== 'string') return [];
  const shortcodeBlocks = parseInteractiveShortcodes(source);
  if (shortcodeBlocks.length) return shortcodeBlocks;
  const fenced = source.match(/```json\s*([\s\S]*?)```/i)?.[1];
  const marker = source.match(/ACTIVITY_BLOCKS_JSON:\s*(\[[\s\S]*\])/i)?.[1];
  const candidate = fenced || marker || source;
  try {
    const parsed = JSON.parse(candidate);
    return Array.isArray(parsed) ? parsed : Array.isArray(parsed?.blocks) ? parsed.blocks : [];
  } catch {
    return [];
  }
}

function ensureArray(value) {
  if (Array.isArray(value)) return value.slice(0, 30);
  if (typeof value === 'string') {
    try { const parsed = JSON.parse(value); if (Array.isArray(parsed)) return parsed.slice(0, 30); } catch { return value.split(/[;\n]/).map((item) => item.trim()).filter(Boolean).slice(0, 30); }
  }
  return [];
}

function normalizeOptions(block) { return ensureArray(block.options || block.items || block.prompts); }
function blockLabel(block, fallback) { return block.label || block.prompt || block.text || fallback; }
function valueOf(entry, fallback) { return entry?.value ?? fallback; }

export default function InteractiveWorksheetRenderer({ payload, blocks, fallbackText = '', value, initialResponses, onChange, onResponsesChange, readOnly = false, mode = 'client' }) {
  const source = payload ?? blocks;
  const parsedBlocks = useMemo(() => parseActivityBlocks(source), [source]);
  const incomingResponses = initialResponses ?? value ?? {};
  const [localState, setLocalState] = useState(() => initializeWorksheetState(parsedBlocks, incomingResponses));
  const controlled = Boolean(onResponsesChange || onChange);
  const currentState = controlled ? initializeWorksheetState(parsedBlocks, incomingResponses) : localState;

  const update = (id, type, nextValue) => {
    if (readOnly) return;
    const nextState = updateWidgetResponse(currentState, id, type, nextValue);
    if (onResponsesChange) onResponsesChange(nextState);
    if (onChange) onChange(nextState);
    if (!controlled) setLocalState(nextState);
  };

  const renderFallbackPaper = () => (
    <div className="space-y-4">
      {fallbackText && <FormattedAIContent content={fallbackText} />}
      <VirtualPaper id="virtual_paper" value={valueOf(currentState.virtual_paper, {})} onChange={(next) => update('virtual_paper', 'virtual_paper', next)} readOnly={readOnly} />
    </div>
  );

  if (!parsedBlocks.length) return renderFallbackPaper();

  return <div className="space-y-4" data-worksheet-mode={mode}>{parsedBlocks.map((block, index) => {
    const id = String(block.id || `block_${index}`);
    const type = ACTIVITY_BLOCK_TYPES.includes(block.type) ? block.type : 'instruction';
    const entry = currentState[id];
    const current = valueOf(entry, {});

    if (type === 'instruction') return <div key={id} className="rounded-2xl bg-brand-gold-50 p-4 dark:bg-brand-gold-950/20"><FormattedAIContent content={block.text || block.prompt || ''} /></div>;
    if (type === 'sort' || type === 'sorting') return <SortingWidget key={id} id={id} label={blockLabel(block, 'Sort these items')} items={normalizeOptions(block)} columns={ensureArray(block.columns)} value={current} onChange={(next) => update(id, 'sorting', next)} readOnly={readOnly} />;
    if (type === 'match' || type === 'matching') return <MatchingWidget key={id} id={id} label={blockLabel(block, 'Match the pairs')} left={ensureArray(block.left || block.items)} right={ensureArray(block.right || block.options)} value={current} onChange={(next) => update(id, 'matching', next)} readOnly={readOnly} />;
    if (type === 'body_map') return <BodyMapWidget key={id} id={id} prompt={block.prompt || blockLabel(block, 'Body map')} presets={ensureArray(block.presets)} value={current} onChange={(next) => update(id, 'body_map', next)} readOnly={readOnly} />;
    if (type === 'zone_map') return <ZoneMapWidget key={id} id={id} label={blockLabel(block, 'Zone map')} core={block.core || 'Self-energy'} rings={ensureArray(block.rings)} nodes={ensureArray(block.nodes)} value={current} onChange={(next) => update(id, 'zone_map', next)} readOnly={readOnly} />;
    if (type === 'virtual_paper' || type === 'textarea' || type === 'question') return <VirtualPaper key={id} id={id} prompt={blockLabel(block, type === 'question' ? 'Reflection prompt' : 'Use this space as your virtual piece of paper.')} value={current} onChange={(next) => update(id, type === 'virtual_paper' ? 'virtual_paper' : 'textarea', next)} readOnly={readOnly} />;

    if (type === 'checklist') {
      const selected = Array.isArray(current.selected) ? current.selected : [];
      return <fieldset key={id} className="rounded-2xl border border-brand-stone-200 p-4 dark:border-slate-700"><legend className="px-1 text-sm font-semibold">{blockLabel(block, 'Checklist')}</legend>{normalizeOptions(block).map((item) => { const itemText = typeof item === 'string' ? item : item.label || item.text || String(item.value || 'Option'); return <label key={itemText} className="mt-2 flex items-center gap-2 text-sm"><input disabled={readOnly} type="checkbox" checked={selected.includes(itemText)} onChange={(event) => update(id, 'checklist', { selected: event.target.checked ? [...selected, itemText] : selected.filter((x) => x !== itemText) })} />{itemText}</label>; })}</fieldset>;
    }
    if (type === 'rating') return <label key={id} className="block rounded-2xl border border-brand-stone-200 p-4 dark:border-slate-700"><span className="text-sm font-semibold">{blockLabel(block, 'Rating')}</span><input disabled={readOnly} type="range" min={block.min || 1} max={block.max || 10} value={current.value || block.min || 1} onChange={(event) => update(id, 'rating', { value: Number(event.target.value) })} className="mt-3 w-full" /><span className="text-xs">{current.value || block.min || 1}</span></label>;
    if (type === 'blank') { const template = ensureArray(block.template); return <fieldset key={id} className="rounded-2xl border border-brand-stone-200 p-4 dark:border-slate-700"><legend className="px-1 text-sm font-semibold">{blockLabel(block, 'Fill in the blanks')}</legend><div className="mt-3 flex flex-wrap items-center gap-2 text-sm">{template.map((segment, segmentIndex) => segment.type === 'input' ? <input key={segmentIndex} disabled={readOnly} value={current.answers?.[segmentIndex] || ''} onChange={(event) => update(id, 'blank', { answers: { ...(current.answers || {}), [segmentIndex]: event.target.value } })} placeholder={segment.placeholder} className="min-w-40 rounded-lg border border-brand-stone-200 px-2 py-1 dark:border-slate-700 dark:bg-slate-950" /> : <span key={segmentIndex}>{segment.text}</span>)}</div></fieldset>; }
    if (type === 'slider') { const metrics = ensureArray(block.metrics).length ? ensureArray(block.metrics) : [{ id: 'rating', label: blockLabel(block, 'Rating') }]; return <fieldset key={id} className="rounded-2xl border border-brand-stone-200 p-4 dark:border-slate-700"><legend className="px-1 text-sm font-semibold">{blockLabel(block, 'Sliders')}</legend><div className="mt-3 space-y-3">{metrics.map((metric) => { const metricId = metric.id || metric.label; return <label key={metricId} className="block text-sm"><span className="font-medium">{metric.label || metricId}</span><input disabled={readOnly} type="range" min={block.min ?? 0} max={block.max ?? 10} value={current.values?.[metricId] ?? block.min ?? 0} onChange={(event) => update(id, 'slider', { values: { ...(current.values || {}), [metricId]: Number(event.target.value) } })} className="mt-2 w-full" /><span className="text-xs text-brand-stone-500">{current.values?.[metricId] ?? block.min ?? 0}</span></label>; })}</div></fieldset>; }
    if (type === 'timeline') return <label key={id} className="block rounded-2xl border border-brand-stone-200 p-4 dark:border-slate-700"><span className="text-sm font-semibold">{blockLabel(block, 'Timeline anchor')}</span><p className="mt-1 text-xs text-brand-stone-500 dark:text-slate-400">{block.prompt}</p><input disabled={readOnly} value={current.anchor || ''} onChange={(event) => update(id, 'timeline', { ...current, anchor: event.target.value })} className="mt-3 w-full rounded-xl border border-brand-stone-200 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-950" placeholder={block.range || 'Approximate age or season'} /><textarea disabled={readOnly} value={current.notes || ''} onChange={(event) => update(id, 'timeline', { ...current, notes: event.target.value })} rows={3} className="mt-2 w-full rounded-xl border border-brand-stone-200 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-950" placeholder="What made this strategy important?" /></label>;
    if (type === 'focus_card') return <div key={id} className="rounded-2xl border border-brand-gold-200 bg-brand-gold-50/70 p-4 text-sm dark:border-brand-gold-900/40 dark:bg-brand-gold-950/20"><p className="font-semibold">{blockLabel(block, 'Focus card')}</p><p className="mt-1 text-brand-stone-600 dark:text-slate-400">Review this part field only if it is already available in your current client-owned or Advisor-scoped data.</p><p className="mt-2 text-xs uppercase tracking-wide text-brand-stone-500">Field: {block.field || 'part focus'} · Part: {block.part_id || 'selected part'}</p><textarea disabled={readOnly} value={current.text || ''} onChange={(event) => update(id, 'focus_card', { text: event.target.value })} rows={3} className="mt-3 w-full rounded-xl border border-brand-stone-200 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-950" placeholder="What feels important to review?" /></div>;
    return <VirtualPaper key={id} id={id} prompt={blockLabel(block, 'Use this space as your virtual piece of paper.')} value={current} onChange={(next) => update(id, 'virtual_paper', next)} readOnly={readOnly} />;
  })}</div>;
}
