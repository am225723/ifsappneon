import { isAdminUser, requireTherapist, requireTherapistAssignment, sql } from './_auth.js';
import { callOpenRouterChat } from './_aiProvider.js';

const DEFAULT_RANGE_DAYS = 14;
const MAX_RANGE_DAYS = 90;
const DISCLAIMER = 'AI-generated draft for Advisor review. Verify against the client record and use professional judgment.';

function sendError(res, status, message, code = 'server_error') {
  return res.status(status).json({ error: { code, message } });
}

function clampRangeDays(value) {
  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed) || parsed <= 0) return DEFAULT_RANGE_DAYS;
  return Math.min(parsed, MAX_RANGE_DAYS);
}

function truncateText(value, maxLength = 700) {
  if (!value) return null;
  const text = String(value).replace(/\s+/g, ' ').trim();
  if (!text) return null;
  return text.length > maxLength ? `${text.slice(0, maxLength)}…` : text;
}

function compactJson(value, maxLength = 500) {
  if (value === null || value === undefined) return null;
  const serialized = typeof value === 'string' ? value : JSON.stringify(value);
  return truncateText(serialized, maxLength);
}

function normalizeAgenda(agenda) {
  if (!agenda) return null;
  return {
    status: agenda.status,
    session_date: agenda.session_date,
    created_at: agenda.created_at,
    topics: truncateText(agenda.topics),
    active_parts: agenda.active_parts || [],
    stuck_points: truncateText(agenda.stuck_points),
    goals_for_session: truncateText(agenda.goals_for_session),
    current_stress_level: agenda.current_stress_level,
    current_mood_label: agenda.current_mood_label,
    safety_concerns: truncateText(agenda.safety_concerns)
  };
}

function normalizeMood(entry) {
  return {
    mood: entry.mood,
    stress: entry.stress ?? null,
    energy: entry.energy,
    note: truncateText(entry.note || entry.notes, 300),
    created_at: entry.created_at || entry.date
  };
}

function normalizeJournal(entry) {
  return {
    title: truncateText(entry.title, 120),
    excerpt: truncateText(entry.content, 500),
    created_at: entry.created_at
  };
}

function normalizePart(part) {
  return {
    name: part.name || part.part_name || 'Unnamed part',
    role: truncateText(part.role || part.type || part.part_type, 180),
    burden: compactJson(part.burden || part.burdens, 240),
    status: part.status || part.unburdening_status || (part.is_active === false ? 'inactive' : 'active'),
    updated_at: part.updated_at
  };
}

function normalizeHomework(homework) {
  return {
    module_title: truncateText(homework.title || homework.module_id, 180),
    status: homework.status,
    assigned_at: homework.assigned_at,
    completed_at: homework.completed_at,
    reviewed_at: homework.reviewed_at,
    therapist_feedback: truncateText(homework.therapist_feedback, 400)
  };
}

function normalizeProgress(progress) {
  return {
    module_id: progress.module_id,
    activity_id: progress.activity_id,
    completed: progress.completed || progress.is_completed || false,
    current_step: progress.current_step,
    total_steps: progress.total_steps,
    insights: truncateText(progress.insights, 300),
    last_accessed: progress.last_accessed || progress.updated_at
  };
}

function hasAnyClinicalData(data) {
  return Boolean(
    data.latestAgenda ||
    data.moodEntries.length ||
    data.journalEntries.length ||
    data.parts.length ||
    data.partRelationships.length ||
    data.assignedHomework.length ||
    data.progressSummary.length ||
    data.moduleResponses.length ||
    data.curriculumReflections.length ||
    data.lifeIntegrationReflections.length ||
    data.assessmentResults.length ||
    data.priorSessionPrep.length ||
    data.advisorSessionNotes.length
  );
}

