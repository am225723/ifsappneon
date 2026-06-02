import {
  getCurrentAppUserFromClerk,
  isAdminUser,
  isTherapistUser,
  requireTherapistAssignment,
  sql
} from './_auth.js';
import { safeCreateInAppNotification } from './_notifications.js';

const THERAPIST_ACTIONS = new Set([
  'start_session',
  'start_activity',
  'pause_activity',
  'resume_activity',
  'end_activity',
  'send_prompt',
  'next_step',
  'previous_step',
  'set_activity_step',
  'end_session',
  'set_selected_part',
  'update_map_draft',
  'suggest_part'
]);
const READ_ACTIONS = new Set(['get_state', 'get_active_for_client', 'get_map_parts']);
const CLIENT_CONFIRMATION_ACTIONS = new Set(['accept_suggestion', 'dismiss_suggestion', 'save_confirmed_map']);
const EVENT_TYPES = new Set([
  'session_started',
  'client_joined',
  'activity_started',
  'activity_paused',
  'activity_resumed',
  'activity_ended',
  'prompt_sent',
  'session_ended',
  'heartbeat'
]);
const SUPPORTED_ACTIVITIES = new Set([
  'guided_breathing',
  'grounding_54321',
  'parts_check_in',
  'self_energy_check',
  'unblending_practice',
  'protector_appreciation',
  'feelings_needs_check',
  'repair_after_conflict',
  'shared_parts_map'
]);
const STEP_COUNTS = new Map([
  ['grounding_54321', 6],
  ['parts_check_in', 6],
  ['self_energy_check', 6],
  ['unblending_practice', 6],
  ['protector_appreciation', 6],
  ['feelings_needs_check', 6],
  ['repair_after_conflict', 6]
]);
const MAX_PROMPT_LENGTH = 500;
const MAX_SUGGESTION_NAME_LENGTH = 100;
const MAX_SUGGESTION_DESCRIPTION_LENGTH = 500;
const MAP_MODES = new Set(['explore', 'protectors', 'exiles', 'relationships', 'self_energy']);
const PART_TYPES = new Set(['protector', 'manager', 'firefighter', 'exile', 'self', 'unknown', '']);

function sendError(res, status, message, code = 'live_session_error') {
  return res.status(status).json({ error: { code, message } });
}

function requireUuid(value, label) {
  if (!value || !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(String(value))) {
    throw Object.assign(new Error(`${label} must be a valid UUID`), { statusCode: 400, code: 'invalid_uuid' });
  }
  return String(value);
}

function sanitizePrompt(value) {
  const prompt = String(value || '').replace(/\s+/g, ' ').trim();
  if (!prompt) throw Object.assign(new Error('Prompt is required'), { statusCode: 400, code: 'prompt_required' });
  if (prompt.length > MAX_PROMPT_LENGTH) {
    throw Object.assign(new Error(`Prompt must be ${MAX_PROMPT_LENGTH} characters or fewer`), { statusCode: 400, code: 'prompt_too_long' });
  }
  return prompt;
}

