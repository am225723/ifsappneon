import { useMemo, useState } from 'react';
import { CheckCircle2, Edit3, GitMerge, Link2, Plus, X } from 'lucide-react';

const PART_TYPES = ['protector', 'manager', 'firefighter', 'exile', 'self', 'unknown'];

export default function PartSuggestionPanel({ suggestions = [], relationshipSuggestions = [], existingParts = [], onAddPart, onMergePart, onAddRelationship, disabled = false }) {
  const [dismissed, setDismissed] = useState(new Set());
  const [editing, setEditing] = useState(null);
  const [mergeTargets, setMergeTargets] = useState({});
  const visibleParts = useMemo(() => suggestions.filter((item) => !dismissed.has(item.id)), [suggestions, dismissed]);
  const visibleRelationships = useMemo(() => relationshipSuggestions.filter((item) => !dismissed.has(item.id)), [relationshipSuggestions, dismissed]);

  const dismiss = (id) => setDismissed((prev) => new Set([...prev, id]));
  const startEdit = (suggestion) => setEditing({ ...suggestion });
  const addEdited = async () => {
    if (!editing) return;
    await onAddPart?.(editing);
    dismiss(editing.id);
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
        These suggestions come from your assessments, curriculum reflections, and daily-life practice responses. Review them before adding them to your Inner System Map.
      </p>

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
              <button type="button" onClick={() => dismiss(suggestion.id)} className="text-brand-stone-400 hover:text-brand-stone-700"><X className="h-4 w-4" /></button>
            </div>
            <p className="mt-2 text-brand-stone-600 dark:text-slate-400">{suggestion.evidenceSummary}</p>
            <div className="mt-3 flex flex-wrap gap-2">
              <button type="button" onClick={async () => { await onAddPart?.(suggestion); dismiss(suggestion.id); }} disabled={disabled} className="btn-sanctuary-primary text-xs disabled:opacity-50"><Plus className="h-3.5 w-3.5" /> Add to Map</button>
              <button type="button" onClick={() => startEdit(suggestion)} disabled={disabled} className="btn-sanctuary-secondary text-xs"><Edit3 className="h-3.5 w-3.5" /> Edit & Add</button>
              {existingParts.length > 0 && <select value={mergeTargets[suggestion.id] || ''} onChange={(e) => setMergeTargets((prev) => ({ ...prev, [suggestion.id]: e.target.value }))} className="rounded-xl border px-2 py-1 text-xs dark:border-slate-700 dark:bg-slate-950"><option value="">Merge with Existing</option>{existingParts.map((part) => <option key={part.id} value={part.id}>{part.part_name || part.name}</option>)}</select>}
              {mergeTargets[suggestion.id] && <button type="button" onClick={async () => { await onMergePart?.(suggestion, mergeTargets[suggestion.id]); dismiss(suggestion.id); }} disabled={disabled} className="btn-sanctuary-secondary text-xs"><GitMerge className="h-3.5 w-3.5" /> Merge</button>}
              <button type="button" onClick={() => dismiss(suggestion.id)} className="btn-sanctuary-secondary text-xs">Dismiss</button>
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
              <button type="button" onClick={async () => { await onAddRelationship?.(rel); dismiss(rel.id); }} disabled={disabled} className="btn-sanctuary-secondary text-xs"><Link2 className="h-3.5 w-3.5" /> Add Relationship</button>
              <button type="button" onClick={() => dismiss(rel.id)} className="btn-sanctuary-secondary text-xs">Dismiss</button>
            </div>
          </div>)}
        </div>
      </div>}
    </section>
  );
}
