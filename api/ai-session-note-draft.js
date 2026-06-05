import { requireTherapist, requireTherapistAssignment, sql } from './_auth.js';
import { callOpenRouterChat } from './_aiProvider.js';

const DISCLAIMER = 'AI-generated draft for Advisor review. Verify, edit, and use professional judgment before saving.';
const ADVISOR_ASSIGNMENT_ROLES = new Set(['advisor', 'therapist']);
const ADVISOR_ACCESS_ROLES = new Set(['advisor', 'therapist', 'admin', 'supervisor']);
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function sendError(res, status, message, code = 'server_error') {
  return res.status(status).json({ error: { code, message } });
}

function truncateText(value, maxLength = 600) {
  if (value === null || value === undefined) return null;
  const text = String(value).replace(/\s+/g, ' ').trim();
  if (!text) return null;
  return text.length > maxLength ? `${text.slice(0, maxLength)}…` : text;
}

function compactJson(value, maxLength = 350) {
  if (value === null || value === undefined) return null;
  const serialized = typeof value === 'string' ? value : JSON.stringify(value);
  return truncateText(serialized, maxLength);
}

function normalizeLegacyAdvisorBullets(value = {}) {
  if (typeof value === 'string') return truncateText(value, 4000);
  if (!value || typeof value !== 'object') return null;

  const labels = {
    sessionFocus: 'Session focus',
    partsDiscussed: 'Parts discussed',
    interventionsUsed: 'Interventions / practices used',
    clientResponse: 'Client response',
    homePracticeAssigned: 'Assigned IFS practice / between-session practice',
    planNextSteps: 'Plan / next steps',
    riskSafetyNotes: 'Risk/safety notes, if explicitly observed'
  };

  const lines = Object.entries(labels)
    .map(([key, label]) => {
      const text = truncateText(value[key], 900);
      return text ? `${label}: ${text}` : null;
    })
    .filter(Boolean);

  return truncateText(lines.join('\n'), 4000);
}

function normalizeRequestBody(body = {}) {
  const legacyIncludes = body[`include${'Data'}`] || {};
  return {
    clientId: body.clientId || body.client_id || '',
    sessionDate: body.sessionDate || body.session_date || new Date().toISOString().slice(0, 10),
    advisorBullets: normalizeLegacyAdvisorBullets(body.advisorBullets),
    includeAgenda: body.includeAgenda ?? legacyIncludes.preSessionCheckIn ?? true,
    includeAssignedPractices: body.includeAssignedPractices ?? legacyIncludes.assignedPractices ?? true,
    includeGrowthGoals: body.includeGrowthGoals ?? legacyIncludes.growthGoals ?? true,
    includeSharedLifeReflections: body.includeSharedLifeReflections ?? legacyIncludes.sharedLifeReflections ?? true,
    includeParts: body.includeParts ?? legacyIncludes.partsSummary ?? true,
    includeRecentMood: body.includeRecentMood ?? legacyIncludes.recentMood ?? true
  };
}

function normalizeAgenda(agenda) {
  if (!agenda) return null;
  return {
    status: agenda.status,
    session_date: agenda.session_date,
    created_at: agenda.created_at,
    topics: truncateText(agenda.topics, 500),
    active_parts: Array.isArray(agenda.active_parts) ? agenda.active_parts.slice(0, 10) : [],
    stuck_points: truncateText(agenda.stuck_points, 500),
    goals_for_session: truncateText(agenda.goals_for_session, 500),
    current_stress_level: agenda.current_stress_level,
    current_mood_label: truncateText(agenda.current_mood_label, 120),
    safety_concerns: truncateText(agenda.safety_concerns, 350)
  };
}

function normalizeAssignedPractice(homework) {
  return {
    title: truncateText(homework.title || homework.module_id, 180),
    module_id: truncateText(homework.module_id, 120),
    status: homework.status,
    assigned_at: homework.assigned_at,
    completed_at: homework.completed_at,
    reviewed_at: homework.reviewed_at,
    advisor_feedback: truncateText(homework.therapist_feedback, 300)
  };
}

function normalizeGrowthGoal(goal) {
  return {
    id: goal.id,
    goal_title: truncateText(goal.goal_title, 220),
    goal_description: truncateText(goal.goal_description, 350),
    status: goal.status,
    objectives: compactJson(goal.objectives, 450),
    interventions: compactJson(goal.interventions, 450),
    target_parts: compactJson(goal.target_parts, 260),
    target_wounds: compactJson(goal.target_wounds, 260),
    review_date: goal.review_date,
    completed_at: goal.completed_at,
    updated_at: goal.updated_at
  };
}