function buildMessages({ client, currentUser, rangeDays, since, clinicalData }) {
  const safetyText = clinicalData.latestAgenda?.safety_concerns
    ? 'Safety-related content appears in submitted check-in data. Summarize it plainly and recommend Advisor review.'
    : 'No safety-related content was submitted in the available check-in data.';

  return [
    {
      role: 'system',
      content: [
        'You create deep Advisor-facing Pre-Session AI notes from assignment-scoped IFS app data.',
        'Do not diagnose, do not generate clinical notes, and do not score or infer risk beyond the supplied data.',
        'Do not say the client is safe. Do not say low risk unless explicit Advisor-reviewed risk data is supplied.',
        'Clearly distinguish client-submitted language from cautious AI interpretation.',
        'If information is missing, say so. Avoid invented details.',
        'If available data is limited, include the exact phrase: Available data is limited for this range.',
        'For sparse data, still provide session-opening questions and what the Advisor may want to clarify.',
        'Use the exact label session-opening questions in the suggested opener section so sparse summaries remain easy to verify.',
        'Review every meaningful supplied source: module responses, curriculum reflections, journal entries, Life Integration, assigned practice responses including interactive_responses summaries, activity_blocks completion summaries if present, parts, relationships, assessments, mood/trigger entries, Advisor input, prior prep, and Advisor session notes.',
        'Include client strengths / Self-energy signals, parts/protector/exile themes, unanswered questions, and what not to over-interpret.',
        'Use concise bullets under exactly the requested numbered section headings.',
        'For plain text sections, markdown-lite formatting is allowed: **bold labels**, bullets, numbered lists, and blank lines. Do not use raw HTML or markdown tables.'
      ].join(' ')
    },
    {
      role: 'user',
      content: JSON.stringify({
        task: 'Generate an on-demand AI Session Prep Summary for Advisor review only.',
        required_disclaimer: DISCLAIMER,
        sparse_data_instruction: hasAnyClinicalData(clinicalData) ? null : 'Available data is limited for this range. Summarize what is available, list missing areas, suggest session-opening questions, and suggest what the Advisor may want to clarify.',
        required_sections: [
          '1. Current IFS path snapshot',
          '2. Most relevant client inputs since last session',
          '3. Module response themes',
          '4. Journal/reflection themes',
          '5. Parts and protector themes',
          '6. Assessment themes to keep in mind',
          '7. Assigned practice progress',
          '8. Possible session-opening questions',
          '9. Specific follow-up questions',
          '10. What not to over-interpret'
        ],
        safety_instruction: safetyText,
        client_context: {
          client_id: client.id,
          client_name: client.name || null,
          generated_for_user_role: currentUser.user_role,
          range_days: rangeDays,
          since
        },
        data: clinicalData
      }, null, 2)
    }
  ];
}

async function callSessionSummaryAI(messages) {
  const result = await callOpenRouterChat({
    messages,
    temperature: 0.2,
    maxTokens: 2600
  });
  return result.text;
}

async function optionalRows(label, promise) {
  try {
    return { label, rows: await promise, error: null };
  } catch (error) {
    if (process.env.NODE_ENV !== 'production') console.warn('[ai-session-summary] optional query failed', { label, message: error?.message });
    return { label, rows: [], error };
  }
}

function normalizeInteraction(row) {
  const data = typeof row.data === 'object' ? row.data : (() => { try { return JSON.parse(row.data || '{}'); } catch { return {}; } })();
  return {
    module_id: row.module_id,
    title: truncateText(data.moduleTitle || data.title || row.module_id, 160),
    response_excerpt: truncateText(data.reflection || data.response || data.answer || data.summary || data.primary || data.secondary || data, 500),
    updated_at: row.updated_at || row.created_at
  };
}

function normalizeLife(row) {
  return {
    type: row.reflection_type || row.practice_type || row.type,
    prompt: truncateText(row.prompt || row.title, 180),
    response_excerpt: truncateText(row.response || row.reflection || row.notes || row.data, 500),
    created_at: row.created_at
  };
}

function normalizeRelationship(row) {
  return {
    type: row.relationship_type || row.type,
    description: truncateText(row.description || row.notes, 300),
    created_at: row.created_at
  };
}

function normalizeAssessment(row) {
  return {
    primary_wound: row.primary_wound,
    secondary_wound: row.secondary_wound,
    tertiary_wounds: Array.isArray(row.tertiary_wounds) ? row.tertiary_wounds.slice(0, 4) : [],
    summary: truncateText(row.summary || row.results || row, 600),
    assessment_date: row.assessment_date || row.created_at
  };
}

