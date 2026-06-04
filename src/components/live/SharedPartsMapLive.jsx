import { useMemo, useState } from 'react';
import { CheckCircle2, Compass, Lightbulb, Move, Plus, Send, ShieldCheck, Trash2 } from 'lucide-react';
import {
  confirmSharedMapNode,
  removeSharedMapNode,
  selectSharedMapNode,
  updateSharedPartsMap
} from '../../lib/liveSession';

const ROLE_OPTIONS = [
  { id: 'unknown', label: 'Not Sure Yet' },
  { id: 'protector', label: 'Protector' },
  { id: 'manager', label: 'Manager' },
  { id: 'firefighter', label: 'Firefighter' },
  { id: 'exile', label: 'Exile' },
  { id: 'self-like', label: 'Self-like Part' }
];

const COLOR_OPTIONS = [
  { id: 'amber', label: 'Amber', classes: 'bg-amber-100 border-amber-300 text-amber-900' },
  { id: 'orange', label: 'Orange', classes: 'bg-orange-100 border-orange-300 text-orange-900' },
  { id: 'emerald', label: 'Emerald', classes: 'bg-emerald-100 border-emerald-300 text-emerald-900' },
  { id: 'green', label: 'Green', classes: 'bg-green-100 border-green-300 text-green-900' },
  { id: 'rose', label: 'Rose', classes: 'bg-rose-100 border-rose-300 text-rose-900' },
  { id: 'sky', label: 'Sky', classes: 'bg-sky-100 border-sky-300 text-sky-900' },
  { id: 'stone', label: 'Stone', classes: 'bg-stone-100 border-stone-300 text-stone-900' },
  { id: 'gold', label: 'Gold', classes: 'bg-yellow-100 border-yellow-300 text-yellow-900' }
];

const GENTLE_PROMPTS = [
  'Notice what this part may want you to know.',
  'How does it feel toward you noticing it right now?',
  'What name feels accurate enough, without forcing it?',
  'Does this role feel right, or would “Not Sure Yet” be kinder?',
  'Would this part like more space, closeness, or simply acknowledgement?'
];

function roleLabel(role) {
  return ROLE_OPTIONS.find((item) => item.id === role)?.label || 'Not Sure Yet';
}

function colorClasses(color) {
  return COLOR_OPTIONS.find((item) => item.id === color)?.classes || COLOR_OPTIONS[0].classes;
}

function normalizeState(activityState = {}) {
  const nodes = Array.isArray(activityState.map?.nodes) ? activityState.map.nodes : [];
  return {
    nodes,
    selectedNodeId: activityState.selectedNodeId || nodes[0]?.localId || null,
    advisorPrompt: activityState.advisorPrompt || ''
  };
}