function normalizeSharedLifeReflection(reflection) {
  return {
    id: reflection.id,
    reflection_type: reflection.reflection_type,
    created_at: reflection.created_at,
    part_noticed: truncateText(reflection.part_noticed, 180),
    body_sensation: truncateText(reflection.body_sensation, 180),
    emotion: truncateText(reflection.emotion, 180),
    need_or_message: truncateText(reflection.need_or_message, 350),
    self_energy_response: truncateText(reflection.self_energy_response, 350),
    next_step: truncateText(reflection.next_step, 300)
  };
}

function normalizePart(part) {
  return {
    id: part.id,
    name: truncateText(part.name || part.part_name || 'Unnamed part', 160),
    role: truncateText(part.role || part.type || part.part_type, 180),
    status: part.unburdening_status || (part.is_active === false ? 'inactive' : 'active'),
    burdens: compactJson(part.burdens, 260),
    updated_at: part.updated_at
  };
}

function normalizeMood(entry) {
  return {
    mood: entry.mood,
    energy: entry.energy,
    emotions: compactJson(entry.emotions, 240),
    notes: truncateText(entry.notes, 300),
    date: entry.date,
    created_at: entry.created_at
  };
}

async function loadSessionNoteContext(clientId, sessionDate, includeFlags) {
  const date = sessionDate || new Date().toISOString().slice(0, 10);
  const [agendas, assignedPractices, growthGoals, sharedLifeReflections, parts, recentMood] = await Promise.all([
    includeFlags.includeAgenda ? sql`
      SELECT status, topics, active_parts, stuck_points, goals_for_session,
             current_stress_level, current_mood_label, safety_concerns,
             session_date, created_at
      FROM ifs_session_agendas
      WHERE client_id = ${clientId}
        AND status IN ('submitted', 'reviewed')
      ORDER BY ABS(${date}::date - COALESCE(session_date, created_at::date)), created_at DESC
      LIMIT 1
    ` : Promise.resolve([]),

    includeFlags.includeAssignedPractices ? sql`
      SELECT module_id, title, status, assigned_at, completed_at, reviewed_at, therapist_feedback, created_at
      FROM ifs_assigned_homework
      WHERE client_id = ${clientId}
      ORDER BY COALESCE(completed_at, reviewed_at, assigned_at, created_at) DESC NULLS LAST
      LIMIT 12
    ` : Promise.resolve([]),

    includeFlags.includeGrowthGoals ? sql`
      SELECT id, goal_title, goal_description, status, objectives, interventions,
             target_parts, target_wounds, review_date, completed_at, updated_at, created_at
      FROM ifs_treatment_plans
      WHERE client_id = ${clientId}
        AND status IN ('active', 'completed')
      ORDER BY CASE WHEN status = 'active' THEN 0 ELSE 1 END,
               COALESCE(completed_at, review_date::timestamptz, updated_at, created_at) DESC NULLS LAST
      LIMIT 10
    ` : Promise.resolve([]),

    includeFlags.includeSharedLifeReflections ? sql`
      SELECT id, reflection_type, part_noticed, body_sensation, emotion,
             need_or_message, self_energy_response, next_step, created_at
      FROM ifs_life_integration_reflections
      WHERE client_id = ${clientId}
        AND (shared_with_advisor IS TRUE OR is_private IS FALSE)
        AND archived_at IS NULL
      ORDER BY created_at DESC
      LIMIT 10
    ` : Promise.resolve([]),

    includeFlags.includeParts ? sql`
      SELECT id, name, part_name, type, part_type, role, burdens,
             unburdening_status, is_active, updated_at, created_at
      FROM ifs_parts
      WHERE client_id = ${clientId}
      ORDER BY updated_at DESC NULLS LAST, created_at DESC NULLS LAST
      LIMIT 20
    ` : Promise.resolve([]),

    includeFlags.includeRecentMood ? sql`
      SELECT mood, energy, emotions, notes, date, created_at
      FROM ifs_mood_entries
      WHERE client_id = ${clientId}
        AND COALESCE(date, created_at) >= (${date}::date - INTERVAL '30 days')
      ORDER BY COALESCE(date, created_at) DESC
      LIMIT 10
    ` : Promise.resolve([])
  ]);

  return {
    latestPreSessionAgenda: normalizeAgenda(agendas[0]),
    assignedPractices: assignedPractices.map(normalizeAssignedPractice),
    growthGoals: growthGoals.map(normalizeGrowthGoal),
    sharedLifeReflections: sharedLifeReflections.map(normalizeSharedLifeReflection),
    partsSummary: parts.map(normalizePart),
    recentMood: recentMood.map(normalizeMood)
  };
}

