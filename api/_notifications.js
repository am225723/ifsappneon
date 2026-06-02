import { sql } from './_auth.js';
import { shouldCreateNotification } from './_notificationPreferences.js';

const ALLOWED_NOTIFICATION_TYPES = new Set([
  'homework_assigned',
  'homework_started',
  'homework_completed',
  'homework_reviewed',
  'session_agenda_submitted',
  'session_agenda_reviewed',
  'treatment_goal_created',
  'treatment_goal_updated',
  'treatment_goal_completed',
  'live_session_started',
  'live_session_joined',
  'live_session_ended',
  'report_generated',
  'therapist_note_created',
  'general_update'
]);

const ALLOWED_PRIORITIES = new Set(['low', 'normal', 'important']);
const MAX_TITLE_LENGTH = 255;
const MAX_MESSAGE_LENGTH = 300;
const MAX_ENTITY_TYPE_LENGTH = 100;

function normalizeUuid(value) {
  return value ? String(value) : null;
}

function compactString(value, maxLength) {
  if (value === null || value === undefined) return null;
  const compacted = String(value).replace(/\s+/g, ' ').trim();
  if (!compacted) return null;
  return compacted.slice(0, maxLength);
}

function compactMetadata(metadata = {}) {
  if (!metadata || typeof metadata !== 'object' || Array.isArray(metadata)) return {};
  const safe = {};
  Object.entries(metadata).slice(0, 12).forEach(([key, value]) => {
    const safeKey = compactString(key, 60);
    if (!safeKey) return;
    if (value === null || ['string', 'number', 'boolean'].includes(typeof value)) {
      safe[safeKey] = typeof value === 'string' ? compactString(value, 160) : value;
    }
  });
  return safe;
}

export async function createInAppNotification({
  recipientId,
  actorId = null,
  clientId = null,
  therapistId = null,
  notificationType = 'general_update',
  title,
  message = null,
  entityType = null,
  entityId = null,
  priority = 'normal',
  metadata = {}
}) {
  const safeRecipientId = normalizeUuid(recipientId);
  const safeTitle = compactString(title, MAX_TITLE_LENGTH);
  const safeType = ALLOWED_NOTIFICATION_TYPES.has(notificationType) ? notificationType : 'general_update';
  const safePriority = ALLOWED_PRIORITIES.has(priority) ? priority : 'normal';

  if (!safeRecipientId || !safeTitle) {
    throw Object.assign(new Error('recipientId and title are required for notifications'), { statusCode: 400 });
  }

  const allowedByPreferences = await shouldCreateNotification({
    recipientId: safeRecipientId,
    notificationType: safeType,
    priority: safePriority
  });
  if (!allowedByPreferences) return null;

  const rows = await sql`
    INSERT INTO ifs_notifications (
      recipient_id, actor_id, client_id, therapist_id, notification_type, title, message,
      entity_type, entity_id, priority, metadata
    ) VALUES (
      ${safeRecipientId}, ${normalizeUuid(actorId)}, ${normalizeUuid(clientId)}, ${normalizeUuid(therapistId)},
      ${safeType}, ${safeTitle}, ${compactString(message, MAX_MESSAGE_LENGTH)},
      ${compactString(entityType, MAX_ENTITY_TYPE_LENGTH)}, ${normalizeUuid(entityId)}, ${safePriority},
      ${JSON.stringify(compactMetadata(metadata))}::jsonb
    )
    RETURNING *
  `;
  return rows[0] || null;
}

export async function safeCreateInAppNotification(payload, logLabel = 'notification') {
  try {
    return await createInAppNotification(payload);
  } catch (error) {
    console.error(`Failed to create ${logLabel}:`, error);
    return null;
  }
}