function makeNodeId() {
  return `node-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
}

function clampPosition(value) {
  return Math.min(100, Math.max(0, Math.round(Number(value) || 50)));
}

export default function SharedPartsMapLive({ sessionId, activityState = {}, role = 'client', onSessionUpdate }) {
  const isAdvisor = role === 'advisor';
  const { nodes, selectedNodeId, advisorPrompt } = normalizeState(activityState);
  const [draftName, setDraftName] = useState('');
  const [draftRole, setDraftRole] = useState('unknown');
  const [promptDraft, setPromptDraft] = useState(advisorPrompt || '');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const selectedNode = useMemo(
    () => nodes.find((node) => node.localId === selectedNodeId) || nodes[0] || null,
    [nodes, selectedNodeId]
  );

  const runAction = async (callback) => {
    setBusy(true);
    setError('');
    const { data, error: actionError } = await callback();
    if (actionError) setError(actionError.message);
    if (data && onSessionUpdate) onSessionUpdate(data);
    setBusy(false);
    return data;
  };

  const commitNodes = (nextNodes, options = {}) => runAction(() => updateSharedPartsMap({
    sessionId,
    mapUpdate: {
      map: { nodes: nextNodes, edges: [] },
      selectedNodeId: options.selectedNodeId ?? selectedNode?.localId ?? null,
      advisorPrompt: options.advisorPrompt ?? advisorPrompt,
      lastAction: options.lastAction || 'part_updated'
    }
  }));

  const handleSelectNode = (nodeId) => runAction(() => selectSharedMapNode({ sessionId, nodeId }));

  const handleAddNode = async (event) => {
    event.preventDefault();
    const name = draftName.trim() || (isAdvisor ? 'Suggested Part' : 'New Part');
    const localId = makeNodeId();
    const offset = nodes.length % 6;
    const nextNode = {
      localId,
      partId: null,
      name,
      role: draftRole,
      color: isAdvisor ? 'orange' : 'amber',
      x: 18 + offset * 12,
      y: 24 + (nodes.length % 3) * 18,
      createdBy: isAdvisor ? 'advisor' : 'client',
      status: 'draft',
      clientConfirmed: false
    };
    const saved = await commitNodes([...nodes, nextNode], { selectedNodeId: localId, lastAction: 'part_added' });
    if (saved) {
      setDraftName('');
      setDraftRole('unknown');
    }
  };

  const updateSelectedNode = (patch, lastAction = 'part_updated') => {
    if (!selectedNode) return null;
    const nextNodes = nodes.map((node) => (node.localId === selectedNode.localId ? { ...node, ...patch } : node));
    return commitNodes(nextNodes, { selectedNodeId: selectedNode.localId, lastAction });
  };

  const moveSelectedNode = (dx, dy) => {
    if (!selectedNode) return null;
    return updateSelectedNode({ x: clampPosition(selectedNode.x + dx), y: clampPosition(selectedNode.y + dy) }, 'part_moved');
  };

  const handleConfirmSelected = () => {
    if (!selectedNode) return null;
    return runAction(() => confirmSharedMapNode({ sessionId, nodeId: selectedNode.localId }));
  };

  const handleRemoveSelected = () => {
    if (!selectedNode) return null;
    return runAction(() => removeSharedMapNode({ sessionId, nodeId: selectedNode.localId }));
  };

  const handleSendPrompt = (event) => {
    event.preventDefault();
    return commitNodes(nodes, { selectedNodeId: selectedNode?.localId || null, advisorPrompt: promptDraft, lastAction: 'advisor_prompt_sent' });
  };

  const canEditSelected = selectedNode && (
    isAdvisor ? selectedNode.createdBy === 'advisor' && !selectedNode.clientConfirmed : true
  );
  const canRemoveSelected = selectedNode && (
    isAdvisor ? selectedNode.createdBy === 'advisor' && !selectedNode.clientConfirmed : !selectedNode.clientConfirmed || selectedNode.createdBy === 'client'
  );

  return (
    <div className="space-y-5">
      <div className="rounded-3xl border border-amber-100 bg-amber-50/70 p-5 dark:border-slate-700 dark:bg-slate-900/40">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.22em] text-brand-emerald-700 dark:text-brand-emerald-100">Shared Parts Map</p>
            <h2 className="mt-1 text-2xl font-serif text-brand-stone-900 dark:text-slate-100">Collaborative Inner System Mapping</h2>
            <p className="mt-2 max-w-3xl text-sm text-brand-stone-700 dark:text-slate-300">
              {isAdvisor
                ? 'Map parts together during this Advisor-guided practice. Client confirmation is required before anything is treated as chosen by the client.'
                : 'Your Advisor has opened a Shared Parts Map. You can choose what feels true, rename parts, and decide what to save to your inner system.'}
            </p>
            <p className="mt-2 text-xs font-medium text-brand-stone-600 dark:text-slate-400">
              Parts are named by the client. Advisor suggestions are invitations, not conclusions.
            </p>
          </div>
          <div className="rounded-2xl bg-white/80 px-4 py-3 text-sm text-brand-stone-700 shadow-sm dark:bg-slate-950/70 dark:text-slate-300">
            <div className="flex items-center gap-2 font-semibold"><Compass className="h-4 w-4" /> Client-owned map</div>
            <p className="mt-1 text-xs">No audio, video, transcript, diagnosis, or automatic interpretation is added here.</p>
          </div>
        </div>
      </div>

      {!isAdvisor && (
        <div className="rounded-2xl border border-brand-emerald-100 bg-brand-emerald-50 p-4 text-sm text-brand-emerald-900 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200">
          This shared map is used during Advisor-guided practice. Only save what feels accurate to you.
        </div>
      )}

      {error && <div className="rounded-2xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div>}

      {advisorPrompt && (
        <div className="rounded-2xl border border-sky-100 bg-sky-50 p-4 text-sm text-sky-900">
          <div className="flex items-center gap-2 font-semibold"><Lightbulb className="h-4 w-4" /> Advisor invitation</div>
          <p className="mt-1">{advisorPrompt}</p>
        </div>
      )}

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_320px]">
        <section className="rounded-3xl border border-brand-stone-200 bg-[#fffaf0] p-4 dark:border-slate-700 dark:bg-slate-900">
          <div className="mb-3 flex items-center justify-between gap-3">
            <div>
              <h3 className="font-semibold text-brand-stone-900 dark:text-slate-100">Inner system board</h3>
              <p className="text-xs text-brand-stone-600 dark:text-slate-400">Use the arrows after selecting a part to gently adjust its position.</p>
            </div>
            <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-brand-stone-600 shadow-sm dark:bg-slate-950 dark:text-slate-300">{nodes.length}/30 parts</span>
          </div>
          <div className="relative min-h-[430px] overflow-hidden rounded-[2rem] border border-dashed border-amber-200 bg-gradient-to-br from-white via-amber-50 to-emerald-50 dark:border-slate-700 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950">
            <div className="absolute left-1/2 top-1/2 h-28 w-28 -translate-x-1/2 -translate-y-1/2 rounded-full border border-amber-200 bg-white/70 text-center text-xs font-semibold text-amber-800 shadow-sm flex items-center justify-center">
              Self-energy<br />space
            </div>
            {nodes.length === 0 && (
              <div className="absolute inset-0 flex items-center justify-center p-8 text-center text-sm text-brand-stone-500">
                Add a part or invite a gentle Advisor suggestion to begin mapping what is present.
              </div>
            )}
            {nodes.map((node) => {
              const selected = selectedNode?.localId === node.localId;
              return (
                <button
                  type="button"
                  key={node.localId}
                  onClick={() => handleSelectNode(node.localId)}
                  className={`absolute min-w-36 max-w-48 rounded-3xl border-2 px-4 py-3 text-left shadow-sm transition ${colorClasses(node.color)} ${selected ? 'ring-4 ring-brand-emerald-300' : 'hover:scale-[1.02]'}`}
                  style={{ left: `${clampPosition(node.x)}%`, top: `${clampPosition(node.y)}%`, transform: 'translate(-50%, -50%)' }}
                >
                  <span className="block text-sm font-bold truncate">{node.name}</span>
                  <span className="mt-1 block text-[11px]">{roleLabel(node.role)}</span>
                  <span className="mt-2 inline-flex items-center gap-1 rounded-full bg-white/80 px-2 py-0.5 text-[10px] font-semibold">
                    {node.clientConfirmed ? <CheckCircle2 className="h-3 w-3" /> : <Move className="h-3 w-3" />}
                    {node.clientConfirmed ? 'Client-confirmed' : 'Draft'} · {node.createdBy === 'advisor' ? 'Advisor' : 'Client'}
                  </span>
                </button>
              );
            })}
          </div>
        </section>

        <aside className="space-y-4">
          <form onSubmit={handleAddNode} className="rounded-3xl border border-brand-stone-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-900">
            <h3 className="font-semibold text-brand-stone-900 dark:text-slate-100">{isAdvisor ? 'Suggest a part' : 'Add a part'}</h3>
            <p className="mt-1 text-xs text-brand-stone-500">{isAdvisor ? 'The client can rename, confirm, or remove suggestions.' : 'Name only what feels true enough right now.'}</p>
            <input
              value={draftName}
              onChange={(event) => setDraftName(event.target.value.slice(0, 80))}
              maxLength={80}
              placeholder={isAdvisor ? 'Suggested part name' : 'Part name'}
              className="mt-3 w-full rounded-2xl border border-brand-stone-200 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-950"
            />
            <select value={draftRole} onChange={(event) => setDraftRole(event.target.value)} className="mt-2 w-full rounded-2xl border border-brand-stone-200 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-950">
              {ROLE_OPTIONS.map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}
            </select>
            <button type="submit" disabled={busy || nodes.length >= 30} className="btn-sanctuary-secondary mt-3 w-full justify-center disabled:opacity-50">
              <Plus className="h-4 w-4" /> {isAdvisor ? 'Suggest part' : 'Add part'}
            </button>
          </form>

          {selectedNode ? (
            <div className="rounded-3xl border border-brand-stone-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-900">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3 className="font-semibold text-brand-stone-900 dark:text-slate-100">Selected part</h3>
                  <p className="text-xs text-brand-stone-500">Created by {selectedNode.createdBy === 'advisor' ? 'Advisor' : 'Client'}</p>
                </div>
                <span className={`rounded-full px-2 py-1 text-[11px] font-semibold ${selectedNode.clientConfirmed ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'}`}>{selectedNode.clientConfirmed ? 'Client-confirmed' : 'Draft'}</span>
              </div>

              <label className="mt-4 block text-xs font-semibold text-brand-stone-600">Part name</label>
              <input
                value={selectedNode.name}
                onChange={(event) => updateSelectedNode({ name: event.target.value.slice(0, 80), clientConfirmed: selectedNode.clientConfirmed && !isAdvisor })}
                disabled={busy || !canEditSelected}
                maxLength={80}
                className="mt-1 w-full rounded-2xl border border-brand-stone-200 bg-white px-3 py-2 text-sm disabled:opacity-60 dark:border-slate-700 dark:bg-slate-950"
              />

              <label className="mt-3 block text-xs font-semibold text-brand-stone-600">Gentle role label</label>
              <select
                value={selectedNode.role || 'unknown'}
                onChange={(event) => updateSelectedNode({ role: event.target.value, clientConfirmed: selectedNode.clientConfirmed && !isAdvisor })}
                disabled={busy || !canEditSelected}
                className="mt-1 w-full rounded-2xl border border-brand-stone-200 bg-white px-3 py-2 text-sm disabled:opacity-60 dark:border-slate-700 dark:bg-slate-950"
              >
                {ROLE_OPTIONS.map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}
              </select>

              <div className="mt-3 grid grid-cols-4 gap-2">
                {COLOR_OPTIONS.slice(0, 4).map((item) => (
                  <button key={item.id} type="button" onClick={() => updateSelectedNode({ color: item.id })} disabled={busy || !canEditSelected} className={`rounded-xl border px-2 py-1 text-[11px] ${item.classes} ${selectedNode.color === item.id ? 'ring-2 ring-brand-emerald-300' : ''}`}>{item.label}</button>
                ))}
              </div>

              <div className="mt-4 rounded-2xl bg-brand-stone-50 p-3 text-xs text-brand-stone-700 dark:bg-slate-950 dark:text-slate-300">
                <p className="font-semibold">Gentle prompt</p>
                <p className="mt-1">{GENTLE_PROMPTS[Math.abs(nodes.findIndex((node) => node.localId === selectedNode.localId)) % GENTLE_PROMPTS.length]}</p>
              </div>

              <div className="mt-4 grid grid-cols-3 gap-2 text-sm">
                <button type="button" onClick={() => moveSelectedNode(0, -8)} disabled={busy || !canEditSelected} className="btn-sanctuary-secondary justify-center disabled:opacity-50">↑</button>
                <button type="button" onClick={() => moveSelectedNode(-8, 0)} disabled={busy || !canEditSelected} className="btn-sanctuary-secondary justify-center disabled:opacity-50">←</button>
                <button type="button" onClick={() => moveSelectedNode(8, 0)} disabled={busy || !canEditSelected} className="btn-sanctuary-secondary justify-center disabled:opacity-50">→</button>
                <span />
                <button type="button" onClick={() => moveSelectedNode(0, 8)} disabled={busy || !canEditSelected} className="btn-sanctuary-secondary justify-center disabled:opacity-50">↓</button>
                <span />
              </div>

              {!isAdvisor && !selectedNode.clientConfirmed && (
                <button type="button" onClick={handleConfirmSelected} disabled={busy} className="btn-sanctuary-primary mt-4 w-full justify-center disabled:opacity-50">
                  <ShieldCheck className="h-4 w-4" /> Confirm this part
                </button>
              )}
              {isAdvisor && !selectedNode.clientConfirmed && (
                <p className="mt-4 rounded-2xl bg-amber-50 p-3 text-xs text-amber-900">Client confirmation required. Advisor suggestions are invitations, not saved conclusions.</p>
              )}
              {canRemoveSelected && (
                <button type="button" onClick={handleRemoveSelected} disabled={busy} className="mt-3 w-full rounded-2xl border border-red-200 px-4 py-2 text-sm font-semibold text-red-700 hover:bg-red-50 disabled:opacity-50">
                  <Trash2 className="mr-2 inline h-4 w-4" /> Remove draft part
                </button>
              )}
              {!isAdvisor && selectedNode.clientConfirmed && (
                <p className="mt-4 rounded-2xl bg-emerald-50 p-3 text-xs text-emerald-900">Permanent “Save to My Inner System” is deferred in this phase. This confirmed part stays in the live shared map for now.</p>
              )}
            </div>
          ) : (
            <div className="rounded-3xl border border-dashed border-brand-stone-200 p-6 text-center text-sm text-brand-stone-500 dark:border-slate-700">Select or add a part to see details.</div>
          )}

          {isAdvisor && (
            <form onSubmit={handleSendPrompt} className="rounded-3xl border border-brand-stone-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-900">
              <h3 className="font-semibold text-brand-stone-900 dark:text-slate-100">Send short prompt</h3>
              <textarea
                value={promptDraft}
                onChange={(event) => setPromptDraft(event.target.value.slice(0, 240))}
                maxLength={240}
                placeholder="Notice what this part may want you to know…"
                className="mt-2 min-h-24 w-full rounded-2xl border border-brand-stone-200 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-950"
              />
              <button type="submit" disabled={busy} className="btn-sanctuary-secondary mt-3 w-full justify-center disabled:opacity-50"><Send className="h-4 w-4" /> Send prompt</button>
            </form>
          )}
        </aside>
      </div>
    </div>
  );
}
