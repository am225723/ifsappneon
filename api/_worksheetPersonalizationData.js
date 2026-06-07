import { sql } from './_auth.js';

function truncateText(value, max = 500) {
  if (value === null || value === undefined) return null;
  const text = typeof value === 'string' ? value : JSON.stringify(value);
  const cleaned = text.replace(/\s+/g, ' ').trim();
  if (!cleaned || ['{}', '[]', 'null', 'undefined'].includes(cleaned)) return null;
  return cleaned.length > max ? `${cleaned.slice(0, max)}…` : cleaned;
}

function safeJson(value) {
  if (!value) return null;
  if (typeof value === 'object') return value;
  try { return JSON.parse(value); } catch { return null; }
}

function optionalQuery(label, promise) {
  return promise
    .then((rows) => ({ label, rows: Array.isArray(rows) ? rows : [], error: null }))
    .catch((error) => ({ label, rows: [], error }));
}

function capArray(rows = [], limit, mapper) {
  return rows.slice(0, limit).map(mapper).filter(Boolean);
}

function summarizeInteractiveData(rows = []) {
  const moduleResponses = [];
  const curriculumReflections = [];
  const assessments = [];
  for (const row of rows) {
    const data = safeJson(row.data) || {};
    const moduleId = row.module_id || '';
    const summary = truncateText(data.summary || data.reflection || data.response || data.answer || data.primary || data.secondary || data.insight || data, 420);
    if (!summary) continue;
    const item = { module_id: moduleId, title: truncateText(data.moduleTitle || data.title || moduleId, 140), summary, updated_at: row.updated_at || row.created_at };
    if (String(moduleId).startsWith('assessment_')) assessments.push(item);
    else if (String(moduleId).startsWith('module-') || data.moduleTitle || data.reflection) curriculumReflections.push(item);
    else moduleResponses.push(item);
  }
  return {
    module_responses: moduleResponses.slice(0, 20),
    curriculum_reflections: curriculumReflections.slice(0, 20),
    interactive_assessments: assessments.slice(0, 12)
  };
}

function summarizeHomework(row) {
  const interactiveResponses = safeJson(row.interactive_responses);
  let structured_summary = null;
  if (interactiveResponses) {
    try { structured_summary = truncateText(Object.entries(interactiveResponses).map(([key, value]) => `${key}: ${typeof value === 'object' ? JSON.stringify(value).slice(0, 180) : value}`).join(' | '), 500); } catch { structured_summary = null; }
  }
  return {
    title: truncateText(row.title || row.module_id || row.category, 180),
    category: row.category,
    status: row.status,
    assigned_at: row.assigned_at || row.created_at,
    completed_at: row.completed_at,
    completion_notes: truncateText(row.completion_notes, 400),
    structured_response_summary: structured_summary,
    advisor_feedback_present: Boolean(row.therapist_feedback || row.advisor_feedback)
  };
}

