import { sql } from './_auth.js';
import { cleanModuleResponses } from './_moduleResponseCleaning.js';
import { ALLOWED_ACTION_ROUTES } from './_unifiedGuidanceValidation.js';

function truncateText(value, max = 500) {
  if (value === null || value === undefined) return null;
  const text = typeof value === 'string' ? value : JSON.stringify(value);
  const compact = text.replace(/\s+/g, ' ').trim();
  if (!compact) return null;
  return compact.length > max ? `${compact.slice(0, max)}…` : compact;
}

function parseJson(value) {
  if (!value) return {};
  if (typeof value === 'object') return value;
  try { return JSON.parse(value); } catch { return {}; }
}

async function optionalQuery(label, queryPromise, fallback = []) {
  try {
    return { label, rows: await queryPromise, error: null };
  } catch (error) {
    return { label, rows: fallback, error: error?.message || 'unavailable' };
  }
}

function normalizeInteractiveRows(rows = []) {
  const grouped = {};
  const curriculumReflections = [];
  const assessmentSummaries = [];
  rows.forEach((row) => {
    const moduleId = row.module_id || 'unknown';
    const data = parseJson(row.data);
    if (String(moduleId).includes('curriculum-reflection') || data.moduleTitle || data.reflection) {
      curriculumReflections.push({
        module_id: moduleId,
        module_title: truncateText(data.moduleTitle || data.title, 120),
        reflection_excerpt: truncateText(data.reflection || data.response || data.notes, 280),
        updated_at: row.updated_at || row.created_at
      });
    }
    if (String(moduleId).includes('assessment') || data.primary_wound || data.results) {
      assessmentSummaries.push({ module_id: moduleId, summary: truncateText(data.summary || data.primary_wound || data.results || data, 350) });
    }
    const answers = data.answers || data.responses || data.reflections || data;
    if (!grouped[moduleId]) grouped[moduleId] = [];
    grouped[moduleId].push({ step_id: row.step_id || 'module', answers });
  });
  return {
    cleaned_module_responses: cleanModuleResponses(grouped),
    curriculum_reflections: curriculumReflections.slice(0, 10),
    interactive_assessments: assessmentSummaries.slice(0, 10)
  };
}

function summarizeProgress(rows = []) {
  const total = rows.length;
  const completed = rows.filter((row) => row.completed || row.is_completed).length;
  const active = rows.find((row) => !(row.completed || row.is_completed)) || rows[0] || null;
  return {
    total_modules_seen: total,
    completed_modules: completed,
    percent_complete: total ? Math.round((completed / total) * 100) : 0,
    active_module: active?.module_id || null,
    recent: rows.slice(0, 12).map((row) => ({
      module_id: row.module_id,
      completed: Boolean(row.completed || row.is_completed),
      current_step: row.current_step,
      updated_at: row.updated_at
    }))
  };
}

function normalizeParts(rows = []) {
  return rows.slice(0, 20).map((part) => ({
    id: part.id,
    name: truncateText(part.part_name || part.name || 'Unnamed part', 120),
    type: truncateText(part.part_type || part.type || part.role, 120),
    role: truncateText(part.role || part.description || part.notes, 240),
    emotion: truncateText(part.emotion || part.primary_emotion, 120),
    updated_at: part.updated_at || part.created_at
  }));
}

function normalizeRelationships(rows = []) {
  return rows.slice(0, 30).map((rel) => ({
    source_part_id: rel.source_part_id || rel.part_a_id,
    target_part_id: rel.target_part_id || rel.part_b_id,
    relationship_type: truncateText(rel.relationship_type || rel.type, 140),
    description: truncateText(rel.description || rel.notes, 240)
  }));
}

function normalizeLifeRows(rows = []) {
  return rows.slice(0, 10).map((row) => ({
    type: truncateText(row.reflection_type || row.type || row.practice_type, 120),
    prompt: truncateText(row.prompt || row.title, 160),
    response_excerpt: truncateText(row.response || row.reflection || row.notes || row.data, 300),
    created_at: row.created_at
  }));
}

function normalizeAssessmentRows(rows = []) {
  return rows.slice(0, 8).map((row) => ({
    primary_wound: truncateText(row.primary_wound, 120),
    secondary_wound: truncateText(row.secondary_wound, 120),
    tertiary_wounds: Array.isArray(row.tertiary_wounds) ? row.tertiary_wounds.slice(0, 3) : [],
    assessment_date: row.assessment_date || row.created_at,
    summary: truncateText(row.summary || row.results || row, 360)
  }));
}

function normalizeAssigned(rows = []) {
  return rows.slice(0, 10).map((row) => ({
    title: truncateText(row.title || row.module_id || row.category, 160),
    status: truncateText(row.status, 80),
    assigned_at: row.assigned_at || row.created_at,
    completed_at: row.completed_at,
    advisor_feedback_available: Boolean(row.therapist_feedback || row.advisor_feedback)
  }));
}

