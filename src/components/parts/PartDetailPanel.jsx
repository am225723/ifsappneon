import { Map } from 'lucide-react';
import { distanceZone, PART_TYPE_STYLES } from './mapConstants';

export default function PartDetailPanel({ part, onMoveBy, onMoveRadially, disabled = false }) {
  return (
    <div className="rounded-3xl border border-brand-stone-200 dark:border-slate-700 p-4">
      <h3 className="font-semibold text-brand-stone-900 dark:text-slate-100 flex items-center gap-2"><Map className="w-4 h-4" /> Selected part</h3>
      {part ? (
        <div className="mt-3 space-y-3 text-sm text-brand-stone-700 dark:text-slate-300">
          <div>
            <p className="text-lg font-semibold text-brand-stone-900 dark:text-slate-100">{part.displayName}</p>
            <div className="flex flex-wrap gap-2 mt-2">
              <span className={`inline-flex rounded-full px-2 py-1 text-xs font-semibold ${(PART_TYPE_STYLES[part.displayType] || PART_TYPE_STYLES.unknown).badge}`}>{part.displayType}</span>
              <span className="inline-flex rounded-full px-2 py-1 text-xs font-semibold bg-brand-stone-100 text-brand-stone-700">{distanceZone(part)}</span>
            </div>
          </div>
          {part.description && <p><strong>What this part wants known:</strong> {part.description}</p>}
          {part.role && <p><strong>How this part may be trying to help:</strong> {part.role}</p>}
          {part.notes && <p><strong>What this part may need:</strong> {part.notes}</p>}
          <p><strong>Relationship to Self-energy:</strong> {distanceZone(part)}. This is a visual placement, not a judgment about the part.</p>
          <div className="grid grid-cols-2 gap-2 pt-2">
            <button type="button" onClick={() => onMoveBy?.(part, -8, 0)} disabled={disabled} className="btn-sanctuary-secondary justify-center">Move left</button>
            <button type="button" onClick={() => onMoveBy?.(part, 8, 0)} disabled={disabled} className="btn-sanctuary-secondary justify-center">Move right</button>
            <button type="button" onClick={() => onMoveRadially?.(part, 'in')} disabled={disabled} className="btn-sanctuary-secondary justify-center">Closer to Self</button>
            <button type="button" onClick={() => onMoveRadially?.(part, 'out')} disabled={disabled} className="btn-sanctuary-secondary justify-center">Needs space</button>
          </div>
        </div>
      ) : <p className="mt-3 text-sm text-brand-stone-600 dark:text-slate-400">Select a part to notice it more closely.</p>}
    </div>
  );
}
