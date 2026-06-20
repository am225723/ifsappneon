import { supabase } from './supabase';

const SUPPRESSED_STATUSES = new Set(['dismissed', 'accepted', 'merged']);

function nowIso() { return new Date().toISOString(); }
function normalizeType(type) { return type === 'relationship' ? 'relationship' : 'part'; }
function normalizeStatus(status) { return ['dismissed', 'accepted', 'merged', 'restored'].includes(status) ? status : 'dismissed'; }

export async function loadPartSuggestionState({ clientId }) {
  if (!clientId) return { data: [], error: { message: 'Missing client id' } };
  return supabase
    .from('ifs_part_suggestion_state')
    .select('*')
    .eq('client_id', clientId)
    .order('updated_at', { ascending: false });
}

export async function upsertPartSuggestionState({
  clientId,
  suggestionId,
  suggestionType = 'part',
  status,
  sourceType,
  sourceId,
  targetPartId,
  targetRelationshipId,
  metadata = {}
}) {
  if (!clientId || !suggestionId) return { data: null, error: { message: 'Missing client id or suggestion id' } };
  const payload = {
    client_id: clientId,
    suggestion_id: String(suggestionId),
    suggestion_type: normalizeType(suggestionType),
    status: normalizeStatus(status),
    source_type: sourceType || null,
    source_id: sourceId ? String(sourceId) : null,
    target_part_id: targetPartId ? String(targetPartId) : null,
    target_relationship_id: targetRelationshipId || null,
    metadata: metadata && typeof metadata === 'object' ? metadata : {},
    updated_at: nowIso()
  };
  return supabase
    .from('ifs_part_suggestion_state')
    .upsert(payload, { onConflict: 'client_id,suggestion_id,suggestion_type' })
    .select()
    .single();
}

export const dismissPartSuggestion = ({ clientId, suggestionId }) => upsertPartSuggestionState({ clientId, suggestionId, suggestionType: 'part', status: 'dismissed' });
export const acceptPartSuggestion = ({ clientId, suggestionId, targetPartId, metadata }) => upsertPartSuggestionState({ clientId, suggestionId, suggestionType: 'part', status: 'accepted', targetPartId, metadata });
export const mergePartSuggestion = ({ clientId, suggestionId, targetPartId, metadata }) => upsertPartSuggestionState({ clientId, suggestionId, suggestionType: 'part', status: 'merged', targetPartId, metadata });
export const restorePartSuggestion = ({ clientId, suggestionId, suggestionType = 'part' }) => upsertPartSuggestionState({ clientId, suggestionId, suggestionType, status: 'restored' });
export const dismissRelationshipSuggestion = ({ clientId, suggestionId }) => upsertPartSuggestionState({ clientId, suggestionId, suggestionType: 'relationship', status: 'dismissed' });
export const acceptRelationshipSuggestion = ({ clientId, suggestionId, targetRelationshipId, metadata }) => upsertPartSuggestionState({ clientId, suggestionId, suggestionType: 'relationship', status: 'accepted', targetRelationshipId, metadata });

export function applySuggestionState(suggestions = { parts: [], relationships: [] }, state = []) {
  const stateByKey = new Map((state || []).map((row) => [`${row.suggestion_type}:${row.suggestion_id}`, row]));
  const decorate = (items, type) => (items || []).map((item) => {
    const reviewState = stateByKey.get(`${type}:${item.id}`) || null;
    return { ...item, reviewState, hiddenByState: reviewState ? SUPPRESSED_STATUSES.has(reviewState.status) : false };
  });
  const parts = decorate(suggestions.parts, 'part');
  const relationships = decorate(suggestions.relationships, 'relationship');
  return {
    parts: parts.filter((item) => !item.hiddenByState),
    relationships: relationships.filter((item) => !item.hiddenByState),
    dismissedParts: parts.filter((item) => item.reviewState?.status === 'dismissed'),
    dismissedRelationships: relationships.filter((item) => item.reviewState?.status === 'dismissed'),
    acceptedCount: (state || []).filter((row) => row.status === 'accepted').length,
    mergedCount: (state || []).filter((row) => row.status === 'merged').length,
    dismissedCount: (state || []).filter((row) => row.status === 'dismissed').length
  };
}