async function loadClinicalData(clientId, since) {
  const [agendas, moods, journals, parts, relationships, homework, progress, interactive, life, assessments, priorPrep, advisorNotes] = await Promise.all([
    optionalRows('ifs_session_agendas', sql`
      SELECT status, topics, active_parts, stuck_points, goals_for_session,
             current_stress_level, current_mood_label, safety_concerns,
             session_date, created_at
      FROM ifs_session_agendas
      WHERE client_id = ${clientId}
        AND status IN ('submitted', 'reviewed')
      ORDER BY created_at DESC
      LIMIT 3
    `),
    optionalRows('ifs_mood_entries', sql`
      SELECT mood, NULL::integer AS stress, energy, notes AS note, date, created_at
      FROM ifs_mood_entries
      WHERE client_id = ${clientId}
        AND COALESCE(date, created_at) >= ${since}
      ORDER BY COALESCE(date, created_at) DESC
      LIMIT 30
    `),
    optionalRows('ifs_journal_entries', sql`
      SELECT title, content, created_at
      FROM ifs_journal_entries
      WHERE client_id = ${clientId}
        AND created_at >= ${since}
      ORDER BY created_at DESC
      LIMIT 20
    `),
    optionalRows('ifs_parts', sql`
      SELECT name, part_name, type, part_type, role, burdens, unburdening_status, is_active, updated_at, created_at
      FROM ifs_parts
      WHERE client_id = ${clientId}
      ORDER BY updated_at DESC NULLS LAST, created_at DESC NULLS LAST
      LIMIT 30
    `),
    optionalRows('ifs_part_relationships', sql`
      SELECT relationship_type, type, description, notes, created_at
      FROM ifs_part_relationships
      WHERE client_id = ${clientId}
      ORDER BY created_at DESC NULLS LAST
      LIMIT 30
    `),
    optionalRows('ifs_assigned_homework', sql`
      SELECT *
      FROM ifs_assigned_homework
      WHERE client_id = ${clientId}
      ORDER BY assigned_at DESC NULLS LAST, created_at DESC NULLS LAST
      LIMIT 20
    `),
    optionalRows('ifs_client_progress', sql`
      SELECT module_id, activity_id, completed, is_completed, current_step, total_steps, insights, last_accessed, updated_at
      FROM ifs_client_progress
      WHERE client_id = ${clientId}
      ORDER BY COALESCE(last_accessed, updated_at, created_at) DESC
      LIMIT 30
    `),
    optionalRows('ifs_interactive_data', sql`
      SELECT module_id, data, created_at, updated_at
      FROM ifs_interactive_data
      WHERE client_id = ${clientId}
      ORDER BY COALESCE(updated_at, created_at) DESC
      LIMIT 120
    `),
    optionalRows('ifs_life_integration_reflections', sql`
      SELECT reflection_type, practice_type, prompt, response, reflection, notes, data, created_at
      FROM ifs_life_integration_reflections
      WHERE client_id = ${clientId}
      ORDER BY created_at DESC
      LIMIT 30
    `),
    optionalRows('ifs_assessment_results', sql`
      SELECT primary_wound, secondary_wound, tertiary_wounds, summary, results, assessment_date, created_at
      FROM ifs_assessment_results
      WHERE client_id = ${clientId}
      ORDER BY COALESCE(assessment_date, created_at) DESC
      LIMIT 8
    `),
    optionalRows('ifs_session_prep_summaries', sql`
      SELECT summary, created_at
      FROM ifs_session_prep_summaries
      WHERE client_id = ${clientId}
      ORDER BY created_at DESC
      LIMIT 3
    `),
    optionalRows('ifs_session_notes', sql`
      SELECT session_date, themes, notes, advisor_notes, created_at
      FROM ifs_session_notes
      WHERE client_id = ${clientId}
      ORDER BY COALESCE(session_date, created_at) DESC
      LIMIT 8
    `)
  ]);

  const interactions = interactive.rows.map(normalizeInteraction).filter((item) => item.response_excerpt);
  return {
    latestAgenda: normalizeAgenda(agendas.rows[0]),
    recentAgendas: agendas.rows.map(normalizeAgenda).filter(Boolean),
    moodEntries: moods.rows.map(normalizeMood),
    journalEntries: journals.rows.map(normalizeJournal),
    parts: parts.rows.map(normalizePart),
    partRelationships: relationships.rows.map(normalizeRelationship),
    assignedHomework: homework.rows.map((row) => ({ ...normalizeHomework(row), completion_notes: truncateText(row.completion_notes, 500), interactive_responses_summary: compactJson(row.interactive_responses, 700), activity_blocks_summary: compactJson(row.activity_blocks || row.activityBlocks, 700) })),
    progressSummary: progress.rows.map(normalizeProgress),
    moduleResponses: interactions.filter((row) => String(row.module_id || '').startsWith('module-')).slice(0, 40),
    curriculumReflections: interactions.filter((row) => String(row.module_id || '').includes('curriculum') || row.title).slice(0, 20),
    lifeIntegrationReflections: life.rows.map(normalizeLife).filter((item) => item.response_excerpt),
    assessmentResults: assessments.rows.map(normalizeAssessment),
    interactiveAssessments: interactions.filter((row) => String(row.module_id || '').startsWith('assessment_')).slice(0, 12),
    priorSessionPrep: priorPrep.rows.map((row) => ({ summary_excerpt: truncateText(row.summary, 700), created_at: row.created_at })),
    advisorSessionNotes: advisorNotes.rows.map((row) => ({ session_date: row.session_date || row.created_at, themes: truncateText(row.themes, 280), note_excerpt: truncateText(row.advisor_notes || row.notes, 600) })),
    unavailableSources: [agendas, moods, journals, parts, relationships, homework, progress, interactive, life, assessments, priorPrep, advisorNotes].filter((r) => r.error).map((r) => r.label)
  };
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return sendError(res, 405, 'Method not allowed', 'method_not_allowed');

  try {
    const { clientId, client_id: legacyClientId, rangeDays: requestedRangeDays } = req.body || {};
    const requestedClientId = clientId || legacyClientId;
    if (!requestedClientId) return sendError(res, 400, 'clientId is required', 'missing_client_id');

    const currentUser = await requireTherapist(req);
    if (!isAdminUser(currentUser)) {
      await requireTherapistAssignment(currentUser.id, requestedClientId);
    }

    const clientRows = await sql`
      SELECT id, name, user_role
      FROM ifs_clients
      WHERE id = ${requestedClientId}
      LIMIT 1
    `;
    const client = clientRows[0];
    if (!client || client.user_role !== 'client') return sendError(res, 404, 'Client not found', 'client_not_found');

    const rangeDays = clampRangeDays(requestedRangeDays);
    const since = new Date(Date.now() - rangeDays * 86400000).toISOString();
    const clinicalData = await loadClinicalData(client.id, since);
    const messages = buildMessages({ client, currentUser, rangeDays, since, clinicalData });
    const summary = await callSessionSummaryAI(messages);

    return res.status(200).json({
      data: {
        summary,
        disclaimer: DISCLAIMER,
        generatedAt: new Date().toISOString(),
        rangeDays,
        dataSources: {
          latestAgenda: Boolean(clinicalData.latestAgenda),
          moodEntries: clinicalData.moodEntries.length,
          journalEntries: clinicalData.journalEntries.length,
          parts: clinicalData.parts.length,
          assignedHomework: clinicalData.assignedHomework.length,
          progressSummary: clinicalData.progressSummary.length,
          moduleResponses: clinicalData.moduleResponses.length,
          curriculumReflections: clinicalData.curriculumReflections.length,
          lifeIntegrationReflections: clinicalData.lifeIntegrationReflections.length,
          partRelationships: clinicalData.partRelationships.length,
          assessmentResults: clinicalData.assessmentResults.length,
          interactiveAssessments: clinicalData.interactiveAssessments.length,
          priorSessionPrep: clinicalData.priorSessionPrep.length,
          advisorSessionNotes: clinicalData.advisorSessionNotes.length,
          unavailableSources: clinicalData.unavailableSources,
          sparse: !hasAnyClinicalData(clinicalData)
        }
      },
      error: null
    });
  } catch (error) {
    const status = error.statusCode || 500;
    const code = error.code || (status === 401 ? 'unauthorized' : status === 403 ? 'forbidden' : 'server_error');
    return sendError(res, status, error.message || 'Unable to generate AI session summary.', code);
  }
}
