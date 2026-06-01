import { supabase } from './supabase';
import { loadAssignedClients, loadAssignedTherapists } from './therapistAssignments';

const AGENDA_COLUMNS = '*';

function normalizeError(error, fallback = 'Session agenda request failed') {
  if (!error) return null;
  return typeof error === 'string' ? { message: error } : error.message ? error : { message: fallback };
}

function toAgendaPayload(input = {}, status = 'submitted') {
  return {
    client_id: input.clientId,
    therapist_id: input.therapistId,
    session_date: input.sessionDate || null,
    session_datetime: input.sessionDatetime || null,
    topics: input.topics?.trim() || 'Pre-session agenda draft',
    active_parts: input.activeParts || [],
    stuck_points: input.stuckPoints?.trim() || null,
    goals_for_session: input.goalsForSession?.trim() || null,
    current_stress_level: input.currentStressLevel ? Number(input.currentStressLevel) : null,
    current_mood_label: input.currentMoodLabel?.trim() || null,
    safety_concerns: input.safetyConcerns?.trim() || null,
    status,
    updated_at: new Date().toISOString()
  };
}

export async function loadClientSessionAgendas(clientId) {
  if (!clientId) return { data: [], error: { message: 'Missing client id' } };
  const { data, error } = await supabase
    .from('ifs_session_agendas')
    .select(AGENDA_COLUMNS)
    .eq('client_id', clientId)
    .order('session_date', { ascending: false })
    .order('created_at', { ascending: false });
  return { data: data || [], error: normalizeError(error) };
}

export async function loadLatestClientSessionAgenda(clientId) {
  if (!clientId) return { data: null, error: { message: 'Missing client id' } };
  const { data, error } = await supabase
    .from('ifs_session_agendas')
    .select(AGENDA_COLUMNS)
    .eq('client_id', clientId)
    .in('status', ['draft', 'submitted', 'reviewed'])
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  return { data: data || null, error: normalizeError(error) };
}

export async function loadTherapistClientSessionAgendas(therapistId, clientId) {
  if (!therapistId || !clientId) return { data: [], error: { message: 'Missing therapist or client id' } };
  const { data, error } = await supabase
    .from('ifs_session_agendas')
    .select(AGENDA_COLUMNS)
    .eq('therapist_id', therapistId)
    .eq('client_id', clientId)
    .in('status', ['submitted', 'reviewed', 'archived'])
    .order('session_date', { ascending: false })
    .order('created_at', { ascending: false });
  return { data: data || [], error: normalizeError(error) };
}

export async function loadUpcomingSessionPrepForTherapist(therapistId) {
  if (!therapistId) return { data: [], error: { message: 'Missing therapist id' } };
  const assignedClients = await loadAssignedClients(therapistId, 'id, name, user_role');
  const clientIds = assignedClients.map((client) => client.id).filter(Boolean);
  if (clientIds.length === 0) return { data: [], error: null };

  const { data, error } = await supabase
    .from('ifs_session_agendas')
    .select(AGENDA_COLUMNS)
    .eq('therapist_id', therapistId)
    .in('client_id', clientIds)
    .in('status', ['submitted', 'reviewed'])
    .order('session_date', { ascending: false })
    .order('created_at', { ascending: false })
    .limit(100);

  const namesById = Object.fromEntries(assignedClients.map((client) => [client.id, client.name]));
  const rows = (data || []).map((agenda) => ({ ...agenda, client_name: namesById[agenda.client_id] || 'Assigned client' }));
  return { data: rows, error: normalizeError(error) };
}

export async function loadClientAgendaTherapist(clientId) {
  if (!clientId) return { data: null, error: { message: 'Missing client id' } };
  const assignments = await loadAssignedTherapists(clientId);
  const assignment = assignments?.[0];
  if (!assignment?.therapist_id) return { data: null, error: { message: 'No active therapist assignment found' } };
  return { data: assignment.therapist_id, error: null };
}

export async function submitSessionAgenda(input) {
  const payload = toAgendaPayload(input, 'submitted');
  const { data, error } = await supabase
    .from('ifs_session_agendas')
    .insert({ ...payload, created_at: new Date().toISOString() })
    .select()
    .single();
  return { data, error: normalizeError(error) };
}

export async function saveDraftSessionAgenda(input) {
  const payload = toAgendaPayload(input, 'draft');
  if (input.agendaId) {
    const { data, error } = await supabase
      .from('ifs_session_agendas')
      .update(payload)
      .eq('id', input.agendaId)
      .select()
      .single();
    return { data, error: normalizeError(error) };
  }

  const { data, error } = await supabase
    .from('ifs_session_agendas')
    .insert({ ...payload, created_at: new Date().toISOString() })
    .select()
    .single();
  return { data, error: normalizeError(error) };
}

export async function markSessionAgendaReviewed(agendaId, therapistNotes = '') {
  if (!agendaId) return { data: null, error: { message: 'Missing agenda id' } };
  const { data, error } = await supabase
    .from('ifs_session_agendas')
    .update({
      therapist_notes: therapistNotes || null,
      reviewed_at: new Date().toISOString(),
      status: 'reviewed',
      updated_at: new Date().toISOString()
    })
    .eq('id', agendaId)
    .select()
    .single();
  return { data, error: normalizeError(error) };
}

export async function archiveSessionAgenda(agendaId) {
  if (!agendaId) return { data: null, error: { message: 'Missing agenda id' } };
  const { data, error } = await supabase
    .from('ifs_session_agendas')
    .update({ status: 'archived', updated_at: new Date().toISOString() })
    .eq('id', agendaId)
    .select()
    .single();
  return { data, error: normalizeError(error) };
}
