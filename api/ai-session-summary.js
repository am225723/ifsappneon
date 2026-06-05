import { isAdminUser, requireTherapist, requireTherapistAssignment, sql } from './_auth.js';
import { callOpenRouterChat } from './_aiProvider.js';

const DEFAULT_RANGE_DAYS = 7;
const MAX_RANGE_DAYS = 30;
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
    data.assignedHomework.length ||
    data.progressSummary.length
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
        'You create concise Advisor-facing IFS session preparation summaries from scoped app data.',
        'Do not diagnose, do not generate clinical notes, and do not score or infer risk beyond the supplied data.',
        'Do not say the client is safe. Do not say low risk unless explicit Advisor-reviewed risk data is supplied.',
        'Clearly distinguish client-submitted language from cautious AI interpretation.',
        'If information is missing, say so. Avoid invented details.',
        'If available data is limited, include the exact phrase: Available data is limited for this range.',
        'For sparse data, still provide session-opening questions and what the Advisor may want to clarify.',
        'Use the exact label session-opening questions in the suggested opener section so sparse summaries remain easy to verify.',
        'Use concise bullets under exactly the requested numbered section headings.'
      ].join(' ')
    },
    {
      role: 'user',
      content: JSON.stringify({
        task: 'Generate an on-demand AI Session Prep Summary for Advisor review only.',
        required_disclaimer: DISCLAIMER,
        sparse_data_instruction: hasAnyClinicalData(clinicalData) ? null : 'Available data is limited for this range. Summarize what is available, list missing areas, suggest session-opening questions, and suggest what the Advisor may want to clarify.',
        required_sections: [
          '1. Quick Clinical Snapshot',
          '2. What the Client Wants to Focus On',
          '3. Active Parts / Internal System Themes',
          '4. Mood, Stress, and Pattern Shifts',
          '5. Assigned IFS Practice / Between-Session Follow-Through',
          '6. Safety-Related Content',
          '7. Suggested Session Openers / session-opening questions',
          '8. Documentation Considerations'
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
    maxTokens: 1200
  });
  return result.text;
}

async function loadClinicalData(clientId, since) {
  const [agendas, moods, journals, parts, homework, progress] = await Promise.all([
    sql`
      SELECT status, topics, active_parts, stuck_points, goals_for_session,
             current_stress_level, current_mood_label, safety_concerns,
             session_date, created_at
      FROM ifs_session_agendas
      WHERE client_id = ${clientId}
        AND status IN ('submitted', 'reviewed')
      ORDER BY created_at DESC
      LIMIT 1
    `,
    sql`
      SELECT mood, NULL::integer AS stress, energy, notes AS note, date, created_at
      FROM ifs_mood_entries
      WHERE client_id = ${clientId}
        AND COALESCE(date, created_at) >= ${since}
      ORDER BY COALESCE(date, created_at) DESC
      LIMIT 20
    `,
    sql`
      SELECT title, content, created_at
      FROM ifs_journal_entries
      WHERE client_id = ${clientId}
        AND created_at >= ${since}
      ORDER BY created_at DESC
      LIMIT 10
    `,
    sql`
      SELECT name, part_name, type, part_type, role, burdens, unburdening_status, is_active, updated_at
      FROM ifs_parts
      WHERE client_id = ${clientId}
      ORDER BY updated_at DESC NULLS LAST, created_at DESC NULLS LAST
      LIMIT 20
    `,
    sql`
      SELECT module_id, title, status, assigned_at, completed_at, reviewed_at, therapist_feedback
      FROM ifs_assigned_homework
      WHERE client_id = ${clientId}
      ORDER BY assigned_at DESC NULLS LAST, created_at DESC NULLS LAST
      LIMIT 15
    `,
    sql`
      SELECT module_id, activity_id, completed, is_completed, current_step, total_steps, insights, last_accessed, updated_at
      FROM ifs_client_progress
      WHERE client_id = ${clientId}
      ORDER BY COALESCE(last_accessed, updated_at, created_at) DESC
      LIMIT 10
    `
  ]);

  return {
    latestAgenda: normalizeAgenda(agendas[0]),
    moodEntries: moods.map(normalizeMood),
    journalEntries: journals.map(normalizeJournal),
    parts: parts.map(normalizePart),
    assignedHomework: homework.map(normalizeHomework),
    progressSummary: progress.map(normalizeProgress)
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