function normalizeMood(rows = []) {
  return rows.slice(0, 20).map((row) => ({
    mood: truncateText(row.mood || row.mood_label, 100),
    energy: row.energy ?? row.energy_level ?? null,
    stress: row.stress ?? row.stress_level ?? null,
    self_energy: row.self_energy ?? row.self_energy_level ?? null,
    note_excerpt: truncateText(row.note || row.notes || row.trigger, 220),
    created_at: row.created_at || row.date
  }));
}

function capPayload(payload, max = 14000) {
  const serialized = JSON.stringify(payload);
  if (serialized.length <= max) return payload;
  return { ...payload, compacted: true, cleaned_module_responses: {}, notes: ['Payload was compacted server-side to control prompt size.'] };
}

export async function buildUnifiedGuidanceData({ clientId, mode, rangeDays = 30 }) {
  const since = new Date(Date.now() - rangeDays * 86400000).toISOString();
  const [clientResult, progressResult, interactiveResult, lifeResult, partsResult, relationshipsResult, assignedResult, moodResult, assessmentResult] = await Promise.all([
    optionalQuery('ifs_clients', sql`SELECT id, name, user_role, created_at FROM ifs_clients WHERE id = ${clientId} LIMIT 1`),
    optionalQuery('ifs_client_progress', sql`SELECT * FROM ifs_client_progress WHERE client_id = ${clientId} ORDER BY COALESCE(updated_at, created_at) DESC LIMIT 80`),
    optionalQuery('ifs_interactive_data', sql`SELECT * FROM ifs_interactive_data WHERE client_id = ${clientId} ORDER BY COALESCE(updated_at, created_at) DESC LIMIT 120`),
    optionalQuery('ifs_life_integration_reflections', sql`SELECT * FROM ifs_life_integration_reflections WHERE client_id = ${clientId} AND created_at >= ${since} ORDER BY created_at DESC LIMIT 10`),
    optionalQuery('ifs_parts', sql`SELECT * FROM ifs_parts WHERE client_id = ${clientId} ORDER BY COALESCE(updated_at, created_at) DESC LIMIT 20`),
    optionalQuery('ifs_part_relationships', sql`SELECT * FROM ifs_part_relationships WHERE client_id = ${clientId} ORDER BY COALESCE(updated_at, created_at) DESC LIMIT 30`),
    optionalQuery('ifs_assigned_homework', sql`SELECT * FROM ifs_assigned_homework WHERE client_id = ${clientId} ORDER BY COALESCE(assigned_at, created_at) DESC LIMIT 10`),
    optionalQuery('ifs_mood_entries', sql`SELECT * FROM ifs_mood_entries WHERE client_id = ${clientId} AND COALESCE(created_at, date) >= ${since} ORDER BY COALESCE(created_at, date) DESC LIMIT 20`),
    optionalQuery('ifs_assessment_results', sql`SELECT * FROM ifs_assessment_results WHERE client_id = ${clientId} ORDER BY COALESCE(assessment_date, created_at) DESC LIMIT 8`)
  ]);

  const interactive = normalizeInteractiveRows(interactiveResult.rows);
  const payload = {
    client_context: {
      client_id: clientId,
      mode,
      range_days: rangeDays,
      client_role: clientResult.rows?.[0]?.user_role || 'client',
      allowed_action_routes: [...ALLOWED_ACTION_ROUTES, '/curriculum/module/:moduleId']
    },
    curriculum_state: summarizeProgress(progressResult.rows),
    cleaned_module_responses: interactive.cleaned_module_responses,
    curriculum_reflections: interactive.curriculum_reflections,
    interactive_assessments: interactive.interactive_assessments,
    life_integration_reflections: normalizeLifeRows(lifeResult.rows),
    parts_summary: normalizeParts(partsResult.rows),
    part_relationships_summary: normalizeRelationships(relationshipsResult.rows),
    assigned_practice_status: normalizeAssigned(assignedResult.rows),
    recent_mood_or_trigger_entries: normalizeMood(moodResult.rows),
    assessment_patterns: normalizeAssessmentRows(assessmentResult.rows),
    data_sources: {
      ifs_client_progress: progressResult.rows.length,
      ifs_interactive_data: interactiveResult.rows.length,
      ifs_life_integration_reflections: lifeResult.rows.length,
      ifs_parts: partsResult.rows.length,
      ifs_part_relationships: relationshipsResult.rows.length,
      ifs_assigned_homework: assignedResult.rows.length,
      ifs_mood_entries: moodResult.rows.length,
      ifs_assessment_results: assessmentResult.rows.length,
      unavailable: [clientResult, progressResult, interactiveResult, lifeResult, partsResult, relationshipsResult, assignedResult, moodResult, assessmentResult]
        .filter((result) => result.error)
        .map((result) => result.label)
    }
  };
  return capPayload(payload);
}
