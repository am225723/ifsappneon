import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, CheckCircle2, Edit3, Loader2, Plus, Save, Sparkles, Trash2 } from 'lucide-react';
import InnerSystemMapCanvas, { pointerToSvgPoint } from '../components/parts/InnerSystemMapCanvas';
import PartDetailPanel from '../components/parts/PartDetailPanel';
import { normalizeMapPart, relationshipLabel, RELATIONSHIP_OPTIONS } from '../components/parts/mapConstants';
import { clientAuth } from '../lib/supabasePersonalization';
import { supabase } from '../lib/supabase';
import { getPartsMapParts } from '../lib/interactiveResults';
import { loadMyIFSProfile } from '../lib/myIFSProfile';
import { importLegacyPartsMap, previewLegacyPartsImport } from '../lib/legacyPartsImport';
import {
  createPartRelationship,
  deletePartRelationship,
  loadPartRelationships,
  updatePartRelationship
} from '../lib/partRelationships';

const DATA_LOAD_ERROR_MESSAGE = 'Your IFS data could not be loaded right now. Please refresh or try again.';

function getSafeErrorStatus(error) {
  return error?.status || error?.statusCode || null;
}

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
  const [resolvedSelfProfile, setResolvedSelfProfile] = useState(null);
  const [parts, setParts] = useState([]);
  const [relationships, setRelationships] = useState([]);
  const [legacyPartsMap, setLegacyPartsMap] = useState(null);
  const [legacyImportPreview, setLegacyImportPreview] = useState(null);
  const [selectedLegacyPartIds, setSelectedLegacyPartIds] = useState([]);
  const [legacyImportConfirmed, setLegacyImportConfirmed] = useState(false);
  const [legacyImportLoading, setLegacyImportLoading] = useState(false);
  const [legacyImportDismissed, setLegacyImportDismissed] = useState(false);
  const [legacyImportResult, setLegacyImportResult] = useState(null);
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

    setLoading(true);
    setError('');

    let profileResult = null;
    try {
      profileResult = await loadMyIFSProfile(currentClient);
    } catch (profileError) {
      console.error('Error resolving Parts Map self profile:', profileError);
    }

    const clerkLinkedSelfProfile = String(profileResult?.source || '').startsWith('clerk_user_id') ? profileResult?.profile : null;
    const isClientUser = currentClient?.user_role === 'client';
    const effectiveClientId = clerkLinkedSelfProfile?.id || (isClientUser ? currentClient?.id : null);
    const effectiveClient = clerkLinkedSelfProfile || (isClientUser ? currentClient : null);
    setResolvedSelfProfile(clerkLinkedSelfProfile || null);
    setClient(effectiveClient);

    if (!effectiveClientId) {
      setLoading(false);
      setError('Please sign in with a Clerk-linked self profile to view your Inner System Map.');
      return;
    }
    const [
      { data: partRows, error: partsError },
      { data: relationshipRows, error: relationshipsError },
      { data: partsMapRow, error: partsMapError }
    ] = await Promise.all([
      supabase
        .from('ifs_parts')
        .select('id, client_id, name, part_name, type, part_type, role, description, x, y, size, color, notes, updated_at')
        .eq('client_id', effectiveClientId)
        .order('updated_at', { ascending: false }),
      loadPartRelationships({ clientId: effectiveClientId }),
      supabase
        .from('ifs_interactive_data')
        .select('id, data, updated_at')
        .eq('client_id', effectiveClientId)
        .eq('module_id', 'parts_map')
        .maybeSingle()
    ]);

    const loadErrors = [
      partsError && { table: 'ifs_parts', status: getSafeErrorStatus(partsError) },
      relationshipsError && { table: 'ifs_part_relationships', status: getSafeErrorStatus(relationshipsError) },
      partsMapError && { table: 'ifs_interactive_data', status: getSafeErrorStatus(partsMapError) }
    ].filter(Boolean);

    if (loadErrors.length) {
      setError(DATA_LOAD_ERROR_MESSAGE);
      if (import.meta.env.DEV) {
        console.warn('[PartsRelationshipMap] data query failures', loadErrors.map((item) => ({
          ...item,
          effectiveClientId,
          selfProfilePresent: Boolean(clerkLinkedSelfProfile?.id)
        })));
      }
    }
    setParts(partRows || []);
    setRelationships(relationshipRows || []);
    setLegacyPartsMap(partsMapRow || null);
    setLegacyImportPreview(null);
    setLoading(false);
  }, []);

  useEffect(() => {
    loadMap();
  }, [loadMap]);

  const savePartPosition = async (partId, position) => {
    if (!effectiveClientId) return;
    setSaving(true);
    const { data, error: saveError } = await supabase
      .from('ifs_parts')
      .update({ x: Math.round(position.x), y: Math.round(position.y), updated_at: new Date().toISOString() })
      .eq('id', partId)
      .eq('client_id', effectiveClientId)
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



  const effectiveClientId = resolvedSelfProfile?.id || client?.id || null;
  const legacyPartsCount = getPartsMapParts(legacyPartsMap).length;
  const importPreviewAvailable = Boolean(legacyImportPreview && ((legacyImportPreview.importable || []).length > 0 || (legacyImportPreview.skipped || []).length > 0));
  const shouldShowImportCard = Boolean(
    !loading &&
    !legacyImportDismissed &&
    effectiveClientId &&
    legacyPartsMap &&
    legacyPartsCount > 0 &&
    (!legacyImportPreview || importPreviewAvailable)
  );
  const importAvailable = shouldShowImportCard;

  useEffect(() => {
    if (import.meta.env.DEV) {
      console.info('[PartsRelationshipMap] self import signals', {
        currentUserRole: clientAuth.getCurrentClientValidated()?.user_role || null,
        resolvedSelfProfileId: resolvedSelfProfile?.id || null,
        effectiveClientId,
        legacyPartsMapFound: Boolean(legacyPartsMap),
        legacyPartsCount,
        persistentPartsCount: parts.length,
        shouldShowImportCard,
        importPreviewAvailable
      });
    }
  }, [resolvedSelfProfile?.id, effectiveClientId, legacyPartsMap, legacyPartsCount, parts.length, shouldShowImportCard, importPreviewAvailable]);

  const handlePreviewLegacyImport = async () => {
    if (!effectiveClientId) return;
    setLegacyImportLoading(true);
    setLegacyImportResult(null);
    setLegacyImportConfirmed(false);
    setError('');
    const { data, error: previewError } = await previewLegacyPartsImport({ clientId: effectiveClientId });
    if (previewError) {
      setLegacyImportPreview(null);
      setError(previewError.message || 'We could not preview the import. Your older map is still safe and unchanged.');
      if (import.meta.env.DEV) {
        console.warn('[PartsRelationshipMap] legacy import preview failed', {
          status: getSafeErrorStatus(previewError),
          effectiveClientId,
          selfProfilePresent: Boolean(resolvedSelfProfile?.id)
        });
      }
    } else {
      setLegacyImportPreview(data);
      setSelectedLegacyPartIds((data?.importable || []).map((part) => String(part.id)));
    }
    setLegacyImportLoading(false);
  };

  const toggleLegacyPartSelection = (partId) => {
    setSelectedLegacyPartIds((prev) => (
      prev.includes(String(partId)) ? prev.filter((id) => id !== String(partId)) : [...prev, String(partId)]
    ));
  };

  const handleImportLegacyParts = async () => {
    if (!effectiveClientId || !legacyImportConfirmed || selectedLegacyPartIds.length === 0) return;
    setLegacyImportLoading(true);
    setLegacyImportResult(null);
    setError('');
    const { data, error: importError } = await importLegacyPartsMap({
      clientId: effectiveClientId,
      selectedPartIds: selectedLegacyPartIds,
      overwrite: false
    });
    if (importError) {
      setLegacyImportResult(data || { imported: [], skipped: [], errors: [{ message: importError.message }], legacyPreserved: true });
      setError(importError.message || 'We could not complete the import. Your older map is still safe and unchanged.');
      if (import.meta.env.DEV) {
        console.warn('[PartsRelationshipMap] legacy import failed', {
          status: getSafeErrorStatus(importError),
          effectiveClientId,
          selfProfilePresent: Boolean(resolvedSelfProfile?.id)
        });
      }
    } else {
      setLegacyImportResult(data);
      await loadMap();
    }
    setLegacyImportLoading(false);
  };

  const resetRelationshipForm = () => setRelationshipForm(emptyRelationshipForm);

  const handleRelationshipSubmit = async (event) => {
    event.preventDefault();
    if (!effectiveClientId || !relationshipForm.from_part_id || !relationshipForm.to_part_id) return;
    if (relationshipForm.from_part_id === relationshipForm.to_part_id) {
      setError('Choose two different parts for a relationship.');
      return;
    }

    setSaving(true);
    setError('');
    const payload = { ...relationshipForm, client_id: effectiveClientId, description: relationshipForm.description.slice(0, 500) };
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

        {importAvailable && (
          <section className="rounded-3xl border border-brand-gold-200 bg-brand-gold-50/80 p-4 text-sm text-brand-stone-700 dark:border-brand-gold-900/40 dark:bg-brand-gold-950/20 dark:text-slate-300">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
              <div>
                <p className="font-semibold text-brand-stone-900 dark:text-slate-100">Import Existing Parts Map</p>
                <p className="mt-1">
                  We found an older saved Parts Map. You can bring those parts into your current Inner System Map when you are ready.
                </p>
                <p className="mt-2 text-xs text-brand-stone-600 dark:text-slate-400">
                  Nothing will be deleted. Your older map stays preserved, and duplicates are skipped unless a future merge option is explicitly added.
                </p>
              </div>
              <div className="flex shrink-0 flex-wrap gap-2">
                <button type="button" onClick={handlePreviewLegacyImport} disabled={legacyImportLoading} className="btn-sanctuary-primary disabled:opacity-50">
                  {legacyImportLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />} Preview Import
                </button>
                <button type="button" onClick={() => setLegacyImportDismissed(true)} className="btn-sanctuary-secondary">Not Now</button>
              </div>
            </div>

            {legacyImportPreview && (
              <div className="mt-4 rounded-3xl border border-white/70 bg-white/85 p-4 shadow-sm dark:border-slate-800 dark:bg-slate-950/70">
                <p className="font-semibold text-brand-stone-900 dark:text-slate-100">Import My Existing Parts Map</p>
                <p className="mt-1">
                  We found an older saved Parts Map. You can import it into your current Inner System Map. Nothing will be deleted, and you can review what will be added before saving.
                </p>
                {legacyImportPreview.onlySelf && (
                  <p className="mt-2 rounded-2xl bg-brand-emerald-50 px-3 py-2 text-brand-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-100">
                    Your older map currently contains Self. You can import it as the starting center of your Inner System Map.
                  </p>
                )}
                {legacyImportPreview.persistentPartCount > 0 && (
                  <p className="mt-2 rounded-2xl bg-brand-stone-50 px-3 py-2 text-brand-stone-700 dark:bg-slate-900 dark:text-slate-300">
                    You already have parts in your current Inner System Map. The import will skip duplicates.
                  </p>
                )}
                <div className="mt-4 grid gap-3 lg:grid-cols-2">
                  <div>
                    <p className="text-xs font-bold uppercase tracking-wide text-brand-emerald-700 dark:text-brand-emerald-100">Will be imported</p>
                    <div className="mt-2 space-y-2">
                      {legacyImportPreview.importable.length === 0 ? (
                        <p className="rounded-2xl bg-brand-stone-50 p-3 text-brand-stone-600 dark:bg-slate-900 dark:text-slate-400">No new importable parts were found.</p>
                      ) : legacyImportPreview.importable.map((part) => (
                        <label key={part.id} className="flex items-start gap-3 rounded-2xl border border-brand-stone-100 bg-brand-stone-50 p-3 dark:border-slate-800 dark:bg-slate-900">
                          <input type="checkbox" className="mt-1" checked={selectedLegacyPartIds.includes(String(part.id))} onChange={() => toggleLegacyPartSelection(part.id)} />
                          <span>
                            <span className="block font-semibold text-brand-stone-900 dark:text-slate-100">{part.name}</span>
                            <span className="block text-xs text-brand-stone-500 dark:text-slate-500">New part id: {part.id}{part.type ? ` • ${part.type}` : ''}</span>
                            {part.role && <span className="mt-1 block text-xs text-brand-stone-600 dark:text-slate-400">{part.role}</span>}
                          </span>
                        </label>
                      ))}
                    </div>
                  </div>
                  <div>
                    <p className="text-xs font-bold uppercase tracking-wide text-brand-stone-500 dark:text-slate-500">Skipped for safety</p>
                    <div className="mt-2 space-y-2">
                      {legacyImportPreview.skipped.length === 0 ? (
                        <p className="rounded-2xl bg-brand-stone-50 p-3 text-brand-stone-600 dark:bg-slate-900 dark:text-slate-400">No duplicate or invalid parts detected in the preview.</p>
                      ) : legacyImportPreview.skipped.map((part, index) => (
                        <div key={`${part.legacyId || part.name || 'skipped'}-${index}`} className="rounded-2xl bg-brand-stone-50 p-3 dark:bg-slate-900">
                          <p className="font-semibold text-brand-stone-900 dark:text-slate-100">{part.name || 'Unnamed part'}</p>
                          <p className="text-xs text-brand-stone-500 dark:text-slate-500">{part.message || part.reason}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
                <label className="mt-4 flex items-start gap-3 rounded-2xl bg-brand-emerald-50 p-3 text-brand-emerald-950 dark:bg-emerald-950/40 dark:text-emerald-100">
                  <input type="checkbox" className="mt-1" checked={legacyImportConfirmed} onChange={(event) => setLegacyImportConfirmed(event.target.checked)} />
                  <span>I understand this will add selected parts to my current Inner System Map and will not delete my older map.</span>
                </label>
                <div className="mt-4 flex flex-wrap gap-2">
                  <button type="button" onClick={handleImportLegacyParts} disabled={legacyImportLoading || !legacyImportConfirmed || selectedLegacyPartIds.length === 0} className="btn-sanctuary-primary disabled:opacity-50">
                    {legacyImportLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />} Import Selected Parts
                  </button>
                  <button type="button" onClick={() => setLegacyImportPreview(null)} className="btn-sanctuary-secondary">Not Now</button>
                </div>
              </div>
            )}

            {legacyImportResult && (
              <div className="mt-4 rounded-2xl border border-brand-emerald-100 bg-brand-emerald-50 p-3 text-brand-emerald-900 dark:border-emerald-900/50 dark:bg-emerald-950/30 dark:text-emerald-100">
                <p className="font-semibold">
                  {legacyImportResult.errors?.length ? 'We could not complete every import. Your older map is still safe and unchanged.' : 'Your selected parts were added to your Inner System Map.'}
                </p>
                <p className="mt-1 text-xs">
                  Imported {legacyImportResult.imported?.length || 0}; skipped {legacyImportResult.skipped?.length || 0}; legacy preserved: {legacyImportResult.legacyPreserved ? 'yes' : 'unknown'}.
                </p>
              </div>
            )}
          </section>
        )}

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
