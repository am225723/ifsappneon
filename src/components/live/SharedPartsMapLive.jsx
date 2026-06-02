import { useEffect, useMemo, useState } from 'react';
import { CheckCircle2, Compass, Loader2, Map, MessageCircle, Save, Send, Sparkles, XCircle } from 'lucide-react';
import {
  acceptSharedMapSuggestion,
  dismissSharedMapSuggestion,
  loadClientPartsForMap,
  saveConfirmedSharedMap,
  setSharedMapSelectedPart,
  suggestSharedMapPart,
  updateSharedMapDraft
} from '../../lib/sharedPartsMap';

const MODE_OPTIONS = [
  { id: 'explore', label: 'Explore' },
  { id: 'protectors', label: 'Protectors' },
  { id: 'exiles', label: 'Exiles' },
  { id: 'relationships', label: 'Relationships' },
  { id: 'self_energy', label: 'Self-energy' }
];

const TYPE_OPTIONS = [
  { id: 'unknown', label: 'Not sure yet' },
  { id: 'protector', label: 'Protector' },
  { id: 'manager', label: 'Manager' },
  { id: 'firefighter', label: 'Firefighter' },
  { id: 'exile', label: 'Exile' }
];

const TYPE_STYLES = {
  protector: { fill: '#dfeadd', stroke: '#6f8f72', text: 'text-emerald-800', badge: 'bg-emerald-100 text-emerald-800' },
  manager: { fill: '#dcebdc', stroke: '#4f8a62', text: 'text-green-800', badge: 'bg-green-100 text-green-800' },
  firefighter: { fill: '#f8dfd2', stroke: '#b8643c', text: 'text-orange-800', badge: 'bg-orange-100 text-orange-800' },
  exile: { fill: '#f8e9b8', stroke: '#c28a1d', text: 'text-amber-800', badge: 'bg-amber-100 text-amber-800' },
  self: { fill: '#f7e2a0', stroke: '#b7791f', text: 'text-yellow-900', badge: 'bg-yellow-100 text-yellow-900' },
  unknown: { fill: '#ece7df', stroke: '#9b9286', text: 'text-stone-800', badge: 'bg-stone-100 text-stone-700' }
};

function normalizePart(part, index) {
  const type = String(part.part_type || part.type || 'unknown').toLowerCase();
  const angle = (index / 8) * Math.PI * 2;
  return {
    ...part,
    displayName: part.part_name || part.name || 'Unnamed part',
    displayType: TYPE_STYLES[type] ? type : 'unknown',
    x: Number.isFinite(Number(part.x)) ? Number(part.x) : Math.round(50 + Math.cos(angle) * 28),
    y: Number.isFinite(Number(part.y)) ? Number(part.y) : Math.round(50 + Math.sin(angle) * 24)
  };
}

function suggestionLabel(suggestion) {
  if (suggestion.suggestionType === 'new_part') return `New part: ${suggestion.name}`;
  if (suggestion.suggestionType === 'part_type') return `Part role: ${suggestion.partType}`;
  if (suggestion.suggestionType === 'descriptor') return 'Gentle descriptor';
  if (suggestion.suggestionType === 'layout') return 'Map placement';
  return 'Advisor suggestion';
}

