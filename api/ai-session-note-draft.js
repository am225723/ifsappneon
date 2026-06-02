/* global process */
import { requireTherapist, requireTherapistAssignment, sql } from './_auth.js';

const OPENAI_CHAT_COMPLETIONS_URL = 'https://api.openai.com/v1/chat/completions';
const DISCLAIMER = 'AI-assisted draft for Advisor review. Edit, verify, and finalize before using as documentation.';
const SUPPORTED_NOTE_FORMATS = new Set(['DARP', 'SOAP', 'IFS_Process_Note', 'Advisor_Reflection']);
const ASSIGNMENT_REQUIRED_ROLES = new Set(['therapist', 'advisor']);

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

function normalizeBooleanMap(includeData = {}) {
  return {
    preSessionCheckIn: includeData.preSessionCheckIn !== false,
    assignedPractices: includeData.assignedPractices !== false,
    growthGoals: includeData.growthGoals !== false,
    partsSummary: includeData.partsSummary !== false,
    liveGuidedPractice: includeData.liveGuidedPractice !== false,
    recentJournalMetadata: includeData.recentJournalMetadata === true,
    aiSessionPrepSummary: includeData.aiSessionPrepSummary === true
  };
}

function normalizeAdvisorBullets(advisorBullets = {}) {
  return {
    sessionFocus: truncateText(advisorBullets.sessionFocus, 1200),
    partsDiscussed: truncateText(advisorBullets.partsDiscussed, 1200),
    interventionsUsed: truncateText(advisorBullets.interventionsUsed, 1200),
    clientResponse: truncateText(advisorBullets.clientResponse, 1200),
    homePracticeAssigned: truncateText(advisorBullets.homePracticeAssigned, 1200),
    planNextSteps: truncateText(advisorBullets.planNextSteps, 1200),
    riskSafetyNotes: truncateText(advisorBullets.riskSafetyNotes, 1200)
  };
}

function normalizeAgenda(agenda) {
  if (!agenda) return null;
  return {
    status: agenda.status,
    session_date: agenda.session_date,
    created_at: agenda.created_at,
    topics: truncateText(agenda.topics),
    active_parts: Array.isArray(agenda.active_parts) ? agenda.active_parts.slice(0, 10) : [],
    stuck_points: truncateText(agenda.stuck_points),
    goals_for_session: truncateText(agenda.goals_for_session),
    current_stress_level: agenda.current_stress_level,
    current_mood_label: agenda.current_mood_label,
    safety_concerns: truncateText(agenda.safety_concerns, 400),
    advisor_review_notes: truncateText(agenda.therapist_notes, 400)
  };
}

function normalizePractice(homework) {
  return {
    title: truncateText(homework.title || homework.module_id, 180),
    module_id: homework.module_id,
    status: homework.status,
    assigned_at: homework.assigned_at,
    completed_at: homework.completed_at,
    reviewed_at: homework.reviewed_at,
    advisor_feedback: truncateText(homework.therapist_feedback, 350)
  };
}

function normalizeGoal(goal) {
  return {
    id: goal.id,
    goal_title: truncateText(goal.goal_title, 220),
    status: goal.status,
    objectives: compactJson(goal.objectives, 450),
    interventions: compactJson(goal.interventions, 450),
    target_parts: compactJson(goal.target_parts, 260),
    target_wounds: compactJson(goal.target_wounds, 260),
    review_date: goal.review_date,
    updated_at: goal.updated_at
  };
}

function normalizePart(part) {
  return {
    id: part.id,
    name: part.name || part.part_name || 'Unnamed part',
    role: truncateText(part.role || part.type || part.part_type, 180),
    status: part.status || part.unburdening_status || (part.is_active === false ? 'inactive' : 'active'),
    burdens: compactJson(part.burdens || part.burden, 260),
    updated_at: part.updated_at
  };
}

