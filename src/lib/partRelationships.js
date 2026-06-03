import { supabase } from './supabase';

const DESCRIPTION_LIMIT = 500;
const RELATIONSHIP_TYPES = new Set([
  'close_to',
  'protects',
  'concerned_about',
  'polarized_with',
  'supports',
  'needs_space_from',
  'unknown'
]);

function normalizeRelationshipPayload(payload = {}) {
  const relationshipType = RELATIONSHIP_TYPES.has(payload.relationship_type || payload.relationshipType)
    ? (payload.relationship_type || payload.relationshipType)
    : 'unknown';
  return {
    client_id: payload.client_id || payload.clientId,
    from_part_id: payload.from_part_id || payload.fromPartId,
    to_part_id: payload.to_part_id || payload.toPartId,
    relationship_type: relationshipType,
    label: String(payload.label || '').trim().slice(0, 255) || null,
    description: String(payload.description || '').trim().slice(0, DESCRIPTION_LIMIT) || null,
    confirmed_by_client: payload.confirmed_by_client ?? true,
    updated_at: new Date().toISOString()
  };
}

export async function loadPartRelationships({ clientId }) {
  return supabase
    .from('ifs_part_relationships')
    .select('*')
    .eq('client_id', clientId)
    .order('updated_at', { ascending: false });
}

export async function createPartRelationship(payload) {
  const safePayload = {
    ...normalizeRelationshipPayload(payload),
    created_by: payload.created_by || payload.createdBy || payload.client_id || payload.clientId,
    confirmed_by_client: true,
    created_at: new Date().toISOString()
  };
  return supabase
    .from('ifs_part_relationships')
    .insert(safePayload)
    .select()
    .single();
}

export async function updatePartRelationship(relationshipId, updates) {
  const safeUpdates = normalizeRelationshipPayload(updates);
  delete safeUpdates.client_id;
  return supabase
    .from('ifs_part_relationships')
    .update(safeUpdates)
    .eq('id', relationshipId)
    .select()
    .single();
}

export async function deletePartRelationship(relationshipId) {
  return supabase
    .from('ifs_part_relationships')
    .delete()
    .eq('id', relationshipId)
    .select()
    .single();
}
