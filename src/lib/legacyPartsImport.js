import { supabase } from './supabase';
import { getClerkToken } from './apiAuth.js';

const API_PATH = '/api/parts-import';

async function callPartsImportApi(payload) {
  const token = await getClerkToken();
  const response = await fetch(API_PATH, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {})
    },
    body: JSON.stringify(payload)
  });
  const json = await response.json().catch(() => ({}));
  if (!response.ok) {
    return {
      data: json.data || null,
      error: { ...(json.error || { message: response.statusText || 'Unable to complete legacy parts import.' }), status: response.status }
    };
  }
  return { data: json.data, error: null };
}

export async function loadLegacyPartsMapForClient(clientId) {
  return supabase
    .from('ifs_interactive_data')
    .select('id, client_id, module_id, data, created_at, updated_at')
    .eq('client_id', clientId)
    .eq('module_id', 'parts_map')
    .maybeSingle();
}

export async function previewLegacyPartsImport({ clientId }) {
  return callPartsImportApi({ action: 'preview_legacy_parts_map', clientId });
}

export async function importLegacyPartsMap({ clientId, selectedPartIds, overwrite = false }) {
  return callPartsImportApi({ action: 'import_legacy_parts_map', clientId, selectedPartIds, overwrite });
}
