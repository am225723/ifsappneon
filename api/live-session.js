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
  'suggest_part',
  'update_map_node_position',
  'suggest_relationship',
  'update_shared_map',
  'select_map_node',
  'confirm_map_node',
  'remove_map_node'
]);
const READ_ACTIONS = new Set(['get_state', 'get_active_for_client', 'get_map_parts']);
const CLIENT_CONFIRMATION_ACTIONS = new Set(['update_map_node_position', 'accept_suggestion', 'dismiss_suggestion', 'accept_relationship', 'dismiss_relationship', 'save_confirmed_map', 'update_shared_map', 'select_map_node', 'confirm_map_node', 'remove_map_node']);
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
  'unblending',
  'self_energy_check',
  'protector_appreciation',
  'body_scan',
  'window_of_tolerance',
  'feelings_wheel',
  'parts_check_in',
  // Phase 14B collaborative Shared Parts Map practice.
  'shared_parts_map'
]);
const STEP_COUNTS = new Map([
  ['grounding_54321', 5],
  ['unblending', 5],
  ['self_energy_check', 8],
  ['protector_appreciation', 5],
  ['body_scan', 6],
  ['window_of_tolerance', 6],
  ['feelings_wheel', 6],
  ['parts_check_in', 7]
]);
const DEFAULT_DURATIONS = new Map([
  ['grounding_54321', 240],
  ['unblending', 300],
  ['self_energy_check', 300],
  ['protector_appreciation', 300],
  ['body_scan', 300],
  ['window_of_tolerance', 300],
  ['feelings_wheel', 300],
  ['parts_check_in', 300]
]);
const SOURCE_PRACTICES = new Map([
  ['guided_breathing', 'Breath Anchor'],
  ['grounding_54321', 'Grounding practice'],
  ['unblending', 'Return to Self-Energy'],
  ['self_energy_check', 'Return to Self-Energy'],
  ['protector_appreciation', 'Protector Check-In'],
  ['body_scan', 'Mini Body Scan'],
  ['window_of_tolerance', 'Window of Tolerance Mapping'],
  ['feelings_wheel', 'Needs & Boundaries Reflection'],
  ['parts_check_in', 'Notice a Part in the Moment'],
  ['shared_parts_map', 'My Inner System / Parts Work']
]);
const MAX_PROMPT_LENGTH = 500;
const MAX_SUGGESTION_NAME_LENGTH = 100;
const MAX_SUGGESTION_DESCRIPTION_LENGTH = 500;
const MAX_SHARED_MAP_NODES = 30;
const MAX_SHARED_MAP_NAME_LENGTH = 80;
const MAX_SHARED_MAP_PROMPT_LENGTH = 240;
const MAP_MODES = new Set(['explore', 'protectors', 'exiles', 'relationships', 'self_energy']);
const PART_TYPES = new Set(['protector', 'manager', 'firefighter', 'exile', 'self', 'self-like', 'unknown', '']);
const SHARED_MAP_ROLES = new Set(['protector', 'manager', 'firefighter', 'exile', 'self-like', 'unknown']);
const SHARED_MAP_COLORS = new Set(['amber', 'orange', 'emerald', 'green', 'rose', 'sky', 'stone', 'gold']);
const RELATIONSHIP_TYPES = new Set(['close_to', 'protects', 'concerned_about', 'polarized_with', 'supports', 'needs_space_from', 'unknown']);

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
    return normalizeSharedMapState(requestedState);
  }

  if (activity !== 'guided_breathing') {
    const currentStep = Number(requestedState.currentStep || 0);
    const stepCount = STEP_COUNTS.get(activity) || 1;
    const safeStep = Number.isFinite(currentStep) ? Math.min(Math.max(Math.floor(currentStep), 0), stepCount - 1) : 0;
    const durationSeconds = Number(requestedState.durationSeconds || DEFAULT_DURATIONS.get(activity) || 300);
    const safeDuration = Number.isFinite(durationSeconds) ? Math.min(Math.max(durationSeconds, 30), 900) : (DEFAULT_DURATIONS.get(activity) || 300);
    const steps = Array.isArray(requestedState.steps)
      ? requestedState.steps.slice(0, stepCount).map((step = {}) => ({
          title: sanitizeText(step.title, 120),
          prompt: sanitizeText(step.prompt, 500),
          helper: sanitizeText(step.helper, 500)
        }))
      : [];
    return {
      activity,
      presetId: sanitizeText(requestedState.presetId || activity, 100),
      sourcePractice: sanitizeText(requestedState.sourcePractice || SOURCE_PRACTICES.get(activity) || '', 120),
      sourceActivity: sanitizeText(requestedState.sourceActivity || '', 120),
      currentStep: safeStep,
      startedAt: new Date().toISOString(),
      pausedAt: null,
      durationSeconds: safeDuration,
      status: 'active',
      steps,
      advisorPrompt: String(requestedState.advisorPrompt || requestedState.message || '').replace(/\s+/g, ' ').trim().slice(0, MAX_PROMPT_LENGTH),
      clientCanReflect: false
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
    message: String(requestedState.message || 'Follow the breathing circle gently.').slice(0, MAX_PROMPT_LENGTH),
    sourcePractice: sanitizeText(requestedState.sourcePractice || SOURCE_PRACTICES.get('guided_breathing') || '', 120)
  };
}