export async function buildWorksheetPersonalizationData({ clientId, advisorInput = '', includeAdvisorNotes = false }) {
  const [clientResult, interactiveResult, lifeResult, journalResult, homeworkResult, partsResult, relationshipsResult, assessmentResult, moodResult, notesResult] = await Promise.all([
    optionalQuery('ifs_clients', sql`SELECT id, name, user_role, created_at FROM ifs_clients WHERE id = ${clientId} LIMIT 1`),
    optionalQuery('ifs_interactive_data', sql`SELECT id, module_id, data, created_at, updated_at FROM ifs_interactive_data WHERE client_id = ${clientId} ORDER BY COALESCE(updated_at, created_at) DESC LIMIT 140`),
    optionalQuery('ifs_life_integration_reflections', sql`SELECT reflection_type, practice_type, prompt, response, reflection, notes, created_at FROM ifs_life_integration_reflections WHERE client_id = ${clientId} ORDER BY created_at DESC LIMIT 30`),
    optionalQuery('ifs_journal_entries', sql`SELECT title, content, created_at FROM ifs_journal_entries WHERE client_id = ${clientId} ORDER BY created_at DESC LIMIT 20`),
    optionalQuery('ifs_assigned_homework', sql`SELECT title, module_id, category, status, assigned_at, created_at, completed_at, completion_notes, interactive_responses, therapist_feedback, advisor_feedback FROM ifs_assigned_homework WHERE client_id = ${clientId} ORDER BY COALESCE(assigned_at, created_at) DESC LIMIT 20`),
    optionalQuery('ifs_parts', sql`SELECT name, part_name, type, part_type, role, emotion, primary_emotion, notes, updated_at, created_at FROM ifs_parts WHERE client_id = ${clientId} ORDER BY COALESCE(updated_at, created_at) DESC LIMIT 30`),
    optionalQuery('ifs_part_relationships', sql`SELECT relationship_type, type, description, notes, created_at FROM ifs_part_relationships WHERE client_id = ${clientId} ORDER BY created_at DESC LIMIT 30`),
    optionalQuery('ifs_assessment_results', sql`SELECT primary_wound, secondary_wound, tertiary_wounds, summary, results, assessment_date, created_at FROM ifs_assessment_results WHERE client_id = ${clientId} ORDER BY COALESCE(assessment_date, created_at) DESC LIMIT 8`),
    optionalQuery('ifs_mood_entries', sql`SELECT mood, mood_label, energy, stress, self_energy, notes, note, trigger, date, created_at FROM ifs_mood_entries WHERE client_id = ${clientId} ORDER BY COALESCE(date, created_at) DESC LIMIT 20`),
    includeAdvisorNotes
      ? optionalQuery('ifs_session_notes', sql`SELECT session_date, themes, notes, advisor_notes, created_at FROM ifs_session_notes WHERE client_id = ${clientId} ORDER BY COALESCE(session_date, created_at) DESC LIMIT 8`)
      : Promise.resolve({ label: 'ifs_session_notes', rows: [], error: null })
  ]);

  const interactive = summarizeInteractiveData(interactiveResult.rows);
  return {
    client: { id: clientId, name: truncateText(clientResult.rows[0]?.name, 120), role: clientResult.rows[0]?.user_role || 'client' },
    advisor_input: truncateText(advisorInput, 900),
    module_responses: interactive.module_responses,
    curriculum_reflections: interactive.curriculum_reflections,
    life_integration_reflections: capArray(lifeResult.rows, 12, (row) => ({ type: row.reflection_type || row.practice_type, prompt: truncateText(row.prompt, 160), response: truncateText(row.response || row.reflection || row.notes, 360), created_at: row.created_at })),
    journal_entries: capArray(journalResult.rows, 10, (row) => ({ title: truncateText(row.title, 140), excerpt: truncateText(row.content, 420), created_at: row.created_at })),
    assigned_practices: capArray(homeworkResult.rows, 15, summarizeHomework),
    parts: capArray(partsResult.rows, 20, (row) => ({ name: truncateText(row.name || row.part_name, 120), type: row.type || row.part_type, role: truncateText(row.role, 180), emotion: truncateText(row.emotion || row.primary_emotion, 120), notes: truncateText(row.notes, 220) })),
    part_relationships: capArray(relationshipsResult.rows, 15, (row) => ({ type: row.relationship_type || row.type, description: truncateText(row.description || row.notes, 240) })),
    assessment_results: capArray(assessmentResult.rows, 8, (row) => ({ primary_wound: row.primary_wound, secondary_wound: row.secondary_wound, tertiary_wounds: Array.isArray(row.tertiary_wounds) ? row.tertiary_wounds.slice(0, 4) : [], summary: truncateText(row.summary || row.results, 420), assessment_date: row.assessment_date || row.created_at })),
    interactive_assessments: interactive.interactive_assessments,
    mood_trigger_entries: capArray(moodResult.rows, 12, (row) => ({ mood: row.mood || row.mood_label, energy: row.energy, stress: row.stress, self_energy: row.self_energy, note: truncateText(row.notes || row.note || row.trigger, 240), created_at: row.created_at || row.date })),
    advisor_session_notes: includeAdvisorNotes ? capArray(notesResult.rows, 6, (row) => ({ session_date: row.session_date || row.created_at, themes: truncateText(row.themes, 260), note_excerpt: truncateText(row.advisor_notes || row.notes, 420) })) : [],
    data_sources: {
      ifs_interactive_data: interactiveResult.rows.length,
      ifs_life_integration_reflections: lifeResult.rows.length,
      ifs_journal_entries: journalResult.rows.length,
      ifs_assigned_homework: homeworkResult.rows.length,
      ifs_parts: partsResult.rows.length,
      ifs_part_relationships: relationshipsResult.rows.length,
      ifs_assessment_results: assessmentResult.rows.length,
      ifs_mood_entries: moodResult.rows.length,
      advisor_session_notes: includeAdvisorNotes ? notesResult.rows.length : 0,
      unavailable: [clientResult, interactiveResult, lifeResult, journalResult, homeworkResult, partsResult, relationshipsResult, assessmentResult, moodResult, notesResult].filter((r) => r.error).map((r) => r.label)
    }
  };
}
