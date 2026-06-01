import { supabase } from './supabase';

const TREATMENT_PLAN_COLUMNS = '*';

function normalizeError(error, fallback = 'Treatment plan request failed') {
  if (!error) return null;
  return typeof error === 'string' ? { message: error } : error.message ? error : { message: fallback };
}

function compactList(value) {
  if (!value) return [];
  if (Array.isArray(value)) return value.filter(Boolean);
  return String(value).split('\n').map((item) => item.trim()).filter(Boolean);
}

function toPlanPayload(input = {}) {
  return {
    therapist_id: input.therapistId,
    client_id: input.clientId,
    goal_title: input.goalTitle?.trim(),
    goal_description: input.goalDescription?.trim() || null,
    target_wounds: compactList(input.targetWounds),
    target_parts: compactList(input.targetParts),
    objectives: compactList(input.objectives),
    interventions: compactList(input.interventions),
    status: input.status || 'active',
    review_date: input.reviewDate || null,
    updated_at: new Date().toISOString()
  };
}

function toUpdatePayload(updates = {}) {
  const payload = {};
  const map = {
    goalTitle: 'goal_title',
    goalDescription: 'goal_description',
    targetWounds: 'target_wounds',
    targetParts: 'target_parts',
    objectives: 'objectives',
    interventions: 'interventions',
    reviewDate: 'review_date',
    completedAt: 'completed_at'
  };

  Object.entries(map).forEach(([camel, snake]) => {
    if (Object.prototype.hasOwnProperty.call(updates, camel)) {
      payload[snake] = ['targetWounds', 'targetParts', 'objectives', 'interventions'].includes(camel)
        ? compactList(updates[camel])
        : (updates[camel] || null);
    }
  });
  ['goal_title', 'goal_description', 'target_wounds', 'target_parts', 'objectives', 'interventions', 'status', 'review_date', 'completed_at'].forEach((key) => {
    if (Object.prototype.hasOwnProperty.call(updates, key)) payload[key] = updates[key];
  });
  payload.updated_at = new Date().toISOString();
  return payload;
}

export async function loadTreatmentPlansForClient(clientId) {
  if (!clientId) return { data: [], error: { message: 'Missing client id' } };
  const { data, error } = await supabase
    .from('ifs_treatment_plans')
    .select(TREATMENT_PLAN_COLUMNS)
    .eq('client_id', clientId)
    .order('review_date', { ascending: true })
    .order('created_at', { ascending: false });
  return { data: data || [], error: normalizeError(error) };
}

export async function loadActiveTreatmentPlansForClient(clientId) {
  if (!clientId) return { data: [], error: { message: 'Missing client id' } };
  const { data, error } = await supabase
    .from('ifs_treatment_plans')
    .select(TREATMENT_PLAN_COLUMNS)
    .eq('client_id', clientId)
    .in('status', ['active', 'completed'])
    .order('review_date', { ascending: true })
    .order('created_at', { ascending: false });
  return { data: data || [], error: normalizeError(error) };
}

export async function createTreatmentPlan(input) {
  const payload = toPlanPayload(input);
  if (!payload.therapist_id || !payload.client_id || !payload.goal_title) {
    return { data: null, error: { message: 'Therapist, client, and goal title are required' } };
  }
  const { data, error } = await supabase
    .from('ifs_treatment_plans')
    .insert({ ...payload, created_at: new Date().toISOString() })
    .select()
    .single();
  return { data, error: normalizeError(error) };
}

export async function updateTreatmentPlan(planId, updates) {
  if (!planId) return { data: null, error: { message: 'Missing treatment plan id' } };
  const { data, error } = await supabase
    .from('ifs_treatment_plans')
    .update(toUpdatePayload(updates))
    .eq('id', planId)
    .select()
    .single();
  return { data, error: normalizeError(error) };
}

export function pauseTreatmentPlan(planId) {
  return updateTreatmentPlan(planId, { status: 'paused' });
}

export function completeTreatmentPlan(planId) {
  return updateTreatmentPlan(planId, { status: 'completed', completed_at: new Date().toISOString() });
}

export function archiveTreatmentPlan(planId) {
  return updateTreatmentPlan(planId, { status: 'archived' });
}