function normalizeLiveSession(session) {
  return {
    id: session.id,
    status: session.status,
    current_activity: session.current_activity,
    activity_title: truncateText(session.activity_state?.activity_title || session.activity_state?.title || session.current_activity, 180),
    started_at: session.started_at,
    ended_at: session.ended_at,
    updated_at: session.updated_at,
    events: (session.events || []).slice(0, 20).map((event) => ({
      event_type: event.event_type,
      created_at: event.created_at,
      summary: summarizeLiveEvent(event)
    }))
  };
}

function summarizeLiveEvent(event) {
  const payload = event.event_payload || {};
  if (event.event_type === 'prompt_sent') return truncateText(payload.prompt_type || payload.title || 'Advisor prompt sent', 120);
  if (event.event_type === 'activity_started') return truncateText(payload.activity_title || payload.activity_id || 'guided activity started', 120);
  if (event.event_type === 'activity_ended') return truncateText(payload.activity_title || payload.activity_id || 'guided activity completed', 120);
  return event.event_type;
}

function normalizeJournalMetadata(entry) {
  return {
    title: truncateText(entry.title, 140),
    created_at: entry.created_at
  };
}

function normalizeAiPrepSummary(report) {
  if (!report) return null;
  return {
    label: 'Existing AI-generated session prep context metadata only; not chart truth.',
    title: truncateText(report.title, 180),
    report_type: report.report_type,
    generated_at: report.generated_at || report.created_at
  };
}

async function loadSessionNoteContext(clientId, sessionDate, includeData) {
  const date = sessionDate || new Date().toISOString().slice(0, 10);
  const queries = [];

  queries.push(includeData.preSessionCheckIn ? sql`
    SELECT status, topics, active_parts, stuck_points, goals_for_session,
           current_stress_level, current_mood_label, safety_concerns,
           therapist_notes, session_date, created_at
    FROM ifs_session_agendas
    WHERE client_id = ${clientId}
      AND status IN ('submitted', 'reviewed')
    ORDER BY ABS(${date}::date - COALESCE(session_date, created_at::date)), created_at DESC
    LIMIT 1
  ` : Promise.resolve([]));

  queries.push(includeData.assignedPractices ? sql`
    SELECT module_id, title, status, assigned_at, completed_at, reviewed_at, therapist_feedback, created_at
    FROM ifs_assigned_homework
    WHERE client_id = ${clientId}
    ORDER BY COALESCE(completed_at, reviewed_at, assigned_at, created_at) DESC NULLS LAST
    LIMIT 12
  ` : Promise.resolve([]));

  queries.push(includeData.growthGoals ? sql`
    SELECT id, goal_title, status, objectives, interventions, target_parts, target_wounds, review_date, updated_at, created_at
    FROM ifs_treatment_plans
    WHERE client_id = ${clientId}
      AND (status = 'active' OR COALESCE(updated_at, created_at) >= (${date}::date - INTERVAL '60 days'))
    ORDER BY CASE WHEN status = 'active' THEN 0 ELSE 1 END, COALESCE(review_date, updated_at::date, created_at::date) DESC NULLS LAST
    LIMIT 10
  ` : Promise.resolve([]));

  queries.push(includeData.partsSummary ? sql`
    SELECT id, name, part_name, type, part_type, role, burdens, unburdening_status, is_active, updated_at, created_at
    FROM ifs_parts
    WHERE client_id = ${clientId}
    ORDER BY updated_at DESC NULLS LAST, created_at DESC NULLS LAST
    LIMIT 20
  ` : Promise.resolve([]));

  queries.push(includeData.liveGuidedPractice ? sql`
    SELECT id, status, current_activity, activity_state, started_at, ended_at, updated_at, created_at
    FROM ifs_live_sessions
    WHERE client_id = ${clientId}
      AND COALESCE(started_at, created_at, updated_at)::date BETWEEN (${date}::date - INTERVAL '7 days') AND (${date}::date + INTERVAL '7 days')
    ORDER BY COALESCE(started_at, created_at, updated_at) DESC NULLS LAST
    LIMIT 5
  ` : Promise.resolve([]));

  queries.push(includeData.recentJournalMetadata ? sql`
    SELECT title, created_at
    FROM ifs_journal_entries
    WHERE client_id = ${clientId}
      AND created_at >= (${date}::date - INTERVAL '30 days')
    ORDER BY created_at DESC
    LIMIT 8
  ` : Promise.resolve([]));

  queries.push(includeData.aiSessionPrepSummary ? sql`
    SELECT title, report_type, generated_at, created_at
    FROM ifs_generated_reports
    WHERE client_id = ${clientId}
      AND report_type IN ('ai_session_prep_summary', 'session_prep_summary')
    ORDER BY COALESCE(generated_at, created_at) DESC NULLS LAST
    LIMIT 1
  ` : Promise.resolve([]));

  const [agendas, practices, goals, parts, liveSessions, journals, prepSummaries] = await Promise.all(queries);

  let liveSessionsWithEvents = [];
  if (includeData.liveGuidedPractice && liveSessions.length > 0) {
    const liveSessionIds = liveSessions.map((session) => session.id);
    const events = await sql`
      SELECT live_session_id, event_type, event_payload, created_at
      FROM ifs_live_session_events
      WHERE live_session_id = ANY(${liveSessionIds})
        AND event_type IN ('session_started', 'activity_started', 'activity_ended', 'prompt_sent', 'session_ended')
      ORDER BY created_at ASC
      LIMIT 80
    `;
    const eventsBySession = events.reduce((acc, event) => {
      const key = String(event.live_session_id);
      acc[key] = acc[key] || [];
      acc[key].push(event);
      return acc;
    }, {});
    liveSessionsWithEvents = liveSessions.map((session) => ({ ...session, events: eventsBySession[String(session.id)] || [] }));
  }

  return {
    preSessionCheckIn: normalizeAgenda(agendas[0]),
    assignedPractices: practices.map(normalizePractice),
    growthGoals: goals.map(normalizeGoal),
    partsSummary: parts.map(normalizePart),
    liveGuidedPractice: liveSessionsWithEvents.map(normalizeLiveSession),
    recentJournalMetadata: journals.map(normalizeJournalMetadata),
    aiSessionPrepSummary: normalizeAiPrepSummary(prepSummaries[0])
  };
}