function sanitizeText(value, maxLength) {
  return String(value || '').replace(/\s+/g, ' ').trim().slice(0, maxLength);
}

function sanitizeSharedMapLocalId(value) {
  const text = String(value || '').trim();
  if (!text || text.length > 80 || !/^[A-Za-z0-9_.:-]+$/.test(text)) {
    throw Object.assign(new Error('Map node id is invalid'), { statusCode: 400, code: 'invalid_map_node_id' });
  }
  return text;
}

function sanitizeSharedMapRole(value) {
  const role = String(value || '').toLowerCase().trim();
  return SHARED_MAP_ROLES.has(role) ? role : 'unknown';
}

function sanitizeSharedMapColor(value) {
  const color = String(value || '').toLowerCase().trim();
  return SHARED_MAP_COLORS.has(color) ? color : 'amber';
}

function sanitizeSharedMapPosition(value, label) {
  const number = Number(value);
  if (!Number.isFinite(number)) {
    throw Object.assign(new Error(`${label} must be a finite number`), { statusCode: 400, code: 'invalid_map_position' });
  }
  return Math.min(Math.max(Math.round(number), 0), 100);
}

function sanitizeSharedMapNode(raw = {}, existingNode = {}, actor = 'client') {
  const node = raw && typeof raw === 'object' && !Array.isArray(raw) ? raw : {};
  const localId = sanitizeSharedMapLocalId(node.localId || existingNode.localId);
  const existingCreatedBy = existingNode.createdBy === 'advisor' ? 'advisor' : 'client';
  const createdBy = node.createdBy === 'advisor' || node.createdBy === 'client' ? node.createdBy : (existingNode.localId ? existingCreatedBy : actor);
  const name = sanitizeText(node.name ?? existingNode.name ?? 'Unnamed part', MAX_SHARED_MAP_NAME_LENGTH) || 'Unnamed part';
  const clientConfirmed = Boolean(existingNode.clientConfirmed || node.clientConfirmed === true);
  return {
    localId,
    partId: node.partId ? sanitizePartId(node.partId) : (existingNode.partId || null),
    name,
    role: sanitizeSharedMapRole(node.role ?? existingNode.role),
    color: sanitizeSharedMapColor(node.color ?? existingNode.color),
    x: sanitizeSharedMapPosition(node.x ?? existingNode.x ?? 50, 'x'),
    y: sanitizeSharedMapPosition(node.y ?? existingNode.y ?? 50, 'y'),
    createdBy,
    status: clientConfirmed ? 'client_confirmed' : 'draft',
    clientConfirmed,
    updatedAt: new Date().toISOString(),
    createdAt: existingNode.createdAt || new Date().toISOString()
  };
}

function normalizeSharedMapState(requestedState = {}) {
  const existingNodes = Array.isArray(requestedState.map?.nodes) ? requestedState.map.nodes : [];
  const nodes = existingNodes.slice(0, MAX_SHARED_MAP_NODES).map((node) => sanitizeSharedMapNode(node, {}, node.createdBy === 'advisor' ? 'advisor' : 'client'));
  return {
    activity: 'shared_parts_map',
    startedAt: requestedState.startedAt || new Date().toISOString(),
    status: requestedState.status === 'paused' ? 'paused' : 'active',
    sourcePractice: sanitizeText(requestedState.sourcePractice || SOURCE_PRACTICES.get('shared_parts_map') || '', 120),
    map: {
      nodes,
      edges: []
    },
    selectedNodeId: requestedState.selectedNodeId ? sanitizeSharedMapLocalId(requestedState.selectedNodeId) : null,
    advisorPrompt: sanitizeText(requestedState.advisorPrompt || '', MAX_SHARED_MAP_PROMPT_LENGTH),
    clientConfirmationRequired: true,
    lastAction: sanitizeText(requestedState.lastAction || 'map_started', 80)
  };
}

