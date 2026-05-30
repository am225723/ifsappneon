import { supabase } from './supabase';

export async function loadAssignedClients(therapistId, columns = 'id, name, pin, email, phone, status, last_active, created_at, user_role, access_restrictions') {
  if (!therapistId) return [];

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
