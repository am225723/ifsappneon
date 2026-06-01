import { supabase } from './supabase';

const ACTIVE_STATUSES = ['assigned', 'in_progress'];
const VISIBLE_STATUSES = ['assigned', 'in_progress', 'completed', 'reviewed'];

function nowIso() {
  return new Date().toISOString();
}

function normalizeDuplicateError(error) {
  if (!error) return null;
  const message = error.message || '';
  if (message.includes('idx_ifs_assigned_homework_unique_active') || message.toLowerCase().includes('duplicate')) {
    return { ...error, message: 'This module is already actively assigned to the selected client.' };
  }
  return error;
}

export async function loadAssignedHomeworkForClient(clientId) {
  if (!clientId) return { data: [], error: null };
  const { data, error } = await supabase
    .from('ifs_assigned_homework')
    .select('*')
    .eq('client_id', clientId)
    .in('status', VISIBLE_STATUSES)
    .order('assigned_at', { ascending: false });
  return { data: data || [], error };
}

export async function loadAssignedHomeworkForTherapistClient(therapistId, clientId) {
  if (!therapistId || !clientId) return { data: [], error: null };
  const { data, error } = await supabase
    .from('ifs_assigned_homework')
    .select('*')
    .eq('therapist_id', therapistId)
    .eq('client_id', clientId)
    .order('assigned_at', { ascending: false });
  return { data: data || [], error };
}

export async function assignModuleHomework({ therapistId, clientId, moduleId, title, instructions }) {
  if (!therapistId || !clientId || !moduleId) {
    return { data: null, error: { message: 'Therapist, client, and module are required.' } };
  }

  const duplicate = await supabase
    .from('ifs_assigned_homework')
    .select('id, status')
    .eq('client_id', clientId)
    .eq('module_id', moduleId)
    .in('status', ACTIVE_STATUSES)
    .maybeSingle();

  if (duplicate.error) return { data: null, error: duplicate.error };
  if (duplicate.data) {
    return { data: null, error: { message: 'This module is already actively assigned to the selected client.' } };
  }

  const { data, error } = await supabase
    .from('ifs_assigned_homework')
    .insert({
      therapist_id: therapistId,
      client_id: clientId,
      module_id: moduleId,
      title: title || null,
      instructions: instructions || null,
      status: 'assigned',
      assigned_at: nowIso(),
      created_at: nowIso(),
      updated_at: nowIso()
    })
    .select()
    .single();

  return { data, error: normalizeDuplicateError(error) };
}

export async function markAssignedHomeworkStarted(homeworkId) {
  if (!homeworkId) return { data: null, error: { message: 'Homework id is required.' } };
  const timestamp = nowIso();
  const existing = await supabase
    .from('ifs_assigned_homework')
    .select('started_at')
    .eq('id', homeworkId)
    .maybeSingle();
  if (existing.error) return { data: null, error: existing.error };

  return supabase
    .from('ifs_assigned_homework')
    .update({
      status: 'in_progress',
      started_at: existing.data?.started_at || timestamp,
      updated_at: timestamp
    })
    .eq('id', homeworkId)
    .select()
    .single();
}

export async function markAssignedHomeworkCompleted(homeworkId) {
  if (!homeworkId) return { data: null, error: { message: 'Homework id is required.' } };
  const timestamp = nowIso();
  return supabase
    .from('ifs_assigned_homework')
    .update({ status: 'completed', completed_at: timestamp, updated_at: timestamp })
    .eq('id', homeworkId)
    .select()
    .single();
}

export async function markAssignedHomeworkReviewed(homeworkId, therapistFeedback) {
  if (!homeworkId) return { data: null, error: { message: 'Homework id is required.' } };
  const timestamp = nowIso();
  return supabase
    .from('ifs_assigned_homework')
    .update({
      status: 'reviewed',
      therapist_feedback: therapistFeedback || null,
      reviewed_at: timestamp,
      updated_at: timestamp
    })
    .eq('id', homeworkId)
    .select()
    .single();
}

export async function archiveAssignedHomework(homeworkId) {
  if (!homeworkId) return { data: null, error: { message: 'Homework id is required.' } };
  return supabase
    .from('ifs_assigned_homework')
    .update({ status: 'archived', updated_at: nowIso() })
    .eq('id', homeworkId)
    .select()
    .single();
}

export async function syncAssignedHomeworkCompletion(clientId, moduleId) {
  if (!clientId || !moduleId) return { data: null, error: null };
  const { data: assignments, error } = await supabase
    .from('ifs_assigned_homework')
    .select('*')
    .eq('client_id', clientId)
    .eq('module_id', moduleId)
    .in('status', ['assigned', 'in_progress', 'completed', 'reviewed']);

  if (error) return { data: null, error };
  const target = (assignments || []).find(item => item.status !== 'reviewed');
  if (!target || target.status === 'completed') return { data: target || null, error: null };

  const timestamp = nowIso();
  return supabase
    .from('ifs_assigned_homework')
    .update({
      status: 'completed',
      completed_at: target.completed_at || timestamp,
      updated_at: timestamp
    })
    .eq('id', target.id)
    .select()
    .single();
}
