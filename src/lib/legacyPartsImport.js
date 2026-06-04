import { supabase } from './supabase';

const API_PATH = '/api/parts-import';

async function getAuthToken() {
  try {
    const clerk = window.Clerk;
    if (clerk?.session?.getToken) return await clerk.session.getToken();
  } catch (error) {
    console.warn('Unable to read Clerk token for legacy parts import:', error);
  }
  return null;
}

async function callPartsImportApi(payload) {
  const token = await getAuthToken();
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
