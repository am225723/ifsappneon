import { supabase } from './supabase';
import { getClerkToken } from './apiAuth.js';

async function getJson(path) {
  const token = await getClerkToken();
  const response = await fetch(path, {
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {})
    }
  });
  const json = await response.json().catch(() => ({}));
  if (!response.ok) return { data: null, error: json.error || { message: response.statusText } };
  return { data: json.data, error: null };
}

function pickColumns(rows, columns) {
  if (!columns || columns === '*') return rows;
  const requested = columns.split(',').map((column) => column.trim()).filter(Boolean);
  return rows.map((row) => Object.fromEntries(requested.map((column) => [column, row[column]])));
}

// assignment_status/assigned_at/discharged_at are computed by the secure API
// route's JOIN — they don't exist as columns on ifs_clients itself, so a
// direct Supabase select against that table must not request them.
const ASSIGNMENT_VIRTUAL_COLUMNS = new Set(['assignment_status', 'assigned_at', 'discharged_at']);
function clientsTableColumns(columns) {
  if (!columns || columns === '*') return columns;
  const kept = columns.split(',').map((c) => c.trim()).filter((c) => c && !ASSIGNMENT_VIRTUAL_COLUMNS.has(c));
  return kept.length ? kept.join(', ') : 'id';
}

export async function loadAssignedClients(therapistId, columns = 'id, name, pin, email, phone, status, last_active, created_at, user_role, access_restrictions', options = {}) {
  if (!therapistId) return [];
  const { includeUnassigned = false } = options;

  const query = includeUnassigned ? '/api/therapist/assigned-clients?includeUnassigned=true' : '/api/therapist/assigned-clients';
  const { data, error } = await getJson(query);
  if (!error && data) return pickColumns(data, columns);

  console.warn('Secure assigned-clients route unavailable; falling back to scoped assignment query.', error);
  const { data: assignments, error: assignmentError } = await supabase
    .from('ifs_therapist_clients')
    .select('client_id, status')
    .eq('therapist_id', therapistId)
    .eq('status', 'active');

  if (assignmentError) {
    console.error('Error loading assigned client ids:', assignmentError);
    return [];
  }

  const assignedIds = [...new Set((assignments || []).map((row) => row.client_id).filter(Boolean))];
  const rawColumns = clientsTableColumns(columns);
  const wantsAssignmentStatus = !columns || columns === '*' || columns.includes('assignment_status');

  const { data: assignedClients, error: clientError } = assignedIds.length
    ? await supabase.from('ifs_clients').select(rawColumns).in('id', assignedIds).eq('user_role', 'client').order('name')
    : { data: [], error: null };

  if (clientError) {
    console.error('Error loading assigned client records:', clientError);
    return [];
  }

  const assignedWithStatus = wantsAssignmentStatus
    ? (assignedClients || []).map((c) => ({ ...c, assignment_status: 'active' }))
    : (assignedClients || []);

  if (!includeUnassigned) return assignedWithStatus;

  // Also surface clients nobody has claimed yet (e.g. fresh signups with no
  // ifs_therapist_clients row at all), so the fallback path doesn't hide them.
  const { data: allTherapistClientRows, error: allAssignmentsError } = await supabase
    .from('ifs_therapist_clients')
    .select('client_id');

  if (allAssignmentsError) {
    console.error('Error loading assignment ids for unassigned lookup:', allAssignmentsError);
    return assignedWithStatus;
  }

  const claimedIds = new Set((allTherapistClientRows || []).map((row) => row.client_id).filter(Boolean));
  const { data: allClients, error: allClientsError } = await supabase
    .from('ifs_clients')
    .select(rawColumns)
    .eq('user_role', 'client')
    .order('name');

  if (allClientsError) {
    console.error('Error loading unassigned client records:', allClientsError);
    return assignedWithStatus;
  }

  const unassignedClients = (allClients || [])
    .filter((c) => !claimedIds.has(c.id))
    .map((c) => (wantsAssignmentStatus ? { ...c, assignment_status: null } : c));
  return [...assignedWithStatus, ...unassignedClients];
}

export async function loadCaseloadClients() {
  const { data, error } = await getJson('/api/therapist/assigned-clients?includeDischarged=true');
  if (error) {
    console.error('Error loading caseload:', error);
    return [];
  }
  return data || [];
}

export async function assignClientToTherapist(therapistId, clientId, status = 'active', names = {}) {
  if (!therapistId || !clientId) return { data: null, error: { message: 'Missing therapist or client id' } };

  const therapistName = names.therapistName || names.therapist_name;
  const clientName = names.clientName || names.client_name;

  return supabase
    .from('ifs_therapist_clients')
    .upsert({
      therapist_id: therapistId,
      ...(therapistName ? { therapist_name: therapistName } : {}),
      client_id: clientId,
      ...(clientName ? { client_name: clientName } : {}),
      status,
      assigned_at: new Date().toISOString(),
      discharged_at: status === 'active' ? null : new Date().toISOString(),
    }, { onConflict: 'therapist_id,client_id' })
    .select()
    .single();
}

export async function dischargeClientAssignment(therapistId, clientId) {
  if (!therapistId || !clientId) return { data: null, error: { message: 'Missing therapist or client id' } };
  return supabase
    .from('ifs_therapist_clients')
    .update({ status: 'discharged', discharged_at: new Date().toISOString(), updated_at: new Date().toISOString() })
    .eq('therapist_id', therapistId)
    .eq('client_id', clientId)
    .select()
    .single();
}

export async function reactivateClientAssignment(therapistId, clientId) {
  if (!therapistId || !clientId) return { data: null, error: { message: 'Missing therapist or client id' } };
  return supabase
    .from('ifs_therapist_clients')
    .update({ status: 'active', discharged_at: null, updated_at: new Date().toISOString() })
    .eq('therapist_id', therapistId)
    .eq('client_id', clientId)
    .select()
    .single();
}

export async function loadAssignedTherapists(clientId) {
  if (!clientId) return [];

  const { data, error } = await supabase
    .from('ifs_therapist_clients')
    .select('*')
    .eq('client_id', clientId)
    .eq('status', 'active')
    .order('assigned_at', { ascending: false });

  if (error) {
    console.error('Error loading assigned therapists:', error);
    return [];
  }

  return data || [];
}

export async function assignTherapistsToClient(therapistIds, clientId, status = 'active', names = {}) {
  const uniqueTherapistIds = [...new Set((therapistIds || []).filter(Boolean))];
  if (!clientId || uniqueTherapistIds.length === 0) {
    return { data: [], error: { message: 'Missing client id or therapist ids' } };
  }

  const clientName = names.clientName || names.client_name;

  return supabase
    .from('ifs_therapist_clients')
    .upsert(uniqueTherapistIds.map((therapistId) => {
      const therapistName = names.therapistNamesById?.[therapistId] || names.therapistName || names.therapist_name;
      return {
        therapist_id: therapistId,
        ...(therapistName ? { therapist_name: therapistName } : {}),
        client_id: clientId,
        ...(clientName ? { client_name: clientName } : {}),
        status,
        assigned_at: new Date().toISOString(),
        discharged_at: status === 'active' ? null : new Date().toISOString(),
      };
    }), { onConflict: 'therapist_id,client_id' })
    .select();
}
