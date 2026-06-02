import { getCurrentAppUserFromClerk, isAdminUser, isTherapistUser, requireTherapistAssignment, sql } from './_auth.js';
import { createInAppNotification } from './_notifications.js';

const ACTIONS = new Set(['list', 'unread_count', 'mark_read', 'mark_all_read', 'archive', 'create']);
const MAX_LIMIT = 100;
const CLIENT_CONTEXT_TYPES = new Set([
  'homework_completed',
  'session_agenda_submitted',
  'live_session_joined',
  'report_generated',
  'therapist_note_created'
]);

function sendError(res, status, message, code = 'notifications_error') {
  return res.status(status).json({ error: { code, message } });
}

function requireUuid(value, label) {
  if (!value || !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{12}$/i.test(String(value))) {
    throw Object.assign(new Error(`${label} must be a valid UUID`), { statusCode: 400, code: 'invalid_uuid' });
  }
  return String(value);
}

async function listNotifications(user, body) {
  const includeArchived = Boolean(body.includeArchived || body.filter === 'archived');
  const onlyUnread = body.filter === 'unread';
  const limit = Math.min(Math.max(Number(body.limit) || 50, 1), MAX_LIMIT);

  const rows = await sql.query(`
    SELECT n.*,
      actor.name AS actor_name,
      related_client.name AS client_name,
      related_therapist.name AS therapist_name
    FROM ifs_notifications n
    LEFT JOIN ifs_clients actor ON actor.id = n.actor_id
    LEFT JOIN ifs_clients related_client ON related_client.id = n.client_id
    LEFT JOIN ifs_clients related_therapist ON related_therapist.id = n.therapist_id
    WHERE n.recipient_id = $1
      AND ($2::boolean OR n.archived_at IS NULL)
      AND ($3::boolean IS FALSE OR n.read_at IS NULL)
      AND ($4::boolean IS FALSE OR n.archived_at IS NOT NULL)
    ORDER BY n.created_at DESC
    LIMIT $5
  `, [user.id, includeArchived, onlyUnread, body.filter === 'archived', limit]);

  if (isTherapistUser(user) && !isAdminUser(user)) {
    const clientIds = [...new Set(rows.map((row) => row.client_id).filter(Boolean).map(String))];
    for (const clientId of clientIds) await requireTherapistAssignment(user.id, clientId);
  }

  return rows;
}

async function unreadCount(user) {
  const rows = await sql`
    SELECT COUNT(*)::int AS unread_count
    FROM ifs_notifications
    WHERE recipient_id = ${user.id}
      AND read_at IS NULL
      AND archived_at IS NULL
  `;
  return rows[0]?.unread_count || 0;
}

async function markRead(user, body) {
  const notificationId = requireUuid(body.notificationId, 'notificationId');
  const rows = await sql`
    UPDATE ifs_notifications
    SET read_at = COALESCE(read_at, CURRENT_TIMESTAMP), updated_at = CURRENT_TIMESTAMP
    WHERE id = ${notificationId}
      AND recipient_id = ${user.id}
    RETURNING *
  `;
  if (!rows[0]) throw Object.assign(new Error('Notification not found'), { statusCode: 404, code: 'not_found' });
  return rows[0];
}

async function markAllRead(user) {
  const rows = await sql`
    UPDATE ifs_notifications
    SET read_at = COALESCE(read_at, CURRENT_TIMESTAMP), updated_at = CURRENT_TIMESTAMP
    WHERE recipient_id = ${user.id}
      AND read_at IS NULL
      AND archived_at IS NULL
    RETURNING id
  `;
  return { updated: rows.length };
}

async function archiveNotification(user, body) {
  const notificationId = requireUuid(body.notificationId, 'notificationId');
  const rows = await sql`
    UPDATE ifs_notifications
    SET archived_at = COALESCE(archived_at, CURRENT_TIMESTAMP), updated_at = CURRENT_TIMESTAMP
    WHERE id = ${notificationId}
      AND recipient_id = ${user.id}
    RETURNING *
  `;
  if (!rows[0]) throw Object.assign(new Error('Notification not found'), { statusCode: 404, code: 'not_found' });
  return rows[0];
}

async function createAuthorizedNotification(user, body) {
  if (!isTherapistUser(user)) {
    throw Object.assign(new Error('Clients cannot create arbitrary notifications'), { statusCode: 403, code: 'forbidden' });
  }

  const payload = body.payload || {};
  const clientId = requireUuid(payload.clientId, 'clientId');
  if (!isAdminUser(user)) await requireTherapistAssignment(user.id, clientId);
  const recipientId = requireUuid(payload.recipientId, 'recipientId');
  if (String(recipientId) !== String(clientId) && !CLIENT_CONTEXT_TYPES.has(payload.notificationType)) {
    throw Object.assign(new Error('Therapists may only create client-safe notifications for assigned clients'), { statusCode: 403, code: 'forbidden' });
  }

  return createInAppNotification({
    ...payload,
    actorId: user.id,
    therapistId: payload.therapistId || user.id,
    clientId
  });
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
    if (!ACTIONS.has(action)) return sendError(res, 400, 'Unsupported notification action', 'unsupported_action');

    const handlers = {
      list: () => listNotifications(user, body),
      unread_count: () => unreadCount(user),
      mark_read: () => markRead(user, body),
      mark_all_read: () => markAllRead(user),
      archive: () => archiveNotification(user, body),
      create: () => createAuthorizedNotification(user, body)
    };

    const data = await handlers[action]();
    return res.status(200).json({ data });
  } catch (error) {
    return sendError(res, error.statusCode || 500, error.message || 'Notification request failed', error.code || 'server_error');
  }
}
