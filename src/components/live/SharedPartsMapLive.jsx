import { useEffect, useRef, useState } from 'react';
import { CheckCircle2, Compass, Loader2, Map, MessageCircle, Move, Save, Send, Sparkles, XCircle } from 'lucide-react';
import {
  acceptSharedMapSuggestion,
  dismissSharedMapSuggestion,
  loadClientPartsForMap,
  saveConfirmedSharedMap,
  setSharedMapSelectedPart,
  suggestSharedMapPart,
  suggestSharedMapRelationship,
  updateSharedMapDraft,
  updateSharedMapNodePosition
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

const RELATIONSHIP_OPTIONS = [
  { id: 'close_to', label: 'close to' },
  { id: 'protects', label: 'protects' },
  { id: 'concerned_about', label: 'concerned about' },
  { id: 'polarized_with', label: 'polarized with' },
  { id: 'supports', label: 'supports' },
  { id: 'unknown', label: 'not sure yet' }
];

const TYPE_STYLES = {
  protector: { fill: '#dfeadd', stroke: '#6f8f72', text: 'text-emerald-800', badge: 'bg-emerald-100 text-emerald-800' },
  manager: { fill: '#dcebdc', stroke: '#4f8a62', text: 'text-green-800', badge: 'bg-green-100 text-green-800' },
  firefighter: { fill: '#f8dfd2', stroke: '#b8643c', text: 'text-orange-800', badge: 'bg-orange-100 text-orange-800' },
  exile: { fill: '#f8e9b8', stroke: '#c28a1d', text: 'text-amber-800', badge: 'bg-amber-100 text-amber-800' },
  self: { fill: '#f7e2a0', stroke: '#b7791f', text: 'text-yellow-900', badge: 'bg-yellow-100 text-yellow-900' },
  unknown: { fill: '#ece7df', stroke: '#9b9286', text: 'text-stone-800', badge: 'bg-stone-100 text-stone-700' }
};

const ZONES = [
  { radius: 18, label: 'Close to Self', color: '#f8e9b8' },
  { radius: 31, label: 'Nearby', color: '#dfeadd' },
  { radius: 43, label: 'Protective edge', color: '#d7e4ee' },
  { radius: 50, label: 'Further out / needs space', color: '#ece7df' }
];

function normalizeLayoutDraft(layoutDraft = {}) {
  const nodes = layoutDraft.nodes && typeof layoutDraft.nodes === 'object' ? layoutDraft.nodes : Object.fromEntries(
    Object.entries(layoutDraft || {}).filter(([key, value]) => key !== 'relationships' && value && typeof value === 'object')
  );
  return {
    nodes,
    relationships: Array.isArray(layoutDraft.relationships) ? layoutDraft.relationships : []
  };
}

function normalizePart(part, index, draftNodes = {}, localPositions = {}) {
  const type = String(part.part_type || part.type || 'unknown').toLowerCase();
  const angle = (index / 8) * Math.PI * 2;
  const draft = draftNodes[String(part.id)] || {};
  const local = localPositions[String(part.id)] || {};
  return {
    ...part,
    displayName: part.part_name || part.name || 'Unnamed part',
    displayType: TYPE_STYLES[type] ? type : 'unknown',
    x: Number.isFinite(Number(local.x ?? draft.x ?? part.x)) ? Number(local.x ?? draft.x ?? part.x) : Math.round(50 + Math.cos(angle) * 28),
    y: Number.isFinite(Number(local.y ?? draft.y ?? part.y)) ? Number(local.y ?? draft.y ?? part.y) : Math.round(50 + Math.sin(angle) * 24),
    color: local.color || draft.color || part.color
  };
}

function distanceZone(part) {
  const distance = Math.hypot(part.x - 50, part.y - 50);
  return ZONES.find((zone) => distance <= zone.radius)?.label || 'Further out / needs space';
}

function relationshipLabel(type) {
  return RELATIONSHIP_OPTIONS.find((item) => item.id === type)?.label || 'not sure yet';
}

function suggestionLabel(suggestion) {
  if (suggestion.suggestionType === 'new_part') return `New part: ${suggestion.name}`;
  if (suggestion.suggestionType === 'part_type') return `Part role: ${suggestion.partType}`;
  if (suggestion.suggestionType === 'descriptor') return 'Gentle descriptor';
  if (suggestion.suggestionType === 'layout') return 'Map placement';
  if (suggestion.suggestionType === 'relationship') return `Relationship: ${relationshipLabel(suggestion.relationshipType)}`;
  return 'Advisor suggestion';
}

function pointerToSvgPoint(event, svgElement) {
  const point = svgElement.createSVGPoint();
  point.x = event.clientX;
  point.y = event.clientY;
  const transformed = point.matrixTransform(svgElement.getScreenCTM().inverse());
  return {
    x: Math.min(94, Math.max(6, transformed.x)),
    y: Math.min(94, Math.max(6, transformed.y))
  };
}

export default function SharedPartsMapLive({ sessionId, activityState = {}, role = 'client', onSessionUpdate }) {
  const [parts, setParts] = useState([]);
  const [loadingParts, setLoadingParts] = useState(true);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [advisorPrompt, setAdvisorPrompt] = useState(activityState.advisorPrompt || '');
  const [suggestion, setSuggestion] = useState({ suggestionType: 'new_part', name: '', partType: 'unknown', description: '' });
  const [relationshipDraft, setRelationshipDraft] = useState({ fromPartId: '', toPartId: '', relationshipType: 'close_to', label: '' });
  const [localPositions, setLocalPositions] = useState({});
  const [draggingPartId, setDraggingPartId] = useState(null);
  const svgRef = useRef(null);

  const isAdvisor = role === 'advisor';
  const selectedPartId = activityState.selectedPartId;
  const pendingSuggestions = Array.isArray(activityState.pendingSuggestions) ? activityState.pendingSuggestions : [];
  const activeSuggestions = pendingSuggestions.filter((item) => item.status === 'pending');
  const acceptedUnsaved = pendingSuggestions.filter((item) => item.status === 'accepted' && !item.savedAt);
  const acceptedSuggestions = pendingSuggestions.filter((item) => item.status === 'accepted');
  const mapMode = activityState.mapMode || 'explore';
  const layoutDraft = normalizeLayoutDraft(activityState.layoutDraft || {});

  const mappedParts = parts.map((part, index) => normalizePart(part, index, layoutDraft.nodes, localPositions));
  const partsById = new Map(mappedParts.map((part) => [String(part.id), part]));
  const selectedPart = mappedParts.find((part) => String(part.id) === String(selectedPartId));
  const visibleRelationships = layoutDraft.relationships.filter((relationship) => relationship.status === 'accepted' || !relationship.status);
  const selectedAcceptedSuggestions = selectedPart ? acceptedSuggestions.filter((item) => String(item.partId) === String(selectedPart.id)) : [];
  const selectedPendingSuggestions = selectedPart ? activeSuggestions.filter((item) => String(item.partId) === String(selectedPart.id)) : [];


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
    layoutDraft: { nodes: {}, relationships: [] },
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

  const handleSuggestRelationship = async (event) => {
    event.preventDefault();
    const sent = await runAction(() => suggestSharedMapRelationship({ sessionId, suggestion: relationshipDraft }));
    if (sent) setRelationshipDraft({ fromPartId: '', toPartId: '', relationshipType: 'close_to', label: '' });
  };

  const handleClientDecision = (suggestionId, accepted) => runAction(() => (
    accepted ? acceptSharedMapSuggestion({ sessionId, suggestionId }) : dismissSharedMapSuggestion({ sessionId, suggestionId })
  ));

  const handleSaveConfirmed = () => runAction(() => saveConfirmedSharedMap({ sessionId }));

  const commitPosition = (partId, position) => runAction(() => updateSharedMapNodePosition({
    sessionId,
    partId,
    x: Math.round(position.x),
    y: Math.round(position.y)
  }));

  const movePartBy = (part, dx, dy) => {
    const next = { x: Math.min(94, Math.max(6, part.x + dx)), y: Math.min(94, Math.max(6, part.y + dy)) };
    setLocalPositions((prev) => ({ ...prev, [part.id]: next }));
    commitPosition(part.id, next);
  };

  const movePartRadially = (part, direction) => {
    const dx = part.x - 50;
    const dy = part.y - 50;
    const length = Math.hypot(dx, dy) || 1;
    const delta = direction === 'in' ? -8 : 8;
    movePartBy(part, (dx / length) * delta, (dy / length) * delta);
  };

  const handlePointerDown = (event, part) => {
    event.preventDefault();
    setDraggingPartId(String(part.id));
    handleSelectPart(part.id);
  };

  const handlePointerMove = (event) => {
    if (!draggingPartId || !svgRef.current) return;
    const next = pointerToSvgPoint(event, svgRef.current);
    setLocalPositions((prev) => ({ ...prev, [draggingPartId]: next }));
  };

  const handlePointerUp = () => {
    if (!draggingPartId) return;
    const part = mappedParts.find((item) => String(item.id) === draggingPartId);
    setDraggingPartId(null);
    if (part) commitPosition(part.id, part);
  };

  return (
    <div className="space-y-5">
      <div className="rounded-3xl border border-brand-emerald-100 dark:border-slate-700 bg-brand-emerald-50/50 dark:bg-slate-900/40 p-5">
        <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.22em] text-brand-emerald-700 dark:text-brand-emerald-100">Shared Parts Map</p>
            <h2 className="text-2xl font-serif text-brand-stone-900 dark:text-slate-100 mt-1">Client-owned Inner System Map</h2>
            <p className="text-sm text-brand-stone-700 dark:text-slate-300 mt-2 max-w-3xl">
              This map belongs to you. Save only what feels true. Your Advisor can help reflect and suggest, but the meaning stays client-owned.
            </p>
          </div>
          <div className="rounded-2xl bg-white/80 dark:bg-slate-950/70 px-4 py-3 text-sm text-brand-stone-700 dark:text-slate-300">
            <div className="flex items-center gap-2 font-semibold"><Compass className="w-4 h-4" /> Mode: {MODE_OPTIONS.find((item) => item.id === mapMode)?.label || 'Explore'}</div>
            <p className="mt-1 text-xs">Parts can move closer to or farther from Self-energy as layout exploration, not a judgment.</p>
          </div>
        </div>
      </div>

      {error && <div className="rounded-2xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div>}

      {activityState.advisorPrompt && (
        <div className="rounded-2xl border border-blue-100 bg-blue-50 p-4 text-sm text-blue-900 flex gap-3">
          <MessageCircle className="w-5 h-5 shrink-0" />
          <div><strong>Advisor-guided reflection:</strong> {activityState.advisorPrompt}</div>
        </div>
      )}

      <div className="grid xl:grid-cols-[1fr,340px] gap-5">
        <div className="rounded-3xl border border-brand-stone-200 dark:border-slate-700 bg-white dark:bg-slate-950 p-4 min-h-[520px]">
          {loadingParts ? (
            <div className="h-96 flex items-center justify-center text-brand-stone-600 dark:text-slate-400"><Loader2 className="w-5 h-5 animate-spin mr-2" /> Loading parts…</div>
          ) : (
            <svg ref={svgRef} viewBox="0 0 100 100" onPointerMove={handlePointerMove} onPointerUp={handlePointerUp} onPointerLeave={handlePointerUp} className="w-full h-[480px] rounded-2xl bg-gradient-to-br from-brand-stone-50 to-brand-emerald-50 dark:from-slate-900 dark:to-slate-800 touch-none" role="img" aria-label="Shared Inner System Map">
              {ZONES.slice().reverse().map((zone) => <circle key={zone.label} cx="50" cy="50" r={zone.radius} fill="none" stroke={zone.color} strokeWidth="0.35" strokeDasharray="1.5 1.5" />)}
              {ZONES.map((zone, index) => <text key={zone.label} x="52" y={50 - zone.radius + 2 + index * 0.5} className="fill-stone-500 text-[1.8px]">{zone.label}</text>)}
              {visibleRelationships.map((relationship) => {
                const from = partsById.get(String(relationship.fromPartId));
                const to = partsById.get(String(relationship.toPartId));
                if (!from || !to) return null;
                const midX = (from.x + to.x) / 2;
                const midY = (from.y + to.y) / 2;
                return (
                  <g key={relationship.id || `${relationship.fromPartId}-${relationship.toPartId}-${relationship.relationshipType}`} className="pointer-events-none">
                    <path d={`M ${from.x} ${from.y} Q ${midX} ${midY - 5} ${to.x} ${to.y}`} fill="none" stroke="#7f9f8f" strokeWidth="0.65" strokeLinecap="round" opacity="0.75" />
                    <text x={midX} y={midY - 3.5} textAnchor="middle" className="fill-emerald-800 text-[2px]">{relationship.label || relationshipLabel(relationship.relationshipType)}</text>
                  </g>
                );
              })}
              <circle cx="50" cy="50" r="10" fill="#f7e2a0" stroke="#b7791f" strokeWidth="0.6" opacity="0.96" />
              <text x="50" y="51" textAnchor="middle" className="fill-yellow-900 text-[3px] font-bold">Self-energy</text>
              {mappedParts.map((part) => {
                const style = TYPE_STYLES[part.displayType] || TYPE_STYLES.unknown;
                const isSelected = String(part.id) === String(selectedPartId);
                return (
                  <g key={part.id} role="button" tabIndex="0" onClick={() => handleSelectPart(part.id)} onPointerDown={(event) => handlePointerDown(event, part)} className="cursor-move">
                    <circle cx={part.x} cy={part.y} r={isSelected ? 7.5 : 6.5} fill={part.color || style.fill} stroke={isSelected ? '#1f5137' : style.stroke} strokeWidth={isSelected ? 1.1 : 0.7} />
                    <text x={part.x} y={part.y + 0.7} textAnchor="middle" className="fill-stone-900 text-[2.8px] font-semibold pointer-events-none">{part.displayName.slice(0, 16)}</text>
                    <text x={part.x} y={part.y + 4.2} textAnchor="middle" className="fill-stone-600 text-[2px] pointer-events-none">{part.displayType}</text>
                  </g>
                );
              })}
            </svg>
          )}
          <div className="mt-3 grid md:grid-cols-2 gap-3 text-xs text-brand-stone-600 dark:text-slate-400">
            <p><Move className="inline w-3.5 h-3.5 mr-1" /> Drag nodes or use the move buttons. Changes stay in the live draft until the client confirms and saves.</p>
            <p>Relationship lines are session-only for now and are stored in the live activity state, not in a separate database table.</p>
          </div>
        </div>

        <aside className="space-y-4">
          <div className="rounded-3xl border border-brand-stone-200 dark:border-slate-700 p-4">
            <h3 className="font-semibold text-brand-stone-900 dark:text-slate-100 flex items-center gap-2"><Map className="w-4 h-4" /> Selected part</h3>
            {selectedPart ? (
              <div className="mt-3 space-y-3 text-sm text-brand-stone-700 dark:text-slate-300">
                <div>
                  <p className="text-lg font-semibold text-brand-stone-900 dark:text-slate-100">{selectedPart.displayName}</p>
                  <div className="flex flex-wrap gap-2 mt-2">
                    <span className={`inline-flex rounded-full px-2 py-1 text-xs font-semibold ${TYPE_STYLES[selectedPart.displayType].badge}`}>{selectedPart.displayType}</span>
                    <span className="inline-flex rounded-full px-2 py-1 text-xs font-semibold bg-brand-stone-100 text-brand-stone-700">{distanceZone(selectedPart)}</span>
                  </div>
                </div>
                {selectedPart.description && <p><strong>What this part wants known:</strong> {selectedPart.description}</p>}
                {selectedPart.role && <p><strong>How this part may be trying to help:</strong> {selectedPart.role}</p>}
                {selectedPart.notes && <p><strong>What this part may need:</strong> {selectedPart.notes}</p>}
                <p><strong>Relationship to Self-energy:</strong> {distanceZone(selectedPart)}. This is a visual placement, not a judgment about the part.</p>
                {selectedAcceptedSuggestions.length > 0 && <p><strong>Accepted Advisor suggestions:</strong> {selectedAcceptedSuggestions.map(suggestionLabel).join(', ')}</p>}
                {selectedPendingSuggestions.length > 0 && <p><strong>Pending suggestions:</strong> {selectedPendingSuggestions.map(suggestionLabel).join(', ')}</p>}
                <div className="grid grid-cols-2 gap-2 pt-2">
                  <button type="button" onClick={() => movePartBy(selectedPart, -8, 0)} disabled={busy} className="btn-sanctuary-secondary justify-center">Move left</button>
                  <button type="button" onClick={() => movePartBy(selectedPart, 8, 0)} disabled={busy} className="btn-sanctuary-secondary justify-center">Move right</button>
                  <button type="button" onClick={() => movePartRadially(selectedPart, 'in')} disabled={busy} className="btn-sanctuary-secondary justify-center">Closer to Self</button>
                  <button type="button" onClick={() => movePartRadially(selectedPart, 'out')} disabled={busy} className="btn-sanctuary-secondary justify-center">Needs space</button>
                </div>
              </div>
            ) : <p className="mt-3 text-sm text-brand-stone-600 dark:text-slate-400">Select a part to notice it more closely.</p>}
          </div>

          <div className="rounded-3xl border border-brand-stone-200 dark:border-slate-700 p-4">
            <h3 className="font-semibold text-brand-stone-900 dark:text-slate-100">Pending suggestions</h3>
            <p className="mt-1 text-xs text-brand-stone-500 dark:text-slate-500">Your Advisor suggested this as a possible reflection. Keep only what feels true for your inner system.</p>
            {activeSuggestions.length === 0 ? (
              <p className="mt-2 text-sm text-brand-stone-600 dark:text-slate-400">No Advisor suggestions are waiting right now.</p>
            ) : (
              <div className="mt-3 space-y-3">
                {activeSuggestions.map((item) => (
                  <div key={item.id} className="rounded-2xl bg-brand-stone-50 dark:bg-slate-900 p-3 text-sm">
                    <p className="font-semibold text-brand-stone-900 dark:text-slate-100">{suggestionLabel(item)}</p>
                    {item.description && <p className="mt-1 text-brand-stone-600 dark:text-slate-400">{item.description}</p>}
                    {item.label && <p className="mt-1 text-brand-stone-600 dark:text-slate-400">{item.label}</p>}
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
              <p className="mt-1">This map belongs to you. Save only what feels true. Accepted suggestions and moved positions are only saved to your parts map when you confirm.</p>
              <button type="button" onClick={handleSaveConfirmed} disabled={busy || (acceptedUnsaved.length === 0 && !activityState.hasUnsavedConfirmedChanges)} className="btn-sanctuary-primary w-full justify-center mt-3 disabled:opacity-50"><Save className="w-4 h-4" /> Save confirmed map</button>
            </div>
          )}
        </aside>
      </div>

      {isAdvisor && (
        <div className="grid lg:grid-cols-3 gap-4">
          <div className="rounded-3xl border border-brand-stone-200 dark:border-slate-700 p-4 space-y-3">
            <label className="block text-sm font-medium text-brand-stone-700 dark:text-slate-300">Guide map mode</label>
            <select value={mapMode} onChange={(event) => runAction(() => updateSharedMapDraft({ sessionId, layoutDraft: { nodes: {}, relationships: [] }, mapMode: event.target.value, advisorPrompt }))} className="w-full rounded-2xl border border-brand-stone-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-sm">
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

          <form onSubmit={handleSuggestRelationship} className="rounded-3xl border border-brand-stone-200 dark:border-slate-700 p-4 space-y-3">
            <h3 className="font-semibold text-brand-stone-900 dark:text-slate-100">Suggest relationship line</h3>
            <select value={relationshipDraft.fromPartId} onChange={(event) => setRelationshipDraft((prev) => ({ ...prev, fromPartId: event.target.value }))} className="w-full rounded-2xl border border-brand-stone-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-sm">
              <option value="">From part</option>
              {mappedParts.map((part) => <option key={part.id} value={part.id}>{part.displayName}</option>)}
            </select>
            <select value={relationshipDraft.relationshipType} onChange={(event) => setRelationshipDraft((prev) => ({ ...prev, relationshipType: event.target.value }))} className="w-full rounded-2xl border border-brand-stone-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-sm">
              {RELATIONSHIP_OPTIONS.map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}
            </select>
            <select value={relationshipDraft.toPartId} onChange={(event) => setRelationshipDraft((prev) => ({ ...prev, toPartId: event.target.value }))} className="w-full rounded-2xl border border-brand-stone-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-sm">
              <option value="">To part</option>
              {mappedParts.map((part) => <option key={part.id} value={part.id}>{part.displayName}</option>)}
            </select>
            <input value={relationshipDraft.label} onChange={(event) => setRelationshipDraft((prev) => ({ ...prev, label: event.target.value.slice(0, 80) }))} maxLength={80} placeholder="Optional soft label" className="w-full rounded-2xl border border-brand-stone-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-sm" />
            <button type="submit" disabled={busy || !relationshipDraft.fromPartId || !relationshipDraft.toPartId} className="btn-sanctuary-secondary w-full justify-center"><Send className="w-4 h-4" /> Send relationship suggestion</button>
          </form>
        </div>
      )}
    </div>
  );
}
