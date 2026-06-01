import { supabase } from './supabase';

async function getAuthToken() {
  try {
    const clerk = window.Clerk;
    if (clerk?.session?.getToken) return await clerk.session.getToken();
  } catch (error) {
    console.warn('Unable to read Clerk token:', error);
  }
  return null;
}

async function getJson(path) {
  const token = await getAuthToken();
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

export async function loadAssignedClients(therapistId, columns = 'id, name, pin, email, phone, status, last_active, created_at, user_role, access_restrictions') {
  if (!therapistId) return [];

  const { data, error } = await getJson('/api/therapist/assigned-clients');
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

  const clientIds = [...new Set((assignments || []).map((row) => row.client_id).filter(Boolean))];
  if (clientIds.length === 0) return [];

  const { data: clients, error: clientError } = await supabase
    .from('ifs_clients')
    .select(columns)
    .in('id', clientIds)
    .eq('user_role', 'client')
    .order('name');

  if (clientError) {
    console.error('Error loading assigned client records:', clientError);
    return [];
  }

  return clients || [];
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