function buildFormatSections(noteFormat) {
  if (noteFormat === 'SOAP') return ['S — Subjective', 'O — Objective', 'A — Assessment / Advisor Impression', 'P — Plan'];
  if (noteFormat === 'IFS_Process_Note') {
    return [
      'Session Focus',
      'Parts Present / Activated',
      'Self-Energy Observed or Practiced',
      'IFS Interventions / Practices Used',
      'Client Reflections / Responses',
      'Growth Goals Addressed',
      'Assigned IFS Practice Between Sessions',
      'Plan / Next Steps',
      'Advisor Review Needed'
    ];
  }
  if (noteFormat === 'Advisor_Reflection') {
    return [
      'Session Themes',
      'Parts and Protective Patterns',
      'Self-Energy / Unblending Moments',
      'Advisor Reflections',
      'Growth Goals Connected',
      'Suggested Next IFS Practice',
      'Follow-Up'
    ];
  }
  return ['D — Data', 'A — Assessment / Advisor Impression', 'R — Response', 'P — Plan'];
}

function buildMessages({ client, currentUser, sessionDate, noteFormat, advisorBullets, includeData, context }) {
  return [
    {
      role: 'system',
      content: [
        'You are assisting an Advisor in drafting an Advisor-only IFS session note.',
        'You do not know what happened in session unless the Advisor provided it.',
        'Do not invent interventions, client statements, risk findings, diagnoses, or outcomes.',
        'Use only the structured data and Advisor bullets provided.',
        'If information is missing, write "not documented" or leave a clear placeholder.',
        'Do not diagnose. Do not infer risk.',
        'Do not say "low risk," "safe," or "denies SI/HI" unless explicitly provided by the Advisor in riskSafetyNotes.',
        'Distinguish client-submitted pre-session content from Advisor-observed session content.',
        'Use IFS-consistent language for parts, Self-energy, unblending, protectors, exiles, burdens, and inner system themes.',
        'Prefer "Advisor" over "therapist" in generated note headings and product language.',
        'This is a draft for Advisor review and editing. It is not client-facing.'
      ].join(' ')
    },
    {
      role: 'user',
      content: JSON.stringify({
        task: 'Draft an Advisor Session Note for Advisor review only. Do not save or finalize it.',
        required_disclaimer: DISCLAIMER,
        note_format: noteFormat,
        required_sections: buildFormatSections(noteFormat),
        client_context: {
          client_id: client.id,
          client_name: client.name || null,
          session_date: sessionDate,
          generated_for_user_role: currentUser.user_role
        },
        advisor_entered_session_bullets: advisorBullets,
        included_context_flags: includeData,
        scoped_authorized_context: context,
        output_instructions: [
          'Put the required disclaimer at the top or bottom.',
          'Use concise professional note language while preserving IFS framing.',
          'Label client-submitted check-in material as pre-session/client-submitted when used.',
          'Only describe in-session observations, interventions, responses, and safety notes that appear in advisor_entered_session_bullets.',
          'Use "assigned IFS practice" and "Growth Goals" language.'
        ]
      }, null, 2)
    }
  ];
}