function normalizeActivityState(activity, requestedState = {}) {
  if (!SUPPORTED_ACTIVITIES.has(activity)) {
    throw Object.assign(new Error('Unsupported live activity'), { statusCode: 400, code: 'unsupported_activity' });
  }

  if (activity === 'shared_parts_map') {
    const mapMode = MAP_MODES.has(requestedState.mapMode) ? requestedState.mapMode : 'explore';
    return {
      activity: 'shared_parts_map',
      startedAt: new Date().toISOString(),
      status: 'active',
      selectedPartId: null,
      mapMode,
      advisorPrompt: String(requestedState.advisorPrompt || '').replace(/\s+/g, ' ').trim().slice(0, MAX_PROMPT_LENGTH),
      pendingSuggestions: [],
      layoutDraft: sanitizeLayoutDraft(requestedState.layoutDraft || {}),
      clientConfirmationRequired: true,
      hasUnsavedConfirmedChanges: false
    };
  }

  if (activity !== 'guided_breathing') {
    const currentStep = Number(requestedState.currentStep || 0);
    const stepCount = STEP_COUNTS.get(activity) || 1;
    const safeStep = Number.isFinite(currentStep) ? Math.min(Math.max(Math.floor(currentStep), 0), stepCount - 1) : 0;
    return {
      activity,
      currentStep: safeStep,
      startedAt: new Date().toISOString(),
      status: 'active',
      steps: [],
      advisorPrompt: String(requestedState.advisorPrompt || requestedState.message || '').replace(/\s+/g, ' ').trim().slice(0, MAX_PROMPT_LENGTH),
      clientCanReflect: true
    };
  }

  const inhaleSeconds = Number(requestedState.inhaleSeconds || 4);
  const holdSeconds = Number(requestedState.holdSeconds || 2);
  const exhaleSeconds = Number(requestedState.exhaleSeconds || 6);
  const durationSeconds = Number(requestedState.durationSeconds || 180);
  const safeDuration = Number.isFinite(durationSeconds) ? Math.min(Math.max(durationSeconds, 30), 600) : 180;
  const safeInhale = Number.isFinite(inhaleSeconds) ? Math.min(Math.max(inhaleSeconds, 2), 10) : 4;
  const safeHold = Number.isFinite(holdSeconds) ? Math.min(Math.max(holdSeconds, 0), 8) : 2;
  const safeExhale = Number.isFinite(exhaleSeconds) ? Math.min(Math.max(exhaleSeconds, 2), 12) : 6;

  return {
    activity: 'guided_breathing',
    phase: 'inhale',
    startedAt: new Date().toISOString(),
    pausedAt: null,
    durationSeconds: safeDuration,
    cycleSeconds: safeInhale + safeHold + safeExhale,
    inhaleSeconds: safeInhale,
    holdSeconds: safeHold,
    exhaleSeconds: safeExhale,
    status: 'active',
    advisorPrompt: String(requestedState.advisorPrompt || '').replace(/\s+/g, ' ').trim().slice(0, MAX_PROMPT_LENGTH),
    message: String(requestedState.message || 'Follow the breathing circle gently.').slice(0, MAX_PROMPT_LENGTH)
  };
}


function sanitizeText(value, maxLength) {
  return String(value || '').replace(/\s+/g, ' ').trim().slice(0, maxLength);
}

function sanitizePartId(value, label = 'partId') {
  const text = String(value || '').trim();
  if (!text || text.length > 100 || !/^[A-Za-z0-9_.:-]+$/.test(text)) {
    throw Object.assign(new Error(`${label} is invalid`), { statusCode: 400, code: 'invalid_part_id' });
  }
  return text;
}

function sanitizePartType(value) {
  const text = String(value || '').toLowerCase().trim();
  return PART_TYPES.has(text) ? text : 'unknown';
}

function sanitizeNumber(value, label) {
  const number = Number(value);
  if (!Number.isFinite(number)) {
    throw Object.assign(new Error(`${label} must be a finite number`), { statusCode: 400, code: 'invalid_map_position' });
  }
  return Math.min(Math.max(number, 0), 100);
}

function sanitizeColor(value) {
  const text = String(value || '').trim();
  return /^#[0-9a-f]{6}$/i.test(text) || /^[a-z-]{3,30}$/i.test(text) ? text.slice(0, 50) : null;
}

function sanitizeLayoutDraft(value = {}) {
  const draft = value && typeof value === 'object' && !Array.isArray(value) ? value : {};
  return Object.entries(draft).slice(0, 100).reduce((acc, [partId, layout]) => {
    if (!layout || typeof layout !== 'object') return acc;
    const safePartId = sanitizePartId(partId);
    const next = {};
    if (layout.x !== undefined) next.x = sanitizeNumber(layout.x, 'x');
    if (layout.y !== undefined) next.y = sanitizeNumber(layout.y, 'y');
    if (layout.color !== undefined) next.color = sanitizeColor(layout.color);
    if (Object.keys(next).length) acc[safePartId] = next;
    return acc;
  }, {});
}