function applySharedMapUpdate(currentState = {}, mapUpdate = {}, actor = 'client') {
  const current = normalizeSharedMapState(currentState.activity === 'shared_parts_map' ? currentState : {});
  const update = mapUpdate && typeof mapUpdate === 'object' && !Array.isArray(mapUpdate) ? mapUpdate : {};
  const currentById = new Map(current.map.nodes.map((node) => [String(node.localId), node]));
  const incomingNodes = Array.isArray(update.map?.nodes) ? update.map.nodes : (Array.isArray(update.nodes) ? update.nodes : null);
  const rawNodes = incomingNodes || current.map.nodes;
  if (rawNodes.length > MAX_SHARED_MAP_NODES) {
    throw Object.assign(new Error(`Shared Parts Map can include up to ${MAX_SHARED_MAP_NODES} parts`), { statusCode: 400, code: 'too_many_map_nodes' });
  }
  const nodes = rawNodes.map((rawNode) => {
    const localId = sanitizeSharedMapLocalId(rawNode.localId);
    const existing = currentById.get(localId) || {};
    if (actor === 'advisor' && existing.clientConfirmed) {
      return existing;
    }
    const safeNode = sanitizeSharedMapNode(rawNode, existing, actor);
    if (actor === 'advisor') {
      safeNode.clientConfirmed = Boolean(existing.clientConfirmed);
      safeNode.status = safeNode.clientConfirmed ? 'client_confirmed' : 'draft';
      safeNode.createdBy = existing.localId ? existing.createdBy : 'advisor';
    } else if (actor === 'client') {
      safeNode.createdBy = existing.localId ? existing.createdBy : 'client';
      if (!existing.clientConfirmed && rawNode.clientConfirmed !== true) {
        safeNode.clientConfirmed = false;
        safeNode.status = 'draft';
      }
    }
    return safeNode;
  });
  const selectedNodeId = update.selectedNodeId !== undefined
    ? (update.selectedNodeId ? sanitizeSharedMapLocalId(update.selectedNodeId) : null)
    : current.selectedNodeId;
  if (selectedNodeId && !nodes.some((node) => node.localId === selectedNodeId)) {
    throw Object.assign(new Error('Selected map node was not found'), { statusCode: 404, code: 'map_node_not_found' });
  }
  return {
    ...current,
    map: { nodes, edges: [] },
    selectedNodeId,
    advisorPrompt: update.advisorPrompt !== undefined ? sanitizeText(update.advisorPrompt, MAX_SHARED_MAP_PROMPT_LENGTH) : current.advisorPrompt,
    lastAction: sanitizeText(update.lastAction || 'map_updated', 80),
    updatedAt: new Date().toISOString()
  };
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

function sanitizeRelationshipType(value) {
  const text = String(value || '').toLowerCase().trim();
  return RELATIONSHIP_TYPES.has(text) ? text : 'unknown';
}

function sanitizeRelationship(raw = {}) {
  const fromPartId = sanitizePartId(raw.fromPartId || raw.from || raw.sourcePartId, 'fromPartId');
  const toPartId = sanitizePartId(raw.toPartId || raw.to || raw.targetPartId, 'toPartId');
  if (fromPartId === toPartId) {
    throw Object.assign(new Error('Relationship must connect two different parts'), { statusCode: 400, code: 'invalid_relationship' });
  }
  return {
    id: sanitizeText(raw.id || `relationship_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`, 100),
    fromPartId,
    toPartId,
    relationshipType: sanitizeRelationshipType(raw.relationshipType || raw.type),
    label: sanitizeText(raw.label || raw.description || '', 80),
    status: raw.status === 'accepted' ? 'accepted' : 'pending',
    createdAt: raw.createdAt || new Date().toISOString()
  };
}

function sanitizeLayoutDraft(value = {}) {
  const draft = value && typeof value === 'object' && !Array.isArray(value) ? value : {};
  const nodeEntries = draft.nodes && typeof draft.nodes === 'object' && !Array.isArray(draft.nodes)
    ? Object.entries(draft.nodes)
    : Object.entries(draft).filter(([key]) => key !== 'relationships');
  const nodes = nodeEntries.slice(0, 100).reduce((acc, [partId, layout]) => {
    if (!layout || typeof layout !== 'object') return acc;
    const safePartId = sanitizePartId(partId);
    const next = {};
    if (layout.x !== undefined) next.x = sanitizeNumber(layout.x, 'x');
    if (layout.y !== undefined) next.y = sanitizeNumber(layout.y, 'y');
    if (layout.color !== undefined) next.color = sanitizeColor(layout.color);
    if (Object.keys(next).length) acc[safePartId] = next;
    return acc;
  }, {});
  const relationships = Array.isArray(draft.relationships)
    ? draft.relationships.slice(0, 50).map((relationship) => sanitizeRelationship(relationship))
    : [];
  return { nodes, relationships };
}

function mergeLayoutDraft(current = {}, incoming = {}) {
  const safeCurrent = sanitizeLayoutDraft(current);
  const safeIncoming = sanitizeLayoutDraft(incoming);
  const relationships = [...safeCurrent.relationships];
  safeIncoming.relationships.forEach((relationship) => {
    const existingIndex = relationships.findIndex((item) => String(item.id) === String(relationship.id));
    if (existingIndex >= 0) relationships[existingIndex] = relationship;
    else relationships.push(relationship);
  });
  return {
    nodes: { ...safeCurrent.nodes, ...safeIncoming.nodes },
    relationships: relationships.slice(-50)
  };
}

function sanitizeSuggestion(raw = {}) {
  const suggestionType = ['new_part', 'part_type', 'descriptor', 'layout', 'relationship'].includes(raw.suggestionType) ? raw.suggestionType : 'new_part';
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
  if (suggestionType === 'relationship') {
    const relationship = sanitizeRelationship(raw);
    suggestion.fromPartId = relationship.fromPartId;
    suggestion.toPartId = relationship.toPartId;
    suggestion.relationshipType = relationship.relationshipType;
    suggestion.label = relationship.label;
  }
  if (suggestionType === 'new_part' && !suggestion.name) {
    throw Object.assign(new Error('Suggested part name is required'), { statusCode: 400, code: 'suggestion_name_required' });
  }
  if (!['new_part', 'relationship'].includes(suggestionType) && !suggestion.partId) {
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
  for (const partId of Object.keys(layoutDraft.nodes)) await assertPartBelongsToClient(session.client_id, partId);
  for (const relationship of layoutDraft.relationships) {
    await assertPartBelongsToClient(session.client_id, relationship.fromPartId);
    await assertPartBelongsToClient(session.client_id, relationship.toPartId);
  }
  const mapMode = MAP_MODES.has(body.mapMode) ? body.mapMode : session.activity_state?.mapMode || 'explore';
  const advisorPrompt = body.advisorPrompt !== undefined ? sanitizeText(body.advisorPrompt, MAX_PROMPT_LENGTH) : session.activity_state?.advisorPrompt || '';
  const nextState = {
    ...(session.activity_state || {}),
    layoutDraft: mergeLayoutDraft(session.activity_state?.layoutDraft || {}, layoutDraft),
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
  await recordEvent(rows[0], 'prompt_sent', { eventName: 'map_draft_updated', mapMode, partCount: Object.keys(layoutDraft.nodes).length, relationshipCount: layoutDraft.relationships.length });
  return publicSession(rows[0]);
}


async function updateMapNodePosition(user, body) {
  const session = await getSession(requireUuid(body.sessionId, 'sessionId'));
  await assertCanAccessSession(user, session);
  ensureSharedMapActivity(session);
  if (user.user_role === 'client' && String(user.id) !== String(session.client_id)) {
    throw Object.assign(new Error('Client access denied'), { statusCode: 403, code: 'client_access_denied' });
  }
  if (isTherapistUser(user) && !isAdminUser(user)) {
    await requireTherapistAssignment(user.id, session.client_id);
  }
  const partId = sanitizePartId(body.partId);
  await assertPartBelongsToClient(session.client_id, partId);
  const layoutDraft = sanitizeLayoutDraft({ nodes: { [partId]: { x: body.x, y: body.y, color: body.color } } });
  const nextState = {
    ...(session.activity_state || {}),
    layoutDraft: mergeLayoutDraft(session.activity_state?.layoutDraft || {}, layoutDraft),
    clientConfirmationRequired: true,
    hasUnsavedConfirmedChanges: true,
    draftUpdatedAt: new Date().toISOString()
  };
  const rows = await sql`
    UPDATE ifs_live_sessions
    SET activity_state = ${JSON.stringify(nextState)}::jsonb,
        updated_at = CURRENT_TIMESTAMP,
        therapist_last_seen_at = CASE WHEN ${user.user_role === 'client'} THEN therapist_last_seen_at ELSE CURRENT_TIMESTAMP END,
        client_last_seen_at = CASE WHEN ${user.user_role === 'client'} THEN CURRENT_TIMESTAMP ELSE client_last_seen_at END
    WHERE id = ${session.id}
    RETURNING *
  `;
  await recordEvent(rows[0], 'prompt_sent', { eventName: 'map_node_position_updated', partId, role: user.user_role === 'client' ? 'client' : 'advisor' });
  return publicSession(rows[0]);
}

async function suggestPart(user, body) {
  const session = await getSession(requireUuid(body.sessionId, 'sessionId'));
  await assertTherapistControl(user, session);
  ensureSharedMapActivity(session);
  const suggestion = sanitizeSuggestion(body.suggestion || body);
  if (suggestion.partId) await assertPartBelongsToClient(session.client_id, suggestion.partId);
  if (suggestion.suggestionType === 'relationship') {
    await assertPartBelongsToClient(session.client_id, suggestion.fromPartId);
    await assertPartBelongsToClient(session.client_id, suggestion.toPartId);
  }
  const pending = Array.isArray(session.activity_state?.pendingSuggestions) ? session.activity_state.pendingSuggestions : [];
  const nextState = {
    ...(session.activity_state || {}),
    pendingSuggestions: [...pending.filter((item) => item.status !== 'dismissed' && !item.savedAt).slice(-19), suggestion],
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
  const nextRelationships = sanitizeLayoutDraft(session.activity_state?.layoutDraft || {}).relationships;
  let acceptedRelationship = null;
  const nextSuggestions = suggestions.map((item) => {
    if (String(item.id) !== suggestionId || item.status !== 'pending') return item;
    found = true;
    if (status === 'accepted' && item.suggestionType === 'relationship') {
      acceptedRelationship = sanitizeRelationship({ ...item, status: 'accepted' });
    }
    return { ...item, status, decidedAt: new Date().toISOString() };
  });
  if (!found) throw Object.assign(new Error('Suggestion not found'), { statusCode: 404, code: 'suggestion_not_found' });
  const nextState = {
    ...(session.activity_state || {}),
    pendingSuggestions: nextSuggestions,
    layoutDraft: acceptedRelationship
      ? mergeLayoutDraft(session.activity_state?.layoutDraft || {}, { relationships: [...nextRelationships, acceptedRelationship] })
      : session.activity_state?.layoutDraft || {},
    hasUnsavedConfirmedChanges: status === 'accepted' ? true : session.activity_state?.hasUnsavedConfirmedChanges
  };
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
  for (const [partId, layout] of Object.entries(layoutDraft.nodes)) {
    await assertPartBelongsToClient(session.client_id, partId);
    await sql`
      UPDATE ifs_parts
      SET x = COALESCE(${layout.x ?? null}, x), y = COALESCE(${layout.y ?? null}, y), color = COALESCE(${layout.color || null}, color), updated_at = CURRENT_TIMESTAMP
      WHERE client_id = ${session.client_id} AND id = ${partId}
    `;
    savedPartIds.push(partId);
  }


  const savedRelationshipIds = [];
  for (const relationship of layoutDraft.relationships.filter((item) => item.status === 'accepted' || !item.status)) {
    await assertPartBelongsToClient(session.client_id, relationship.fromPartId);
    await assertPartBelongsToClient(session.client_id, relationship.toPartId);
    await sql`
      INSERT INTO ifs_part_relationships (client_id, from_part_id, to_part_id, relationship_type, label, description, created_by, confirmed_by_client, created_at, updated_at)
      VALUES (${session.client_id}, ${relationship.fromPartId}, ${relationship.toPartId}, ${relationship.relationshipType || 'unknown'}, ${relationship.label || null}, NULL, ${session.client_id}, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
      ON CONFLICT (client_id, from_part_id, to_part_id, relationship_type)
      DO UPDATE SET label = EXCLUDED.label,
                    confirmed_by_client = true,
                    updated_at = CURRENT_TIMESTAMP
      RETURNING id
    `.then((rows) => {
      if (rows[0]?.id) savedRelationshipIds.push(rows[0].id);
    });
  }

  const nextSuggestions = suggestions.map((item) => item.status === 'accepted' ? { ...item, savedAt: new Date().toISOString() } : item).filter((item) => item.status === 'pending');
  const nextState = { ...state, pendingSuggestions: nextSuggestions, layoutDraft: { nodes: {}, relationships: layoutDraft.relationships }, hasUnsavedConfirmedChanges: false, lastSavedAt: new Date().toISOString() };
  const rows = await sql`
    UPDATE ifs_live_sessions
    SET activity_state = ${JSON.stringify(nextState)}::jsonb,
        client_last_seen_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
    WHERE id = ${session.id}
    RETURNING *
  `;
  await recordEvent(rows[0], 'prompt_sent', { eventName: 'map_saved', savedPartCount: Array.from(new Set(savedPartIds)).length, savedRelationshipCount: Array.from(new Set(savedRelationshipIds)).length });
  return publicSession(rows[0]);
}

async function updateSharedMap(user, body) {
  const session = await getSession(requireUuid(body.sessionId, 'sessionId'));
  await assertCanAccessSession(user, session);
  ensureSharedMapActivity(session);
  if (session.status === 'ended') throw Object.assign(new Error('Live session has ended'), { statusCode: 400, code: 'session_ended' });
  const actor = user.user_role === 'client' ? 'client' : 'advisor';
  const nextState = applySharedMapUpdate(session.activity_state || {}, body.mapUpdate || {}, actor);
  const rows = await sql`
    UPDATE ifs_live_sessions
    SET activity_state = ${JSON.stringify(nextState)}::jsonb,
        updated_at = CURRENT_TIMESTAMP,
        therapist_last_seen_at = CASE WHEN ${actor === 'advisor'} THEN CURRENT_TIMESTAMP ELSE therapist_last_seen_at END,
        client_last_seen_at = CASE WHEN ${actor === 'client'} THEN CURRENT_TIMESTAMP ELSE client_last_seen_at END
    WHERE id = ${session.id}
    RETURNING *
  `;
  await recordEvent(rows[0], 'prompt_sent', { eventName: 'map_node_updated', actor, nodeCount: nextState.map.nodes.length });
  return publicSession(rows[0]);
}

async function selectMapNode(user, body) {
  const session = await getSession(requireUuid(body.sessionId, 'sessionId'));
  await assertCanAccessSession(user, session);
  ensureSharedMapActivity(session);
  const nodeId = body.nodeId ? sanitizeSharedMapLocalId(body.nodeId) : null;
  const state = normalizeSharedMapState(session.activity_state || {});
  if (nodeId && !state.map.nodes.some((node) => node.localId === nodeId)) {
    throw Object.assign(new Error('Selected map node was not found'), { statusCode: 404, code: 'map_node_not_found' });
  }
  const nextState = { ...state, selectedNodeId: nodeId, selectedAt: new Date().toISOString(), lastAction: 'part_selected' };
  const rows = await sql`
    UPDATE ifs_live_sessions
    SET activity_state = ${JSON.stringify(nextState)}::jsonb, updated_at = CURRENT_TIMESTAMP
    WHERE id = ${session.id}
    RETURNING *
  `;
  await recordEvent(rows[0], 'prompt_sent', { eventName: 'map_node_selected', nodeId });
  return publicSession(rows[0]);
}

async function confirmMapNode(user, body) {
  const session = await getSession(requireUuid(body.sessionId, 'sessionId'));
  await assertCanAccessSession(user, session);
  ensureSharedMapActivity(session);
  if (user.user_role !== 'client' || String(user.id) !== String(session.client_id)) {
    throw Object.assign(new Error('Client confirmation is required'), { statusCode: 403, code: 'client_confirmation_required' });
  }
  const nodeId = sanitizeSharedMapLocalId(body.nodeId);
  const state = normalizeSharedMapState(session.activity_state || {});
  let found = false;
  const nodes = state.map.nodes.map((node) => {
    if (node.localId !== nodeId) return node;
    found = true;
    return { ...node, clientConfirmed: true, status: 'client_confirmed', confirmedAt: new Date().toISOString(), updatedAt: new Date().toISOString() };
  });
  if (!found) throw Object.assign(new Error('Map node was not found'), { statusCode: 404, code: 'map_node_not_found' });
  const nextState = { ...state, map: { nodes, edges: [] }, selectedNodeId: nodeId, lastAction: 'part_confirmed', updatedAt: new Date().toISOString() };
  const rows = await sql`
    UPDATE ifs_live_sessions
    SET activity_state = ${JSON.stringify(nextState)}::jsonb,
        client_last_seen_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
    WHERE id = ${session.id}
    RETURNING *
  `;
  await recordEvent(rows[0], 'prompt_sent', { eventName: 'map_node_confirmed', nodeId });
  return publicSession(rows[0]);
}

async function removeMapNode(user, body) {
  const session = await getSession(requireUuid(body.sessionId, 'sessionId'));
  await assertCanAccessSession(user, session);
  ensureSharedMapActivity(session);
  const actor = user.user_role === 'client' ? 'client' : 'advisor';
  const nodeId = sanitizeSharedMapLocalId(body.nodeId);
  const state = normalizeSharedMapState(session.activity_state || {});
  const node = state.map.nodes.find((item) => item.localId === nodeId);
  if (!node) throw Object.assign(new Error('Map node was not found'), { statusCode: 404, code: 'map_node_not_found' });
  if (node.clientConfirmed && actor !== 'client' && !isAdminUser(user)) {
    throw Object.assign(new Error('Confirmed parts can only be removed by the client'), { statusCode: 403, code: 'client_confirmation_required' });
  }
  if (!node.clientConfirmed && actor === 'advisor' && node.createdBy !== 'advisor' && !isAdminUser(user)) {
    throw Object.assign(new Error('Advisor can only remove Advisor-created draft parts'), { statusCode: 403, code: 'map_node_remove_denied' });
  }
  const nodes = state.map.nodes.filter((item) => item.localId !== nodeId);
  const nextState = { ...state, map: { nodes, edges: [] }, selectedNodeId: state.selectedNodeId === nodeId ? null : state.selectedNodeId, lastAction: 'part_removed', updatedAt: new Date().toISOString() };
  const rows = await sql`
    UPDATE ifs_live_sessions
    SET activity_state = ${JSON.stringify(nextState)}::jsonb,
        updated_at = CURRENT_TIMESTAMP,
        therapist_last_seen_at = CASE WHEN ${actor === 'advisor'} THEN CURRENT_TIMESTAMP ELSE therapist_last_seen_at END,
        client_last_seen_at = CASE WHEN ${actor === 'client'} THEN CURRENT_TIMESTAMP ELSE client_last_seen_at END
    WHERE id = ${session.id}
    RETURNING *
  `;
  await recordEvent(rows[0], 'prompt_sent', { eventName: 'map_node_removed', nodeId, actor });
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
      update_map_node_position: () => updateMapNodePosition(user, body),
      suggest_part: () => suggestPart(user, body),
      suggest_relationship: () => suggestPart(user, { ...body, suggestion: { ...(body.suggestion || body), suggestionType: 'relationship' } }),
      accept_suggestion: () => updateSuggestionStatus(user, body, 'accepted'),
      dismiss_suggestion: () => updateSuggestionStatus(user, body, 'dismissed'),
      accept_relationship: () => updateSuggestionStatus(user, body, 'accepted'),
      dismiss_relationship: () => updateSuggestionStatus(user, body, 'dismissed'),
      save_confirmed_map: () => saveConfirmedMap(user, body),
      update_shared_map: () => updateSharedMap(user, body),
      select_map_node: () => selectMapNode(user, body),
      confirm_map_node: () => confirmMapNode(user, body),
      remove_map_node: () => removeMapNode(user, body),
      end_session: () => endSession(user, body),
      heartbeat: () => heartbeat(user, body)
    };

    const data = await handlers[action]();
    return res.status(200).json({ data });
  } catch (error) {
    return sendError(res, error.statusCode || 500, error.message || 'Live session request failed', error.code || 'server_error');
  }
}