export default function SharedPartsMapLive({ sessionId, activityState = {}, role = 'client', onSessionUpdate }) {
  const [parts, setParts] = useState([]);
  const [loadingParts, setLoadingParts] = useState(true);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [advisorPrompt, setAdvisorPrompt] = useState(activityState.advisorPrompt || '');
  const [suggestion, setSuggestion] = useState({ suggestionType: 'new_part', name: '', partType: 'unknown', description: '' });

  const isAdvisor = role === 'advisor';
  const selectedPartId = activityState.selectedPartId;
  const pendingSuggestions = Array.isArray(activityState.pendingSuggestions) ? activityState.pendingSuggestions : [];
  const activeSuggestions = pendingSuggestions.filter((item) => item.status === 'pending');
  const acceptedUnsaved = pendingSuggestions.filter((item) => item.status === 'accepted' && !item.savedAt);
  const mapMode = activityState.mapMode || 'explore';

  const mappedParts = useMemo(() => parts.map(normalizePart), [parts]);
  const selectedPart = mappedParts.find((part) => String(part.id) === String(selectedPartId));

  useEffect(() => {
    setAdvisorPrompt(activityState.advisorPrompt || '');
  }, [activityState.advisorPrompt]);

  useEffect(() => {
    let cancelled = false;
    async function loadParts() {
      if (!sessionId) return;
      setLoadingParts(true);
      const { data, error: loadError } = await loadClientPartsForMap({ sessionId });
      if (cancelled) return;
      if (loadError) setError(loadError.message);
      setParts(data?.parts || []);
      setLoadingParts(false);
    }
    loadParts();
    const interval = setInterval(loadParts, 10000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [sessionId, activityState.lastSavedAt]);

  const runAction = async (callback) => {
    setBusy(true);
    setError('');
    const { data, error: actionError } = await callback();
    if (actionError) setError(actionError.message);
    if (data && onSessionUpdate) onSessionUpdate(data);
    setBusy(false);
    return data;
  };

  const handleSelectPart = (partId) => runAction(() => setSharedMapSelectedPart({ sessionId, partId }));

  const handleModePrompt = () => runAction(() => updateSharedMapDraft({
    sessionId,
    layoutDraft: {},
    mapMode,
    advisorPrompt
  }));

  const handleSuggest = async (event) => {
    event.preventDefault();
    const suggestionPayload = suggestion.suggestionType === 'new_part'
      ? suggestion
      : { ...suggestion, partId: suggestion.partId || selectedPartId };
    const sent = await runAction(() => suggestSharedMapPart({ sessionId, suggestion: suggestionPayload }));
    if (sent) setSuggestion({ suggestionType: 'new_part', name: '', partType: 'unknown', description: '' });
  };

  const handleClientDecision = (suggestionId, accepted) => runAction(() => (
    accepted ? acceptSharedMapSuggestion({ sessionId, suggestionId }) : dismissSharedMapSuggestion({ sessionId, suggestionId })
  ));

  const handleSaveConfirmed = () => runAction(() => saveConfirmedSharedMap({ sessionId }));

  const handleDraftLayout = (part) => {
    if (!isAdvisor) return;
    const nextX = Math.round(part.x >= 80 ? 20 : part.x + 10);
    const nextY = Math.round(part.y >= 80 ? 25 : part.y + 8);
    runAction(() => updateSharedMapDraft({ sessionId, layoutDraft: { [part.id]: { x: nextX, y: nextY } }, mapMode, advisorPrompt }));
  };

  return (
    <div className="space-y-5">
      <div className="rounded-3xl border border-brand-emerald-100 dark:border-slate-700 bg-brand-emerald-50/50 dark:bg-slate-900/40 p-5">
        <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.22em] text-brand-emerald-700 dark:text-brand-emerald-100">Shared Parts Map</p>
            <h2 className="text-2xl font-serif text-brand-stone-900 dark:text-slate-100 mt-1">Client-owned Inner System Map</h2>
            <p className="text-sm text-brand-stone-700 dark:text-slate-300 mt-2 max-w-3xl">
              This map belongs to you. Your Advisor can help reflect and suggest, but you decide what feels true for your inner system.
            </p>
          </div>
          <div className="rounded-2xl bg-white/80 dark:bg-slate-950/70 px-4 py-3 text-sm text-brand-stone-700 dark:text-slate-300">
            <div className="flex items-center gap-2 font-semibold"><Compass className="w-4 h-4" /> Mode: {MODE_OPTIONS.find((item) => item.id === mapMode)?.label || 'Explore'}</div>
            <p className="mt-1 text-xs">Nothing is forced. Protectors are respected; exiles are approached gently; Self-energy stays central.</p>
          </div>
        </div>
      </div>

      {error && <div className="rounded-2xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div>}

      {activityState.advisorPrompt && (
        <div className="rounded-2xl border border-blue-100 bg-blue-50 p-4 text-sm text-blue-900 flex gap-3">
          <MessageCircle className="w-5 h-5 shrink-0" />
          <div><strong>Advisor reflection:</strong> {activityState.advisorPrompt}</div>
        </div>
      )}

      <div className="grid xl:grid-cols-[1fr,320px] gap-5">
        <div className="rounded-3xl border border-brand-stone-200 dark:border-slate-700 bg-white dark:bg-slate-950 p-4 min-h-[430px]">
          {loadingParts ? (
            <div className="h-96 flex items-center justify-center text-brand-stone-600 dark:text-slate-400"><Loader2 className="w-5 h-5 animate-spin mr-2" /> Loading parts…</div>
          ) : (
            <svg viewBox="0 0 100 100" className="w-full h-[430px] rounded-2xl bg-gradient-to-br from-brand-stone-50 to-brand-emerald-50 dark:from-slate-900 dark:to-slate-800" role="img" aria-label="Shared Inner System Map">
              <circle cx="50" cy="50" r="10" fill="#f7e2a0" stroke="#b7791f" strokeWidth="0.6" opacity="0.95" />
              <text x="50" y="51" textAnchor="middle" className="fill-yellow-900 text-[3px] font-bold">Self-energy</text>
              {mappedParts.map((part) => {
                const style = TYPE_STYLES[part.displayType] || TYPE_STYLES.unknown;
                const isSelected = String(part.id) === String(selectedPartId);
                return (
                  <g key={part.id} role="button" tabIndex="0" onClick={() => handleSelectPart(part.id)} onDoubleClick={() => handleDraftLayout(part)} className="cursor-pointer">
                    <circle cx={part.x} cy={part.y} r={isSelected ? 7.5 : 6.5} fill={style.fill} stroke={isSelected ? '#1f5137' : style.stroke} strokeWidth={isSelected ? 1.1 : 0.7} />
                    <text x={part.x} y={part.y + 0.7} textAnchor="middle" className="fill-stone-900 text-[2.8px] font-semibold pointer-events-none">{part.displayName.slice(0, 16)}</text>
                    <text x={part.x} y={part.y + 4.2} textAnchor="middle" className="fill-stone-600 text-[2px] pointer-events-none">{part.displayType}</text>
                  </g>
                );
              })}
            </svg>
          )}
          {isAdvisor && <p className="mt-2 text-xs text-brand-stone-500 dark:text-slate-500">Tip: double-click a part to suggest a simple placement shift for client confirmation.</p>}
        </div>

        <aside className="space-y-4">
          <div className="rounded-3xl border border-brand-stone-200 dark:border-slate-700 p-4">
            <h3 className="font-semibold text-brand-stone-900 dark:text-slate-100 flex items-center gap-2"><Map className="w-4 h-4" /> Selected part</h3>
            {selectedPart ? (
              <div className="mt-3 space-y-2 text-sm text-brand-stone-700 dark:text-slate-300">
                <p className="text-lg font-semibold text-brand-stone-900 dark:text-slate-100">{selectedPart.displayName}</p>
                <span className={`inline-flex rounded-full px-2 py-1 text-xs font-semibold ${TYPE_STYLES[selectedPart.displayType].badge}`}>{selectedPart.displayType}</span>
                {selectedPart.description && <p>{selectedPart.description}</p>}
                {selectedPart.role && <p><strong>Role:</strong> {selectedPart.role}</p>}
              </div>
            ) : <p className="mt-3 text-sm text-brand-stone-600 dark:text-slate-400">Select a part to notice it more closely.</p>}
          </div>

          <div className="rounded-3xl border border-brand-stone-200 dark:border-slate-700 p-4">
            <h3 className="font-semibold text-brand-stone-900 dark:text-slate-100">Pending suggestions</h3>
            {activeSuggestions.length === 0 ? (
              <p className="mt-2 text-sm text-brand-stone-600 dark:text-slate-400">No Advisor suggestions are waiting right now.</p>
            ) : (
              <div className="mt-3 space-y-3">
                {activeSuggestions.map((item) => (
                  <div key={item.id} className="rounded-2xl bg-brand-stone-50 dark:bg-slate-900 p-3 text-sm">
                    <p className="font-semibold text-brand-stone-900 dark:text-slate-100">{suggestionLabel(item)}</p>
                    {item.description && <p className="mt-1 text-brand-stone-600 dark:text-slate-400">{item.description}</p>}
                    {!isAdvisor && (
                      <div className="mt-3 grid grid-cols-2 gap-2">
                        <button type="button" onClick={() => handleClientDecision(item.id, true)} disabled={busy} className="btn-sanctuary-secondary justify-center"><CheckCircle2 className="w-4 h-4" /> Accept</button>
                        <button type="button" onClick={() => handleClientDecision(item.id, false)} disabled={busy} className="btn-sanctuary-secondary justify-center"><XCircle className="w-4 h-4" /> Dismiss</button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {!isAdvisor && (
            <div className="rounded-3xl border border-brand-emerald-100 bg-brand-emerald-50 p-4 text-sm text-brand-emerald-900">
              <p className="font-semibold">Client confirmation</p>
              <p className="mt-1">Accepted suggestions are only saved to your parts map when you confirm. You can leave them unsaved if they do not feel true.</p>
              <button type="button" onClick={handleSaveConfirmed} disabled={busy || (acceptedUnsaved.length === 0 && !activityState.hasUnsavedConfirmedChanges)} className="btn-sanctuary-primary w-full justify-center mt-3 disabled:opacity-50"><Save className="w-4 h-4" /> Confirm and save map</button>
            </div>
          )}
        </aside>
      </div>

      {isAdvisor && (
        <div className="grid lg:grid-cols-2 gap-4">
          <div className="rounded-3xl border border-brand-stone-200 dark:border-slate-700 p-4 space-y-3">
            <label className="block text-sm font-medium text-brand-stone-700 dark:text-slate-300">Guide map mode</label>
            <select value={mapMode} onChange={(event) => runAction(() => updateSharedMapDraft({ sessionId, layoutDraft: {}, mapMode: event.target.value, advisorPrompt }))} className="w-full rounded-2xl border border-brand-stone-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-sm">
              {MODE_OPTIONS.map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}
            </select>
            <textarea value={advisorPrompt} onChange={(event) => setAdvisorPrompt(event.target.value.slice(0, 500))} maxLength={500} placeholder="Offer a short, gentle Advisor reflection…" className="w-full min-h-24 rounded-2xl border border-brand-stone-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-sm" />
            <button type="button" onClick={handleModePrompt} disabled={busy} className="btn-sanctuary-secondary w-full justify-center"><Send className="w-4 h-4" /> Send prompt / request confirmation</button>
          </div>

          <form onSubmit={handleSuggest} className="rounded-3xl border border-brand-stone-200 dark:border-slate-700 p-4 space-y-3">
            <h3 className="font-semibold text-brand-stone-900 dark:text-slate-100 flex items-center gap-2"><Sparkles className="w-4 h-4" /> Suggest gently</h3>
            <select value={suggestion.suggestionType} onChange={(event) => setSuggestion((prev) => ({ ...prev, suggestionType: event.target.value }))} className="w-full rounded-2xl border border-brand-stone-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-sm">
              <option value="new_part">Suggest a new part</option>
              <option value="part_type">Suggest a role/type for selected part</option>
              <option value="descriptor">Suggest a gentle descriptor</option>
            </select>
            {suggestion.suggestionType === 'new_part' ? (
              <input value={suggestion.name} onChange={(event) => setSuggestion((prev) => ({ ...prev, name: event.target.value.slice(0, 100) }))} maxLength={100} placeholder="Part name" className="w-full rounded-2xl border border-brand-stone-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-sm" />
            ) : (
              <select value={suggestion.partId || selectedPartId || ''} onChange={(event) => setSuggestion((prev) => ({ ...prev, partId: event.target.value }))} className="w-full rounded-2xl border border-brand-stone-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-sm">
                <option value="">Choose a part</option>
                {mappedParts.map((part) => <option key={part.id} value={part.id}>{part.displayName}</option>)}
              </select>
            )}
            {suggestion.suggestionType !== 'descriptor' && (
              <select value={suggestion.partType} onChange={(event) => setSuggestion((prev) => ({ ...prev, partType: event.target.value }))} className="w-full rounded-2xl border border-brand-stone-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-sm">
                {TYPE_OPTIONS.map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}
              </select>
            )}
            <textarea value={suggestion.description} onChange={(event) => setSuggestion((prev) => ({ ...prev, description: event.target.value.slice(0, 500) }))} maxLength={500} placeholder="Gentle descriptor, optional" className="w-full min-h-20 rounded-2xl border border-brand-stone-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-sm" />
            <button type="submit" disabled={busy} className="btn-sanctuary-secondary w-full justify-center"><Send className="w-4 h-4" /> Send suggestion for client confirmation</button>
          </form>
        </div>
      )}
    </div>
  );
}