function sanitizeSuggestion(raw = {}) {
  const suggestionType = ['new_part', 'part_type', 'descriptor', 'layout'].includes(raw.suggestionType) ? raw.suggestionType : 'new_part';
  const suggestion = {
    id: raw.id || `suggestion_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    suggestionType,
    status: 'pending',
    createdAt: new Date().toISOString()
  };
  if (raw.partId) suggestion.partId = sanitizePartId(raw.partId);
  if (raw.name) suggestion.name = sanitizeText(raw.name, MAX_SUGGESTION_NAME_LENGTH);
  if (raw.partType !== undefined) suggestion.partType = sanitizePartType(raw.partType);
  if (raw.description) suggestion.description = sanitizeText(raw.description, MAX_SUGGESTION_DESCRIPTION_LENGTH);
  if (raw.x !== undefined) suggestion.x = sanitizeNumber(raw.x, 'x');
  if (raw.y !== undefined) suggestion.y = sanitizeNumber(raw.y, 'y');
  if (raw.color !== undefined) suggestion.color = sanitizeColor(raw.color);
  if (suggestionType === 'new_part' && !suggestion.name) {
    throw Object.assign(new Error('Suggested part name is required'), { statusCode: 400, code: 'suggestion_name_required' });
  }
  if (suggestionType !== 'new_part' && !suggestion.partId) {
    throw Object.assign(new Error('Existing part suggestions require a partId'), { statusCode: 400, code: 'suggestion_part_required' });
  }
  return suggestion;
}

async function assertPartBelongsToClient(clientId, partId) {
  const rows = await sql`
    SELECT id
    FROM ifs_parts
    WHERE client_id = ${clientId}
      AND id = ${partId}
      AND COALESCE(is_active, true) = true
    LIMIT 1
  `;
  if (!rows[0]) throw Object.assign(new Error('Part not found for this client'), { statusCode: 404, code: 'part_not_found' });
}

async function loadPartsForClient(clientId) {
  return sql`
    SELECT id, name, part_name, type, part_type, role, description, x, y, size, color, notes, updated_at
    FROM ifs_parts
    WHERE client_id = ${clientId}
      AND COALESCE(is_active, true) = true
    ORDER BY updated_at DESC NULLS LAST, created_at DESC NULLS LAST
  `;
}

function ensureSharedMapActivity(session) {
  if (session.current_activity !== 'shared_parts_map' || session.activity_state?.activity !== 'shared_parts_map') {
    throw Object.assign(new Error('Shared Parts Map is not active for this session'), { statusCode: 400, code: 'shared_map_not_active' });
  }
}

function addPauseMetadata(state = {}) {
  return {
    ...state,
    pausedAt: new Date().toISOString(),
    status: 'paused',
    isPaused: true
  };
}

function resumeWithAdjustedStart(state = {}) {
  if (!state.pausedAt || !state.startedAt) {
    return { ...state, status: 'active', pausedAt: null, isPaused: false, resumedAt: new Date().toISOString() };
  }

  const pausedAt = new Date(state.pausedAt).getTime();
  const now = Date.now();
  const originalStartedAt = new Date(state.startedAt).getTime();
  if ([pausedAt, originalStartedAt].some((value) => Number.isNaN(value))) {
    return { ...state, status: 'active', pausedAt: null, isPaused: false, resumedAt: new Date().toISOString() };
  }

  const pausedMs = Math.max(0, now - pausedAt);
  return {
    ...state,
    startedAt: new Date(originalStartedAt + pausedMs).toISOString(),
    pausedAt: null,
    status: 'active',
    isPaused: false,
    resumedAt: new Date().toISOString()
  };
}

async function assertClientExists(clientId) {
  const rows = await sql`SELECT id, user_role FROM ifs_clients WHERE id = ${clientId} LIMIT 1`;
  if (!rows[0] || rows[0].user_role !== 'client') {
    throw Object.assign(new Error('Client not found'), { statusCode: 404, code: 'client_not_found' });
  }
}

async function getSession(sessionId) {
  const rows = await sql`
    SELECT *
    FROM ifs_live_sessions
    WHERE id = ${sessionId}
    LIMIT 1
  `;
  if (!rows[0]) throw Object.assign(new Error('Live session not found'), { statusCode: 404, code: 'session_not_found' });
  return rows[0];
}

async function assertCanAccessSession(user, session) {
  if (isAdminUser(user)) return;
  if (user.user_role === 'client') {
    if (String(user.id) !== String(session.client_id)) {
      throw Object.assign(new Error('Client access denied'), { statusCode: 403, code: 'client_access_denied' });
    }
    return;
  }
  if (isTherapistUser(user)) {
    if (String(user.id) !== String(session.therapist_id)) {
      throw Object.assign(new Error('Advisor access denied'), { statusCode: 403, code: 'therapist_access_denied' });
    }
    await requireTherapistAssignment(user.id, session.client_id);
    return;
  }
  throw Object.assign(new Error('Access denied'), { statusCode: 403, code: 'access_denied' });
}

async function assertTherapistControl(user, session) {
  if (!isTherapistUser(user)) {
    throw Object.assign(new Error('Advisor access required'), { statusCode: 403, code: 'therapist_required' });
  }
  if (isAdminUser(user)) return;
  if (String(user.id) !== String(session.therapist_id)) {
    throw Object.assign(new Error('Only the session Advisor can control this live guided practice'), { statusCode: 403, code: 'therapist_access_denied' });
  }
  await requireTherapistAssignment(user.id, session.client_id);
}

async function recordEvent(session, eventType, payload = {}) {
  if (!EVENT_TYPES.has(eventType)) return;
  await sql`
    INSERT INTO ifs_live_session_events (live_session_id, therapist_id, client_id, event_type, event_payload)
    VALUES (${session.id}, ${session.therapist_id}, ${session.client_id}, ${eventType}, ${JSON.stringify(payload)}::jsonb)
  `;
}

function publicSession(session) {
  return {
    id: session.id,
    therapist_id: session.therapist_id,
    client_id: session.client_id,
    status: session.status,
    current_activity: session.current_activity,
    activity_state: session.activity_state || {},
    therapist_last_seen_at: session.therapist_last_seen_at,
    client_last_seen_at: session.client_last_seen_at,
    started_at: session.started_at,
    ended_at: session.ended_at,
    updated_at: session.updated_at,
    server_now: new Date().toISOString()
  };
}

async function startSession(user, body) {
  if (!isTherapistUser(user)) {
    throw Object.assign(new Error('Advisor access required'), { statusCode: 403, code: 'therapist_required' });
  }
  const clientId = requireUuid(body.clientId, 'clientId');
  await assertClientExists(clientId);
  if (!isAdminUser(user)) await requireTherapistAssignment(user.id, clientId);

  const existing = await sql`
    SELECT *
    FROM ifs_live_sessions
    WHERE therapist_id = ${user.id}
      AND client_id = ${clientId}
      AND status IN ('active', 'paused')
    ORDER BY updated_at DESC
    LIMIT 1
  `;

  let session = existing[0];
  if (session) {
    const rows = await sql`
      UPDATE ifs_live_sessions
      SET status = 'active', therapist_last_seen_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
      WHERE id = ${session.id}
      RETURNING *
    `;
    session = rows[0];
  } else {
    const rows = await sql`
      INSERT INTO ifs_live_sessions (therapist_id, client_id, status, therapist_last_seen_at)
      VALUES (${user.id}, ${clientId}, 'active', CURRENT_TIMESTAMP)
      RETURNING *
    `;
    session = rows[0];
  }

  await recordEvent(session, 'session_started', { reused: Boolean(existing[0]) });
  await safeCreateInAppNotification({
    recipientId: session.client_id,
    actorId: user.id,
    clientId: session.client_id,
    therapistId: session.therapist_id,
    notificationType: 'live_session_started',
    title: 'Live session started',
    message: 'Your Advisor started a live guided practice.',
    entityType: 'live_session',
    entityId: session.id,
    priority: 'important'
  }, 'live session started notification');
  return publicSession(session);
}

async function getState(user, body) {
  const session = await getSession(requireUuid(body.sessionId, 'sessionId'));
  await assertCanAccessSession(user, session);
  return publicSession(session);
}

async function getActiveForClient(user) {
  if (user.user_role !== 'client' && !isAdminUser(user)) {
    throw Object.assign(new Error('Client access required'), { statusCode: 403, code: 'client_required' });
  }
  const rows = await sql`
    SELECT *
    FROM ifs_live_sessions
    WHERE client_id = ${user.id}
      AND status IN ('active', 'paused')
    ORDER BY updated_at DESC
    LIMIT 1
  `;
  return rows[0] ? publicSession(rows[0]) : null;
}

async function startActivity(user, body) {
  const session = await getSession(requireUuid(body.sessionId, 'sessionId'));
  await assertTherapistControl(user, session);
  const activity = String(body.activity || 'guided_breathing');
  const nextState = normalizeActivityState(activity, body.activityState || {});
  const rows = await sql`
    UPDATE ifs_live_sessions
    SET status = 'active', current_activity = ${activity}, activity_state = ${JSON.stringify(nextState)}::jsonb,
        therapist_last_seen_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP, ended_at = NULL
    WHERE id = ${session.id}
    RETURNING *
  `;
  await recordEvent(rows[0], 'activity_started', { activity, eventName: activity === 'shared_parts_map' ? 'shared_map_started' : 'activity_started' });
  return publicSession(rows[0]);
}

async function pauseActivity(user, body) {
  const session = await getSession(requireUuid(body.sessionId, 'sessionId'));
  await assertTherapistControl(user, session);
  const nextState = addPauseMetadata(session.activity_state || {});
  const rows = await sql`
    UPDATE ifs_live_sessions
    SET status = 'paused', activity_state = ${JSON.stringify(nextState)}::jsonb,
        therapist_last_seen_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
    WHERE id = ${session.id}
    RETURNING *
  `;
  await recordEvent(rows[0], 'activity_paused', { activity: rows[0].current_activity });
  return publicSession(rows[0]);
}

async function resumeActivity(user, body) {
  const session = await getSession(requireUuid(body.sessionId, 'sessionId'));
  await assertTherapistControl(user, session);
  const nextState = resumeWithAdjustedStart(session.activity_state || {});
  const rows = await sql`
    UPDATE ifs_live_sessions
    SET status = 'active', activity_state = ${JSON.stringify(nextState)}::jsonb,
        therapist_last_seen_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
    WHERE id = ${session.id}
    RETURNING *
  `;
  await recordEvent(rows[0], 'activity_resumed', { activity: rows[0].current_activity });
  return publicSession(rows[0]);
}

async function endActivity(user, body) {
  const session = await getSession(requireUuid(body.sessionId, 'sessionId'));
  await assertTherapistControl(user, session);
  const nextState = { ...(session.activity_state || {}), status: 'complete', completedAt: new Date().toISOString(), isComplete: true };
  const rows = await sql`
    UPDATE ifs_live_sessions
    SET status = 'active', current_activity = NULL, activity_state = ${JSON.stringify(nextState)}::jsonb,
        therapist_last_seen_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
    WHERE id = ${session.id}
    RETURNING *
  `;
  await recordEvent(rows[0], 'activity_ended', { activity: session.current_activity });
  return publicSession(rows[0]);
}

async function sendPrompt(user, body) {
  const session = await getSession(requireUuid(body.sessionId, 'sessionId'));
  await assertTherapistControl(user, session);
  const prompt = sanitizePrompt(body.prompt);
  const nextState = {
    ...(session.activity_state || {}),
    advisorPrompt: prompt,
    lastPrompt: prompt,
    lastPromptAt: new Date().toISOString()
  };
  const rows = await sql`
    UPDATE ifs_live_sessions
    SET activity_state = ${JSON.stringify(nextState)}::jsonb,
        therapist_last_seen_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
    WHERE id = ${session.id}
    RETURNING *
  `;
  await recordEvent(rows[0], 'prompt_sent', { prompt });
  return publicSession(rows[0]);
}

function resolveStep(session, requestedStep) {
  const activity = session.current_activity;
  if (!STEP_COUNTS.has(activity)) {
    throw Object.assign(new Error('Current activity does not support steps'), { statusCode: 400, code: 'activity_not_step_based' });
  }
  const stepCount = STEP_COUNTS.get(activity);
  const numeric = Number(requestedStep);
  const current = Number(session.activity_state?.currentStep || 0);
  const fallback = Number.isFinite(current) ? current : 0;
  const next = Number.isFinite(numeric) ? numeric : fallback;
  return Math.min(Math.max(Math.floor(next), 0), stepCount - 1);
}

async function setActivityStep(user, body) {
  const session = await getSession(requireUuid(body.sessionId, 'sessionId'));
  await assertTherapistControl(user, session);
  const currentStep = resolveStep(session, body.currentStep);
  const nextState = {
    ...(session.activity_state || {}),
    activity: session.current_activity,
    currentStep,
    status: session.status === 'paused' ? 'paused' : 'active',
    stepChangedAt: new Date().toISOString()
  };
  const rows = await sql`
    UPDATE ifs_live_sessions
    SET activity_state = ${JSON.stringify(nextState)}::jsonb,
        therapist_last_seen_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
    WHERE id = ${session.id}
    RETURNING *
  `;
  return publicSession(rows[0]);
}

async function moveActivityStep(user, body, delta) {
  const session = await getSession(requireUuid(body.sessionId, 'sessionId'));
  const current = Number(session.activity_state?.currentStep || 0);
  return setActivityStep(user, { ...body, currentStep: (Number.isFinite(current) ? current : 0) + delta });
}


async function getMapParts(user, body) {
  let clientId = body.clientId ? requireUuid(body.clientId, 'clientId') : null;
  if (body.sessionId) {
    const session = await getSession(requireUuid(body.sessionId, 'sessionId'));
    await assertCanAccessSession(user, session);
    clientId = session.client_id;
  }
  if (!clientId) throw Object.assign(new Error('clientId or sessionId is required'), { statusCode: 400, code: 'client_required' });
  if (user.user_role === 'client') {
    if (String(user.id) !== String(clientId)) throw Object.assign(new Error('Client access denied'), { statusCode: 403, code: 'client_access_denied' });
  } else if (isTherapistUser(user) && !isAdminUser(user)) {
    await requireTherapistAssignment(user.id, clientId);
  } else if (!isAdminUser(user)) {
    throw Object.assign(new Error('Access denied'), { statusCode: 403, code: 'access_denied' });
  }
  return { parts: await loadPartsForClient(clientId) };
}

async function setSelectedPart(user, body) {
  const session = await getSession(requireUuid(body.sessionId, 'sessionId'));
  await assertCanAccessSession(user, session);
  ensureSharedMapActivity(session);
  const selectedPartId = body.partId ? sanitizePartId(body.partId) : null;
  if (selectedPartId) await assertPartBelongsToClient(session.client_id, selectedPartId);
  const nextState = { ...(session.activity_state || {}), selectedPartId, selectedAt: new Date().toISOString() };
  const rows = await sql`
    UPDATE ifs_live_sessions
    SET activity_state = ${JSON.stringify(nextState)}::jsonb, updated_at = CURRENT_TIMESTAMP
    WHERE id = ${session.id}
    RETURNING *
  `;
  await recordEvent(rows[0], 'prompt_sent', { eventName: 'part_selected', partId: selectedPartId });
  return publicSession(rows[0]);
}

async function updateMapDraft(user, body) {
  const session = await getSession(requireUuid(body.sessionId, 'sessionId'));
  await assertTherapistControl(user, session);
  ensureSharedMapActivity(session);
  const layoutDraft = sanitizeLayoutDraft(body.layoutDraft || {});
  for (const partId of Object.keys(layoutDraft)) await assertPartBelongsToClient(session.client_id, partId);
  const mapMode = MAP_MODES.has(body.mapMode) ? body.mapMode : session.activity_state?.mapMode || 'explore';
  const advisorPrompt = body.advisorPrompt !== undefined ? sanitizeText(body.advisorPrompt, MAX_PROMPT_LENGTH) : session.activity_state?.advisorPrompt || '';
  const nextState = {
    ...(session.activity_state || {}),
    layoutDraft: { ...(session.activity_state?.layoutDraft || {}), ...layoutDraft },
    mapMode,
    advisorPrompt,
    clientConfirmationRequired: true,
    hasUnsavedConfirmedChanges: true,
    draftUpdatedAt: new Date().toISOString()
  };
  const rows = await sql`
    UPDATE ifs_live_sessions
    SET activity_state = ${JSON.stringify(nextState)}::jsonb,
        therapist_last_seen_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
    WHERE id = ${session.id}
    RETURNING *
  `;
  await recordEvent(rows[0], 'prompt_sent', { eventName: 'map_draft_updated', mapMode, partCount: Object.keys(layoutDraft).length });
  return publicSession(rows[0]);
}

async function suggestPart(user, body) {
  const session = await getSession(requireUuid(body.sessionId, 'sessionId'));
  await assertTherapistControl(user, session);
  ensureSharedMapActivity(session);
  const suggestion = sanitizeSuggestion(body.suggestion || body);
  if (suggestion.partId) await assertPartBelongsToClient(session.client_id, suggestion.partId);
  const pending = Array.isArray(session.activity_state?.pendingSuggestions) ? session.activity_state.pendingSuggestions : [];
  const nextState = {
    ...(session.activity_state || {}),
    pendingSuggestions: [...pending.filter((item) => item.status === 'pending').slice(-19), suggestion],
    clientConfirmationRequired: true,
    hasUnsavedConfirmedChanges: true
  };
  const rows = await sql`
    UPDATE ifs_live_sessions
    SET activity_state = ${JSON.stringify(nextState)}::jsonb,
        therapist_last_seen_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
    WHERE id = ${session.id}
    RETURNING *
  `;
  await recordEvent(rows[0], 'prompt_sent', { eventName: 'part_suggested', suggestionId: suggestion.id, suggestionType: suggestion.suggestionType });
  return publicSession(rows[0]);
}

async function updateSuggestionStatus(user, body, status) {
  const session = await getSession(requireUuid(body.sessionId, 'sessionId'));
  await assertCanAccessSession(user, session);
  if (user.user_role !== 'client' || String(user.id) !== String(session.client_id)) {
    throw Object.assign(new Error('Client confirmation is required'), { statusCode: 403, code: 'client_confirmation_required' });
  }
  ensureSharedMapActivity(session);
  const suggestionId = String(body.suggestionId || '').trim();
  const suggestions = Array.isArray(session.activity_state?.pendingSuggestions) ? session.activity_state.pendingSuggestions : [];
  let found = false;
  const nextSuggestions = suggestions.map((item) => {
    if (String(item.id) !== suggestionId || item.status !== 'pending') return item;
    found = true;
    return { ...item, status, decidedAt: new Date().toISOString() };
  });
  if (!found) throw Object.assign(new Error('Suggestion not found'), { statusCode: 404, code: 'suggestion_not_found' });
  const nextState = { ...(session.activity_state || {}), pendingSuggestions: nextSuggestions, hasUnsavedConfirmedChanges: status === 'accepted' ? true : session.activity_state?.hasUnsavedConfirmedChanges };
  const rows = await sql`
    UPDATE ifs_live_sessions
    SET activity_state = ${JSON.stringify(nextState)}::jsonb,
        client_last_seen_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
    WHERE id = ${session.id}
    RETURNING *
  `;
  await recordEvent(rows[0], 'prompt_sent', { eventName: status === 'accepted' ? 'suggestion_accepted' : 'suggestion_dismissed', suggestionId });
  return publicSession(rows[0]);
}

async function saveConfirmedMap(user, body) {
  const session = await getSession(requireUuid(body.sessionId, 'sessionId'));
  await assertCanAccessSession(user, session);
  if (user.user_role !== 'client' || String(user.id) !== String(session.client_id)) {
    throw Object.assign(new Error('Client confirmation is required before saving the Shared Parts Map'), { statusCode: 403, code: 'client_confirmation_required' });
  }
  ensureSharedMapActivity(session);
  const state = session.activity_state || {};
  const suggestions = Array.isArray(state.pendingSuggestions) ? state.pendingSuggestions : [];
  const accepted = suggestions.filter((item) => item.status === 'accepted' && !item.savedAt);
  const savedPartIds = [];

  for (const suggestion of accepted) {
    if (suggestion.suggestionType === 'new_part') {
      const partId = `live_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
      await sql`
        INSERT INTO ifs_parts (client_id, id, name, part_name, type, part_type, role, description, x, y, color, is_active, created_at, updated_at)
        VALUES (${session.client_id}, ${partId}, ${suggestion.name}, ${suggestion.name}, ${suggestion.partType || 'unknown'}, ${suggestion.partType || 'unknown'}, ${suggestion.partType || 'unknown'}, ${suggestion.description || null}, ${suggestion.x ?? null}, ${suggestion.y ?? null}, ${suggestion.color || null}, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
        ON CONFLICT (client_id, id) DO UPDATE SET updated_at = CURRENT_TIMESTAMP
      `;
      savedPartIds.push(partId);
    } else if (suggestion.partId) {
      await assertPartBelongsToClient(session.client_id, suggestion.partId);
      if (suggestion.suggestionType === 'part_type') {
        await sql`
          UPDATE ifs_parts
          SET part_type = ${suggestion.partType || 'unknown'}, type = ${suggestion.partType || 'unknown'}, updated_at = CURRENT_TIMESTAMP
          WHERE client_id = ${session.client_id} AND id = ${suggestion.partId}
        `;
      }
      if (suggestion.suggestionType === 'descriptor' && suggestion.description) {
        await sql`
          UPDATE ifs_parts
          SET description = ${suggestion.description}, updated_at = CURRENT_TIMESTAMP
          WHERE client_id = ${session.client_id} AND id = ${suggestion.partId}
        `;
      }
      if (suggestion.suggestionType === 'layout') {
        await sql`
          UPDATE ifs_parts
          SET x = COALESCE(${suggestion.x ?? null}, x), y = COALESCE(${suggestion.y ?? null}, y), color = COALESCE(${suggestion.color || null}, color), updated_at = CURRENT_TIMESTAMP
          WHERE client_id = ${session.client_id} AND id = ${suggestion.partId}
        `;
      }
      savedPartIds.push(suggestion.partId);
    }
  }

  const layoutDraft = sanitizeLayoutDraft(state.layoutDraft || {});
  for (const [partId, layout] of Object.entries(layoutDraft)) {
    await assertPartBelongsToClient(session.client_id, partId);
    await sql`
      UPDATE ifs_parts
      SET x = COALESCE(${layout.x ?? null}, x), y = COALESCE(${layout.y ?? null}, y), color = COALESCE(${layout.color || null}, color), updated_at = CURRENT_TIMESTAMP
      WHERE client_id = ${session.client_id} AND id = ${partId}
    `;
    savedPartIds.push(partId);
  }

  const nextSuggestions = suggestions.map((item) => item.status === 'accepted' ? { ...item, savedAt: new Date().toISOString() } : item).filter((item) => item.status === 'pending');
  const nextState = { ...state, pendingSuggestions: nextSuggestions, layoutDraft: {}, hasUnsavedConfirmedChanges: false, lastSavedAt: new Date().toISOString() };
  const rows = await sql`
    UPDATE ifs_live_sessions
    SET activity_state = ${JSON.stringify(nextState)}::jsonb,
        client_last_seen_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
    WHERE id = ${session.id}
    RETURNING *
  `;
  await recordEvent(rows[0], 'prompt_sent', { eventName: 'map_saved', savedPartCount: Array.from(new Set(savedPartIds)).length });
  return publicSession(rows[0]);
}