async function callOpenAI(messages) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw Object.assign(new Error('OpenAI API key missing. Configure OPENAI_API_KEY on the server.'), { statusCode: 500, code: 'openai_api_key_missing' });
  }

  const response = await fetch(OPENAI_CHAT_COMPLETIONS_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
      messages,
      temperature: 0.15
    })
  });

  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    const message = payload?.error?.message || `OpenAI request failed with status ${response.status}`;
    throw Object.assign(new Error(message), { statusCode: response.status >= 500 ? 502 : 500, code: 'openai_request_failed' });
  }

  const draft = payload?.choices?.[0]?.message?.content?.trim();
  if (!draft) throw Object.assign(new Error('OpenAI returned an empty note draft.'), { statusCode: 502, code: 'openai_empty_response' });
  return draft;
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return sendError(res, 405, 'Method not allowed', 'method_not_allowed');

  try {
    const {
      clientId,
      client_id: legacyClientId,
      sessionDate = new Date().toISOString().slice(0, 10),
      noteFormat: requestedNoteFormat = 'DARP',
      advisorBullets: requestedAdvisorBullets = {},
      includeData: requestedIncludeData = {}
    } = req.body || {};
    const requestedClientId = clientId || legacyClientId;
    if (!requestedClientId) return sendError(res, 400, 'clientId is required', 'missing_client_id');

    const currentUser = await requireTherapist(req);
    if (ASSIGNMENT_REQUIRED_ROLES.has(currentUser.user_role)) {
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

    const noteFormat = SUPPORTED_NOTE_FORMATS.has(requestedNoteFormat) ? requestedNoteFormat : 'DARP';
    const includeData = normalizeBooleanMap(requestedIncludeData);
    const advisorBullets = normalizeAdvisorBullets(requestedAdvisorBullets);
    const context = await loadSessionNoteContext(client.id, sessionDate, includeData);
    const messages = buildMessages({ client, currentUser, sessionDate, noteFormat, advisorBullets, includeData, context });
    const draft = await callOpenAI(messages);

    return res.status(200).json({
      data: {
        draft,
        disclaimer: DISCLAIMER,
        noteFormat,
        sessionDate,
        generatedAt: new Date().toISOString(),
        dataSources: {
          preSessionCheckIn: Boolean(context.preSessionCheckIn),
          assignedPractices: context.assignedPractices.length,
          growthGoals: context.growthGoals.length,
          partsSummary: context.partsSummary.length,
          liveGuidedPractice: context.liveGuidedPractice.length,
          recentJournalMetadata: context.recentJournalMetadata.length,
          aiSessionPrepSummary: Boolean(context.aiSessionPrepSummary)
        }
      }
    });
  } catch (error) {
    const status = error.statusCode || 500;
    const code = error.code || (status === 401 ? 'unauthorized' : status === 403 ? 'forbidden' : 'server_error');
    return sendError(res, status, error.message || 'Unable to generate Advisor note draft.', code);
  }
}
