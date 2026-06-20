import { useMemo, useState } from 'react';
import { CheckCircle2, Edit3, GitMerge, Link2, Plus, X } from 'lucide-react';

const PART_TYPES = ['protector', 'manager', 'firefighter', 'exile', 'self', 'unknown'];

export default function PartSuggestionPanel({ suggestions = [], relationshipSuggestions = [], dismissedSuggestions = [], dismissedRelationshipSuggestions = [], existingParts = [], onAddPart, onMergePart, onDismissPart, onRestorePart, onAddRelationship, onDismissRelationship, onRestoreRelationship, readOnly = false, disabled = false }) {
  const [dismissed, setDismissed] = useState(new Set());
  const [showDismissed, setShowDismissed] = useState(false);
  const [editing, setEditing] = useState(null);
  const [mergeTargets, setMergeTargets] = useState({});
  const visibleParts = useMemo(() => suggestions.filter((item) => !dismissed.has(item.id)), [suggestions, dismissed]);
  const visibleRelationships = useMemo(() => relationshipSuggestions.filter((item) => !dismissed.has(item.id)), [relationshipSuggestions, dismissed]);
  const hiddenDismissedCount = dismissedSuggestions.length + dismissedRelationshipSuggestions.length;

  const dismiss = async (item, type = 'part') => {
    setDismissed((prev) => new Set([...prev, item.id]));
    if (type === 'relationship') await onDismissRelationship?.(item);
    else await onDismissPart?.(item);
  };
  const startEdit = (suggestion) => setEditing({ ...suggestion });
  const addEdited = async () => {
    if (!editing) return;
    await onAddPart?.(editing);
    setDismissed((prev) => new Set([...prev, editing.id]));
    setEditing(null);
  };

  return (
    <section className="rounded-3xl border border-brand-emerald-100 bg-white dark:border-slate-700 dark:bg-slate-950 p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-brand-emerald-700 dark:text-brand-emerald-100">Review Suggestions</p>
          <h2 className="mt-1 font-semibold text-brand-stone-900 dark:text-slate-100">Suggested Parts from Your IFS Work</h2>
        </div>
        <CheckCircle2 className="h-5 w-5 text-brand-emerald-700" />
      </div>
      <p className="mt-2 text-sm text-brand-stone-600 dark:text-slate-400">
        Suggestions come from your assessments, curriculum reflections, and daily-life practice responses. You choose which suggestions become part of your map.
      </p>
      <p className="mt-2 text-xs text-brand-stone-500 dark:text-slate-500">Dismissed suggestions will stay hidden unless you restore them.</p>
      {hiddenDismissedCount > 0 && (
        <div className="mt-3 flex items-center justify-between gap-2 rounded-2xl bg-brand-stone-50 p-2 text-xs dark:bg-slate-900">
          <span>{hiddenDismissedCount} dismissed suggestion{hiddenDismissedCount === 1 ? '' : 's'} hidden.</span>
          <button type="button" onClick={() => setShowDismissed((prev) => !prev)} className="font-semibold text-brand-emerald-700 dark:text-brand-emerald-100">{showDismissed ? 'Hide Dismissed' : 'Show Dismissed'}</button>
        </div>
      )}

      {editing && (
        <div className="mt-4 rounded-2xl border border-brand-gold-200 bg-brand-gold-50 p-3 dark:border-brand-gold-900/50 dark:bg-brand-gold-950/20">
          <p className="font-semibold text-brand-stone-900 dark:text-slate-100">Edit suggested part before adding</p>
          <input value={editing.name || ''} onChange={(e) => setEditing((prev) => ({ ...prev, name: e.target.value.slice(0, 255) }))} className="mt-3 w-full rounded-xl border px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-950" />
          <select value={editing.type || 'unknown'} onChange={(e) => setEditing((prev) => ({ ...prev, type: e.target.value }))} className="mt-2 w-full rounded-xl border px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-950">
            {PART_TYPES.map((type) => <option key={type} value={type}>{type}</option>)}
          </select>
          <textarea value={editing.role || ''} onChange={(e) => setEditing((prev) => ({ ...prev, role: e.target.value.slice(0, 500) }))} className="mt-2 min-h-20 w-full rounded-xl border px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-950" />
          <div className="mt-3 flex flex-wrap gap-2">
            <button type="button" onClick={addEdited} disabled={disabled || !editing.name} className="btn-sanctuary-primary disabled:opacity-50"><Plus className="h-4 w-4" /> Add to Map</button>
            <button type="button" onClick={() => setEditing(null)} className="btn-sanctuary-secondary">Cancel</button>
          </div>
        </div>
      )}

      <div className="mt-4 space-y-3">
        {visibleParts.length === 0 ? <p className="rounded-2xl bg-brand-stone-50 p-3 text-sm text-brand-stone-600 dark:bg-slate-900 dark:text-slate-400">No new suggested parts right now.</p> : visibleParts.map((suggestion) => (
          <div key={suggestion.id} className="rounded-2xl border border-brand-stone-100 p-3 text-sm dark:border-slate-800">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="font-semibold text-brand-stone-900 dark:text-slate-100">{suggestion.name}</p>
                <p className="text-xs capitalize text-brand-stone-500 dark:text-slate-500">{suggestion.type || 'unknown'} • {suggestion.sourceLabel || suggestion.source} • {suggestion.confidence}</p>
              </div>
              {!readOnly && <button type="button" onClick={() => dismiss(suggestion, 'part')} className="text-brand-stone-400 hover:text-brand-stone-700"><X className="h-4 w-4" /></button>}
            </div>
            <p className="mt-2 text-brand-stone-600 dark:text-slate-400">{suggestion.evidenceSummary}</p>
            <div className="mt-3 flex flex-wrap gap-2">
              {!readOnly && <button type="button" onClick={async () => { await onAddPart?.(suggestion); setDismissed((prev) => new Set([...prev, suggestion.id])); }} disabled={disabled} className="btn-sanctuary-primary text-xs disabled:opacity-50"><Plus className="h-3.5 w-3.5" /> Add to Map</button>}
              {!readOnly && <button type="button" onClick={() => startEdit(suggestion)} disabled={disabled} className="btn-sanctuary-secondary text-xs"><Edit3 className="h-3.5 w-3.5" /> Edit & Add</button>}
              {!readOnly && existingParts.length > 0 && <select value={mergeTargets[suggestion.id] || ''} onChange={(e) => setMergeTargets((prev) => ({ ...prev, [suggestion.id]: e.target.value }))} className="rounded-xl border px-2 py-1 text-xs dark:border-slate-700 dark:bg-slate-950"><option value="">Merge with Existing</option>{existingParts.map((part) => <option key={part.id} value={part.id}>{part.part_name || part.name}</option>)}</select>}
              {!readOnly && mergeTargets[suggestion.id] && <button type="button" onClick={async () => { await onMergePart?.(suggestion, mergeTargets[suggestion.id]); setDismissed((prev) => new Set([...prev, suggestion.id])); }} disabled={disabled} className="btn-sanctuary-secondary text-xs"><GitMerge className="h-3.5 w-3.5" /> Merge</button>}
              {!readOnly && <button type="button" onClick={() => dismiss(suggestion, 'part')} className="btn-sanctuary-secondary text-xs">Dismiss</button>}
            </div>
          </div>
        ))}
      </div>

      {visibleRelationships.length > 0 && <div className="mt-5 border-t border-brand-stone-100 pt-4 dark:border-slate-800">
        <h3 className="font-semibold text-brand-stone-900 dark:text-slate-100">Suggested Relationships</h3>
        <div className="mt-3 space-y-2">
          {visibleRelationships.map((rel) => <div key={rel.id} className="rounded-2xl bg-brand-stone-50 p-3 text-sm dark:bg-slate-900">
            <p className="font-medium text-brand-stone-900 dark:text-slate-100">{rel.fromName} → {rel.label} → {rel.toName}</p>
            <p className="mt-1 text-xs text-brand-stone-500 dark:text-slate-500">{rel.evidenceSummary}</p>
            <div className="mt-2 flex flex-wrap gap-2">
              {!readOnly && <button type="button" onClick={async () => { await onAddRelationship?.(rel); setDismissed((prev) => new Set([...prev, rel.id])); }} disabled={disabled} className="btn-sanctuary-secondary text-xs"><Link2 className="h-3.5 w-3.5" /> Add Relationship</button>}
              {!readOnly && <button type="button" onClick={() => dismiss(rel, 'relationship')} className="btn-sanctuary-secondary text-xs">Dismiss</button>}
            </div>
          </div>)}
        </div>
      </div>}

      {showDismissed && hiddenDismissedCount > 0 && (
        <div className="mt-5 border-t border-brand-stone-100 pt-4 dark:border-slate-800">
          <h3 className="font-semibold text-brand-stone-900 dark:text-slate-100">Dismissed Suggestions</h3>
          <div className="mt-3 space-y-2">
            {[...dismissedSuggestions.map((item) => ({ ...item, suggestionType: 'part' })), ...dismissedRelationshipSuggestions.map((item) => ({ ...item, suggestionType: 'relationship' }))].map((item) => (
              <div key={`${item.suggestionType}:${item.id}`} className="rounded-2xl bg-brand-stone-50 p-3 text-sm dark:bg-slate-900">
                <p className="font-medium text-brand-stone-900 dark:text-slate-100">{item.name || `${item.fromName} → ${item.toName}`}</p>
                <p className="mt-1 text-xs text-brand-stone-500 dark:text-slate-500">{item.evidenceSummary}</p>
                {!readOnly && <button type="button" onClick={() => item.suggestionType === 'relationship' ? onRestoreRelationship?.(item) : onRestorePart?.(item)} className="btn-sanctuary-secondary mt-2 text-xs">Restore Suggestion</button>}
              </div>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}
