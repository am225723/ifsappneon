import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Edit3, Loader2, Plus, Save, Sparkles, Trash2 } from 'lucide-react';
import InnerSystemMapCanvas, { pointerToSvgPoint } from '../components/parts/InnerSystemMapCanvas';
import PartDetailPanel from '../components/parts/PartDetailPanel';
import { normalizeMapPart, relationshipLabel, RELATIONSHIP_OPTIONS } from '../components/parts/mapConstants';
import { clientAuth } from '../lib/supabasePersonalization';
import { supabase } from '../lib/supabase';
import {
  createPartRelationship,
  deletePartRelationship,
  loadPartRelationships,
  updatePartRelationship
} from '../lib/partRelationships';

const emptyRelationshipForm = {
  id: null,
  from_part_id: '',
  to_part_id: '',
  relationship_type: 'unknown',
  label: '',
  description: ''
};

function displayPartName(part) {
  return part?.displayName || part?.part_name || part?.name || 'Unnamed part';
}

export default function PartsRelationshipMap() {
  const [client, setClient] = useState(null);
  const [parts, setParts] = useState([]);
  const [relationships, setRelationships] = useState([]);
  const [selectedPartId, setSelectedPartId] = useState(null);
  const [localPositions, setLocalPositions] = useState({});
  const [draggingPartId, setDraggingPartId] = useState(null);
  const [relationshipForm, setRelationshipForm] = useState(emptyRelationshipForm);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const mappedParts = useMemo(
    () => parts.map((part, index) => normalizeMapPart(part, index, localPositions)),
    [parts, localPositions]
  );
  const selectedPart = mappedParts.find((part) => String(part.id) === String(selectedPartId));
  const selectedRelationships = relationships.filter((relationship) => (
    String(relationship.from_part_id) === String(selectedPartId) || String(relationship.to_part_id) === String(selectedPartId)
  ));

  const loadMap = useCallback(async () => {
    const currentClient = clientAuth.getCurrentClientValidated();
    setClient(currentClient);
    if (!currentClient?.id) {
      setLoading(false);
      setError('Please sign in to view your Inner System Map.');
      return;
    }

    setLoading(true);
    setError('');
    const [{ data: partRows, error: partsError }, { data: relationshipRows, error: relationshipsError }] = await Promise.all([
      supabase
        .from('ifs_parts')
        .select('id, client_id, name, part_name, type, part_type, role, description, x, y, size, color, notes, updated_at')
        .eq('client_id', currentClient.id)
        .order('updated_at', { ascending: false }),
      loadPartRelationships({ clientId: currentClient.id })
    ]);

    if (partsError) setError(partsError.message || 'Unable to load parts.');
    if (relationshipsError) setError(relationshipsError.message || 'Unable to load relationships.');
    setParts(partRows || []);
    setRelationships(relationshipRows || []);
    setLoading(false);
  }, []);

  useEffect(() => {
    loadMap();
  }, [loadMap]);

  const savePartPosition = async (partId, position) => {
    if (!client?.id) return;
    setSaving(true);
    const { data, error: saveError } = await supabase
      .from('ifs_parts')
      .update({ x: Math.round(position.x), y: Math.round(position.y), updated_at: new Date().toISOString() })
      .eq('id', partId)
      .eq('client_id', client.id)
      .select()
      .single();
    if (saveError) setError(saveError.message || 'Unable to save part placement.');
    if (data) setParts((prev) => prev.map((part) => (String(part.id) === String(partId) ? { ...part, ...data } : part)));
    setSaving(false);
  };

  const handlePointerDown = (event, part) => {
    event.preventDefault();
    setSelectedPartId(part.id);
    setDraggingPartId(String(part.id));
  };

  const handlePointerMove = (event, svgElement) => {
    if (!draggingPartId || !svgElement) return;
    const next = pointerToSvgPoint(event, svgElement);
    setLocalPositions((prev) => ({ ...prev, [draggingPartId]: next }));
  };

  const handlePointerUp = () => {
    if (!draggingPartId) return;
    const part = mappedParts.find((item) => String(item.id) === draggingPartId);
    setDraggingPartId(null);
    if (part) savePartPosition(part.id, part);
  };

  const movePartBy = (part, dx, dy) => {
    const next = { x: Math.min(94, Math.max(6, part.x + dx)), y: Math.min(94, Math.max(6, part.y + dy)) };
    setLocalPositions((prev) => ({ ...prev, [part.id]: next }));
    savePartPosition(part.id, next);
  };

  const movePartRadially = (part, direction) => {
    const dx = part.x - 50;
    const dy = part.y - 50;
    const length = Math.hypot(dx, dy) || 1;
    const delta = direction === 'in' ? -8 : 8;
    movePartBy(part, (dx / length) * delta, (dy / length) * delta);
  };

  const resetRelationshipForm = () => setRelationshipForm(emptyRelationshipForm);

  const handleRelationshipSubmit = async (event) => {
    event.preventDefault();
    if (!client?.id || !relationshipForm.from_part_id || !relationshipForm.to_part_id) return;
    if (relationshipForm.from_part_id === relationshipForm.to_part_id) {
      setError('Choose two different parts for a relationship.');
      return;
    }

    setSaving(true);
    setError('');
    const payload = { ...relationshipForm, client_id: client.id, description: relationshipForm.description.slice(0, 500) };
    const { data, error: saveError } = relationshipForm.id
      ? await updatePartRelationship(relationshipForm.id, payload)
      : await createPartRelationship(payload);
    if (saveError) {
      setError(saveError.message || 'Unable to save relationship.');
    } else if (data) {
      setRelationships((prev) => relationshipForm.id
        ? prev.map((item) => (String(item.id) === String(data.id) ? data : item))
        : [data, ...prev]);
      resetRelationshipForm();
    }
    setSaving(false);
  };

  const handleEditRelationship = (relationship) => {
    setRelationshipForm({
      id: relationship.id,
      from_part_id: relationship.from_part_id,
      to_part_id: relationship.to_part_id,
      relationship_type: relationship.relationship_type || 'unknown',
      label: relationship.label || '',
      description: relationship.description || ''
    });
  };

  const handleDeleteRelationship = async (relationshipId) => {
    setSaving(true);
    const { error: deleteError } = await deletePartRelationship(relationshipId);
    if (deleteError) setError(deleteError.message || 'Unable to delete relationship.');
    else setRelationships((prev) => prev.filter((relationship) => String(relationship.id) !== String(relationshipId)));
    setSaving(false);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 via-stone-50 to-emerald-50 dark:from-slate-950 dark:via-slate-900 dark:to-emerald-950 p-4 lg:p-8">
      <div className="max-w-7xl mx-auto space-y-5">
        <Link to="/resources" className="inline-flex items-center gap-2 text-sm font-medium text-brand-stone-600 dark:text-slate-300 hover:text-brand-emerald-700">
          <ArrowLeft className="w-4 h-4" /> Back to resources
        </Link>

        <section className="rounded-3xl border border-brand-emerald-100 dark:border-slate-700 bg-white/85 dark:bg-slate-950/80 p-6 shadow-sm">
          <p className="text-xs font-bold uppercase tracking-[0.22em] text-brand-emerald-700 dark:text-brand-emerald-100">Parts Map</p>
          <h1 className="mt-2 text-3xl lg:text-4xl font-serif text-brand-stone-900 dark:text-slate-100">My Inner System Map</h1>
          <p className="mt-3 max-w-3xl text-brand-stone-700 dark:text-slate-300">
            A client-owned map of your parts, their relationships, and their connection to Self-energy.
          </p>
          <p className="mt-3 rounded-2xl bg-brand-emerald-50 dark:bg-emerald-950/40 px-4 py-3 text-sm text-brand-emerald-900 dark:text-emerald-100">
            This map belongs to you. Keep only what feels true for your inner system. Relationships can change over time, and there is no right or wrong map.
          </p>
        </section>

        {error && <div className="rounded-2xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div>}

        <div className="grid xl:grid-cols-[1fr,380px] gap-5">
          <section className="rounded-3xl border border-brand-stone-200 dark:border-slate-700 bg-white dark:bg-slate-950 p-4 min-h-[560px]">
            {loading ? (
              <div className="h-96 flex items-center justify-center text-brand-stone-600 dark:text-slate-400"><Loader2 className="w-5 h-5 animate-spin mr-2" /> Loading your parts…</div>
            ) : mappedParts.length === 0 ? (
              <div className="h-96 flex flex-col items-center justify-center text-center text-brand-stone-600 dark:text-slate-400 px-6">
                <Sparkles className="w-10 h-10 text-brand-emerald-600 mb-3" />
                <h2 className="text-xl font-semibold text-brand-stone-900 dark:text-slate-100">Begin with one part</h2>
                <p className="mt-2 max-w-md">Create a part first, then return here to place it gently on your Inner System Map.</p>
                <Link to="/parts-mapping" className="btn-sanctuary-primary mt-4"><Plus className="w-4 h-4" /> Create a part</Link>
              </div>
            ) : (
              <InnerSystemMapCanvas
                parts={mappedParts}
                relationships={relationships}
                selectedPartId={selectedPartId}
                onSelectPart={setSelectedPartId}
                onPointerDown={handlePointerDown}
                onPointerMove={handlePointerMove}
                onPointerUp={handlePointerUp}
                label="My Inner System Map"
              />
            )}
            <div className="mt-3 grid md:grid-cols-2 gap-3 text-xs text-brand-stone-600 dark:text-slate-400">
              <p>Drag nodes or use the move buttons to adjust each part’s relationship to Self-energy.</p>
              <p>Relationship lines are saved in your client-owned Parts Map after you add or edit them here.</p>
            </div>
          </section>

          <aside className="space-y-4">
            <PartDetailPanel part={selectedPart} onMoveBy={movePartBy} onMoveRadially={movePartRadially} disabled={saving} />

            <section className="rounded-3xl border border-brand-stone-200 dark:border-slate-700 bg-white dark:bg-slate-950 p-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <h2 className="font-semibold text-brand-stone-900 dark:text-slate-100">Relationships</h2>
                  <p className="mt-1 text-xs text-brand-stone-500 dark:text-slate-400">Use “Not sure yet” when the connection is still unclear.</p>
                </div>
                {saving && <Loader2 className="w-4 h-4 animate-spin text-brand-emerald-700" />}
              </div>

              <form onSubmit={handleRelationshipSubmit} className="mt-4 space-y-3 rounded-2xl bg-brand-stone-50 dark:bg-slate-900 p-3">
                <select value={relationshipForm.from_part_id} onChange={(event) => setRelationshipForm((prev) => ({ ...prev, from_part_id: event.target.value }))} className="w-full rounded-2xl border border-brand-stone-200 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-2 text-sm">
                  <option value="">Choose from part</option>
                  {mappedParts.map((part) => <option key={part.id} value={part.id}>{part.displayName}</option>)}
                </select>
                <select value={relationshipForm.relationship_type} onChange={(event) => setRelationshipForm((prev) => ({ ...prev, relationship_type: event.target.value }))} className="w-full rounded-2xl border border-brand-stone-200 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-2 text-sm">
                  {RELATIONSHIP_OPTIONS.map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}
                </select>
                <select value={relationshipForm.to_part_id} onChange={(event) => setRelationshipForm((prev) => ({ ...prev, to_part_id: event.target.value }))} className="w-full rounded-2xl border border-brand-stone-200 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-2 text-sm">
                  <option value="">Choose to part</option>
                  {mappedParts.map((part) => <option key={part.id} value={part.id}>{part.displayName}</option>)}
                </select>
                <input value={relationshipForm.label} onChange={(event) => setRelationshipForm((prev) => ({ ...prev, label: event.target.value.slice(0, 255) }))} maxLength={255} placeholder="Optional short label" className="w-full rounded-2xl border border-brand-stone-200 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-2 text-sm" />
                <textarea value={relationshipForm.description} onChange={(event) => setRelationshipForm((prev) => ({ ...prev, description: event.target.value.slice(0, 500) }))} maxLength={500} placeholder="Optional short description" className="w-full min-h-20 rounded-2xl border border-brand-stone-200 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-2 text-sm" />
                <div className="flex gap-2">
                  <button type="submit" disabled={saving || !relationshipForm.from_part_id || !relationshipForm.to_part_id} className="btn-sanctuary-primary flex-1 justify-center disabled:opacity-50"><Save className="w-4 h-4" /> {relationshipForm.id ? 'Save relationship' : 'Add relationship'}</button>
                  {relationshipForm.id && <button type="button" onClick={resetRelationshipForm} className="btn-sanctuary-secondary">Cancel</button>}
                </div>
              </form>

              <div className="mt-4 space-y-2">
                {relationships.length === 0 ? (
                  <p className="text-sm text-brand-stone-600 dark:text-slate-400">No relationship lines yet. Add only what feels true.</p>
                ) : relationships.map((relationship) => {
                  const fromPart = mappedParts.find((part) => String(part.id) === String(relationship.from_part_id));
                  const toPart = mappedParts.find((part) => String(part.id) === String(relationship.to_part_id));
                  return (
                    <div key={relationship.id} className="rounded-2xl border border-brand-stone-100 dark:border-slate-800 p-3 text-sm">
                      <p className="font-semibold text-brand-stone-900 dark:text-slate-100">{displayPartName(fromPart)} → {relationshipLabel(relationship.relationship_type)} → {displayPartName(toPart)}</p>
                      {relationship.label && <p className="mt-1 text-brand-stone-600 dark:text-slate-400">{relationship.label}</p>}
                      {relationship.description && <p className="mt-1 text-xs text-brand-stone-500 dark:text-slate-500">{relationship.description}</p>}
                      <div className="mt-3 flex gap-2">
                        <button type="button" onClick={() => handleEditRelationship(relationship)} className="btn-sanctuary-secondary text-xs"><Edit3 className="w-3.5 h-3.5" /> Edit</button>
                        <button type="button" onClick={() => handleDeleteRelationship(relationship.id)} className="btn-sanctuary-secondary text-xs text-red-700"><Trash2 className="w-3.5 h-3.5" /> Delete</button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>

            {selectedPart && selectedRelationships.length > 0 && (
              <section className="rounded-3xl border border-brand-emerald-100 bg-brand-emerald-50 p-4 text-sm text-brand-emerald-900">
                <p className="font-semibold">Connections for {selectedPart.displayName}</p>
                <p className="mt-1">{selectedRelationships.length} relationship line{selectedRelationships.length === 1 ? '' : 's'} currently include this part.</p>
              </section>
            )}
          </aside>
        </div>
      </div>
    </div>
  );
}
