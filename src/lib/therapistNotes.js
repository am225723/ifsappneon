import { supabase } from './supabase';

function normalizeError(error, fallback = 'Therapist note request failed') {
  if (!error) return null;
  return typeof error === 'string' ? { message: error } : error.message ? error : { message: fallback };
}

function compactTags(tags) {
  return Array.isArray(tags)
    ? tags.filter((tag) => tag?.id).map((tag) => ({ ...tag, id: String(tag.id) }))
    : [];
}

function normalizeNoteType(noteType) {
  const allowed = new Set(['session_note', 'prep_note', 'homework_review', 'treatment_plan_review', 'general', 'archived']);
  return allowed.has(noteType) ? noteType : 'general';
}

export async function loadTherapistNotesForClient(clientId) {
  if (!clientId) return { data: [], error: { message: 'Missing client id' } };
  const { data, error } = await supabase
    .from('ifs_therapist_notes')
    .select('*')
    .eq('client_id', clientId)
    .order('created_at', { ascending: false });
  return { data: data || [], error: normalizeError(error) };
}

export async function createTherapistNote({
  therapistId,
  clientId,
  noteType = 'general',
  clinicalSummary,
  content,
  sessionDate,
  taggedParts = [],
  taggedTreatmentGoals = []
}) {
  if (!therapistId || !clientId || !content?.trim()) {
    return { data: null, error: { message: 'Therapist, client, and note content are required' } };
  }
  const now = new Date().toISOString();
  const { data, error } = await supabase
    .from('ifs_therapist_notes')
    .insert({
      therapist_id: therapistId,
      client_id: clientId,
      note_type: normalizeNoteType(noteType),
      clinical_summary: clinicalSummary?.trim() || null,
      content: content.trim(),
      session_date: sessionDate || null,
      tagged_parts: compactTags(taggedParts),
      tagged_treatment_goals: compactTags(taggedTreatmentGoals),
      created_at: now,
      updated_at: now
    })
    .select()
    .single();
  return { data, error: normalizeError(error) };
}

export async function updateTherapistNote(noteId, updates = {}) {
  if (!noteId) return { data: null, error: { message: 'Missing therapist note id' } };
  const payload = { updated_at: new Date().toISOString() };
  if ('noteType' in updates) payload.note_type = normalizeNoteType(updates.noteType);
  if ('note_type' in updates) payload.note_type = normalizeNoteType(updates.note_type);
  if ('clinicalSummary' in updates) payload.clinical_summary = updates.clinicalSummary?.trim() || null;
  if ('clinical_summary' in updates) payload.clinical_summary = updates.clinical_summary?.trim() || null;
  if ('content' in updates) payload.content = updates.content?.trim() || null;
  if ('sessionDate' in updates) payload.session_date = updates.sessionDate || null;
  if ('session_date' in updates) payload.session_date = updates.session_date || null;
  if ('taggedParts' in updates) payload.tagged_parts = compactTags(updates.taggedParts);
  if ('tagged_parts' in updates) payload.tagged_parts = compactTags(updates.tagged_parts);
  if ('taggedTreatmentGoals' in updates) payload.tagged_treatment_goals = compactTags(updates.taggedTreatmentGoals);
  if ('tagged_treatment_goals' in updates) payload.tagged_treatment_goals = compactTags(updates.tagged_treatment_goals);

  const { data, error } = await supabase
    .from('ifs_therapist_notes')
    .update(payload)
    .eq('id', noteId)
    .select()
    .single();
  return { data, error: normalizeError(error) };
}

export function archiveTherapistNote(noteId) {
  return updateTherapistNote(noteId, { noteType: 'archived' });
}