function buildMessages({ client, currentUser, normalized, context }) {
  return [
    {
      role: 'system',
      content: [
        'You draft Advisor-only IFS session note drafts from scoped app context and Advisor-entered bullets.',
        'This is not a finalized note and must not be written as finalized documentation.',
        'Use only the provided information. Do not invent facts, client statements, interventions, outcomes, diagnoses, treatment decisions, or risk findings.',
        'Do not diagnose. Do not infer risk. Do not declare the client safe or low risk.',
        'Distinguish Advisor-entered bullets from client-submitted material such as pre-session check-ins, shared Life Integration reflections, and mood entries.',
        'If data is missing or unavailable, state that it was not available.',
        `Include this exact disclaimer: ${DISCLAIMER}`,
        'Use IFS-consistent language for parts, Self-energy, unblending, protectors, exiles, burdens, and inner system themes.'
      ].join(' ')
    },
    {
      role: 'user',
      content: JSON.stringify({
        task: 'Create an AI-assisted Advisor Session Note draft for Advisor review only. Do not save or finalize it.',
        required_disclaimer: DISCLAIMER,
        required_sections: [
          '1. Session Focus',
          '2. Parts / Inner System Themes',
          '3. Advisor Observations',
          '4. Client-Reported Themes',
          '5. Practices / Between-Session Work',
          '6. Growth Goals Addressed',
          '7. Life Integration Themes, shared only',
          '8. Plan / Next Steps',
          '9. Documentation Gaps to Verify'
        ],
        client_context: {
          client_id: client.id,
          client_name: client.name || null,
          session_date: normalized.sessionDate,
          generated_for_user_role: currentUser.user_role
        },
        advisor_entered_bullets: normalized.advisorBullets || 'Advisor bullets were not provided.',
        included_context_flags: {
          includeAgenda: normalized.includeAgenda,
          includeAssignedPractices: normalized.includeAssignedPractices,
          includeGrowthGoals: normalized.includeGrowthGoals,
          includeSharedLifeReflections: normalized.includeSharedLifeReflections,
          includeParts: normalized.includeParts,
          includeRecentMood: normalized.includeRecentMood
        },
        scoped_authorized_context: context,
        output_instructions: [
          'Place the exact required disclaimer at the top.',
          'Use concise professional note-draft language with IFS framing.',
          'Label Advisor-entered observations separately from client-submitted context.',
          'For shared Life Integration content, only summarize the shared reflections in the provided sharedLifeReflections array.',
          'Do not add diagnosis, risk score, safety clearance, billing, EHR, telehealth, or final-note language.'
        ]
      }, null, 2)
    }
  ];
}

async function callAdvisorNoteAI(messages) {
  const result = await callOpenRouterChat({
    messages,
    temperature: 0.15,
    maxTokens: 1400
  });
  return result.text;
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return sendError(res, 405, 'Method not allowed', 'method_not_allowed');

  try {
    const normalized = normalizeRequestBody(req.body || {});
    if (!normalized.clientId) return sendError(res, 400, 'clientId is required', 'missing_client_id');
    if (!UUID_PATTERN.test(String(normalized.clientId))) return sendError(res, 400, 'clientId must be an internal client UUID', 'invalid_client_id');

    const currentUser = await requireTherapist(req);
    if (!ADVISOR_ACCESS_ROLES.has(currentUser.user_role)) {
      return sendError(res, 403, 'Advisor access required', 'forbidden');
    }

    if (ADVISOR_ASSIGNMENT_ROLES.has(currentUser.user_role)) {
      await requireTherapistAssignment(currentUser.id, normalized.clientId);
    }

    const clientRows = await sql`
      SELECT id, name, user_role
      FROM ifs_clients
      WHERE id = ${normalized.clientId}
      LIMIT 1
    `;
    const client = clientRows[0];
    if (!client || client.user_role !== 'client') return sendError(res, 404, 'Client not found', 'client_not_found');

    const context = await loadSessionNoteContext(client.id, normalized.sessionDate, normalized);
    const messages = buildMessages({ client, currentUser, normalized, context });
    const draft = await callAdvisorNoteAI(messages);

    return res.status(200).json({
      data: {
        draft,
        disclaimer: DISCLAIMER,
        sessionDate: normalized.sessionDate,
        generatedAt: new Date().toISOString(),
        dataSources: {
          latestPreSessionAgenda: Boolean(context.latestPreSessionAgenda),
          assignedPractices: context.assignedPractices.length,
          growthGoals: context.growthGoals.length,
          sharedLifeReflections: context.sharedLifeReflections.length,
          partsSummary: context.partsSummary.length,
          recentMood: context.recentMood.length
        }
      }
    });
  } catch (error) {
    const status = error.statusCode || 500;
    const code = error.code || (status === 401 ? 'unauthorized' : status === 403 ? 'forbidden' : 'server_error');
    return sendError(res, status, error.message || 'Unable to generate Advisor note draft.', code);
  }
}