async function endSession(user, body) {
  const session = await getSession(requireUuid(body.sessionId, 'sessionId'));
  await assertTherapistControl(user, session);
  const nextState = { ...(session.activity_state || {}), endedAt: new Date().toISOString() };
  const rows = await sql`
    UPDATE ifs_live_sessions
    SET status = 'ended', activity_state = ${JSON.stringify(nextState)}::jsonb,
        ended_at = CURRENT_TIMESTAMP, therapist_last_seen_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
    WHERE id = ${session.id}
    RETURNING *
  `;
  await recordEvent(rows[0], 'session_ended', {});
  await safeCreateInAppNotification({
    recipientId: rows[0].client_id,
    actorId: user.id,
    clientId: rows[0].client_id,
    therapistId: rows[0].therapist_id,
    notificationType: 'live_session_ended',
    title: 'Live session ended',
    message: 'Your live guided practice has ended.',
    entityType: 'live_session',
    entityId: rows[0].id,
    priority: 'normal'
  }, 'live session ended notification');
  return publicSession(rows[0]);
}

async function heartbeat(user, body) {
  const session = await getSession(requireUuid(body.sessionId, 'sessionId'));
  await assertCanAccessSession(user, session);
  const role = user.user_role === 'client' ? 'client' : 'therapist';
  const column = role === 'client' ? 'client_last_seen_at' : 'therapist_last_seen_at';
  const rows = await sql.query(
    `UPDATE ifs_live_sessions SET ${column} = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP WHERE id = $1 RETURNING *`,
    [session.id]
  );
  await recordEvent(rows[0], role === 'client' ? 'client_joined' : 'heartbeat', { role });
  if (role === 'client' && !session.client_last_seen_at) {
    await safeCreateInAppNotification({
      recipientId: rows[0].therapist_id,
      actorId: user.id,
      clientId: rows[0].client_id,
      therapistId: rows[0].therapist_id,
      notificationType: 'live_session_joined',
      title: 'Client joined live session',
      message: 'Your client joined the live guided practice.',
      entityType: 'live_session',
      entityId: rows[0].id,
      priority: 'normal'
    }, 'live session joined notification');
  }
  return publicSession(rows[0]);
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return sendError(res, 405, 'Method not allowed', 'method_not_allowed');
  }

  try {
    const user = await getCurrentAppUserFromClerk(req);
    const body = req.body || {};
    const action = String(body.action || '');

    if (!action || (!THERAPIST_ACTIONS.has(action) && !READ_ACTIONS.has(action) && !CLIENT_CONFIRMATION_ACTIONS.has(action) && action !== 'heartbeat')) {
      return sendError(res, 400, 'Unsupported live session action', 'unsupported_action');
    }

    const handlers = {
      start_session: () => startSession(user, body),
      get_state: () => getState(user, body),
      get_active_for_client: () => getActiveForClient(user),
      get_map_parts: () => getMapParts(user, body),
      start_activity: () => startActivity(user, body),
      pause_activity: () => pauseActivity(user, body),
      resume_activity: () => resumeActivity(user, body),
      end_activity: () => endActivity(user, body),
      send_prompt: () => sendPrompt(user, body),
      next_step: () => moveActivityStep(user, body, 1),
      previous_step: () => moveActivityStep(user, body, -1),
      set_activity_step: () => setActivityStep(user, body),
      set_selected_part: () => setSelectedPart(user, body),
      update_map_draft: () => updateMapDraft(user, body),
      suggest_part: () => suggestPart(user, body),
      accept_suggestion: () => updateSuggestionStatus(user, body, 'accepted'),
      dismiss_suggestion: () => updateSuggestionStatus(user, body, 'dismissed'),
      save_confirmed_map: () => saveConfirmedMap(user, body),
      end_session: () => endSession(user, body),
      heartbeat: () => heartbeat(user, body)
    };

    const data = await handlers[action]();
    return res.status(200).json({ data });
  } catch (error) {
    return sendError(res, error.statusCode || 500, error.message || 'Live session request failed', error.code || 'server_error');
  }
}
