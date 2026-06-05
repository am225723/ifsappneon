import { sql } from './_auth.js';

export const DEFAULT_NOTIFICATION_TIMEZONE = 'America/New_York';

export const NOTIFICATION_CATEGORY_BY_TYPE = {
  homework_assigned: 'homework',
  homework_started: 'homework',
  homework_completed: 'homework',
  homework_reviewed: 'homework',
  session_agenda_submitted: 'session_agenda',
  session_agenda_reviewed: 'session_agenda',
  treatment_goal_created: 'treatment_plan',
  treatment_goal_updated: 'treatment_plan',
  treatment_goal_completed: 'treatment_plan',
  live_session_started: 'live_session',
  live_session_joined: 'live_session',
  live_session_ended: 'live_session',
  report_generated: 'report',
  therapist_note_created: 'therapist_note_activity',
  general_update: 'general_updates'
};

export const ALLOWED_NOTIFICATION_PREFERENCE_FIELDS = new Set([
  'in_app_enabled',
  'quiet_hours_enabled',
  'quiet_hours_start',
  'quiet_hours_end',
  'timezone',
  'allow_important_during_quiet_hours',
  'allow_live_session_during_quiet_hours',
  'homework_enabled',
  'session_agenda_enabled',
  'treatment_plan_enabled',
  'live_session_enabled',
  'report_enabled',
  'therapist_note_activity_enabled',
  'general_updates_enabled'
]);

const BOOLEAN_FIELDS = new Set([
  'in_app_enabled',
  'quiet_hours_enabled',
  'allow_important_during_quiet_hours',
  'allow_live_session_during_quiet_hours',
  'homework_enabled',
  'session_agenda_enabled',
  'treatment_plan_enabled',
  'live_session_enabled',
  'report_enabled',
  'therapist_note_activity_enabled',
  'general_updates_enabled'
]);

const TIME_FIELDS = new Set(['quiet_hours_start', 'quiet_hours_end']);

const DEFAULT_NOTIFICATION_PREFERENCES = Object.freeze({
  in_app_enabled: true,
  quiet_hours_enabled: false,
  quiet_hours_start: null,
  quiet_hours_end: null,
  timezone: DEFAULT_NOTIFICATION_TIMEZONE,
  allow_important_during_quiet_hours: true,
  allow_live_session_during_quiet_hours: true,
  homework_enabled: true,
  session_agenda_enabled: true,
  treatment_plan_enabled: true,
  live_session_enabled: true,
  report_enabled: true,
  therapist_note_activity_enabled: true,
  general_updates_enabled: true
});

function normalizeUuid(value) {
  return value ? String(value) : null;
}

function normalizeTime(value, field) {
  if (value === null || value === '') return null;
  const text = String(value).trim();
  const match = text.match(/^(\d{1,2}):(\d{2})(?::\d{2})?$/);
  if (!match) throw Object.assign(new Error(`${field} must be a valid HH:mm time`), { statusCode: 400, code: 'invalid_time' });
  const hour = Number(match[1]);
  const minute = Number(match[2]);
  if (hour > 23 || minute > 59) throw Object.assign(new Error(`${field} must be a valid HH:mm time`), { statusCode: 400, code: 'invalid_time' });
  return `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
}

function normalizeTimezone(value) {
  const timezone = String(value || DEFAULT_NOTIFICATION_TIMEZONE).trim().slice(0, 100) || DEFAULT_NOTIFICATION_TIMEZONE;
  try {
    new Intl.DateTimeFormat('en-US', { timeZone: timezone }).format(new Date());
    return timezone;
  } catch {
    return DEFAULT_NOTIFICATION_TIMEZONE;
  }
}

function sanitizePreferenceUpdates(updates = {}) {
  if (!updates || typeof updates !== 'object' || Array.isArray(updates)) {
    throw Object.assign(new Error('preferences must be an object'), { statusCode: 400, code: 'invalid_preferences' });
  }

  return Object.entries(updates).reduce((safe, [key, value]) => {
    if (!ALLOWED_NOTIFICATION_PREFERENCE_FIELDS.has(key)) return safe;
    if (BOOLEAN_FIELDS.has(key)) safe[key] = value === true;
    else if (TIME_FIELDS.has(key)) safe[key] = normalizeTime(value, key);
    else if (key === 'timezone') safe[key] = normalizeTimezone(value);
    return safe;
  }, {});
}

function withDefaultPreferences(row) {
  return {
    ...DEFAULT_NOTIFICATION_PREFERENCES,
    ...(row || {}),
    timezone: normalizeTimezone(row?.timezone || DEFAULT_NOTIFICATION_TIMEZONE)
  };
}

function rowToPreferences(row) {
  return row ? withDefaultPreferences(row) : withDefaultPreferences(null);
}

function timeToMinutes(value) {
  if (!value) return null;
  const match = String(value).match(/^(\d{1,2}):(\d{2})/);
  if (!match) return null;
  const hour = Number(match[1]);
  const minute = Number(match[2]);
  if (hour > 23 || minute > 59) return null;
  return hour * 60 + minute;
}

function localMinutesFor(now, timezone) {
  const safeTimezone = normalizeTimezone(timezone);
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: safeTimezone,
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  }).formatToParts(now || new Date());
  const hour = Number(parts.find((part) => part.type === 'hour')?.value || 0) % 24;
  const minute = Number(parts.find((part) => part.type === 'minute')?.value || 0);
  return hour * 60 + minute;
}

export function isWithinQuietHours({ now = new Date(), start, end, timezone = DEFAULT_NOTIFICATION_TIMEZONE }) {
  const startMinutes = timeToMinutes(start);
  const endMinutes = timeToMinutes(end);
  if (startMinutes === null || endMinutes === null || startMinutes === endMinutes) return false;

  const currentMinutes = localMinutesFor(now, timezone);
  if (startMinutes < endMinutes) return currentMinutes >= startMinutes && currentMinutes < endMinutes;
  return currentMinutes >= startMinutes || currentMinutes < endMinutes;
}

export async function getNotificationPreferences(userId) {
  const safeUserId = normalizeUuid(userId);
  if (!safeUserId) throw Object.assign(new Error('userId is required'), { statusCode: 400, code: 'missing_user_id' });

  const rows = await sql`
    SELECT *
    FROM ifs_notification_preferences
    WHERE user_id = ${safeUserId}
    LIMIT 1
  `;
  return rowToPreferences(rows[0] || null);
}

export async function ensureNotificationPreferences(userId) {
  const safeUserId = normalizeUuid(userId);
  if (!safeUserId) throw Object.assign(new Error('userId is required'), { statusCode: 400, code: 'missing_user_id' });

  const rows = await sql`
    INSERT INTO ifs_notification_preferences (user_id)
    VALUES (${safeUserId})
    ON CONFLICT (user_id) DO UPDATE
      SET updated_at = ifs_notification_preferences.updated_at
    RETURNING *
  `;
  return rowToPreferences(rows[0] || null);
}

export async function updateNotificationPreferences(userId, updates) {
  const safeUserId = normalizeUuid(userId);
  if (!safeUserId) throw Object.assign(new Error('userId is required'), { statusCode: 400, code: 'missing_user_id' });
  const safeUpdates = sanitizePreferenceUpdates(updates);
  await ensureNotificationPreferences(safeUserId);

  if (!Object.keys(safeUpdates).length) return getNotificationPreferences(safeUserId);

  const rows = await sql.query(`
    UPDATE ifs_notification_preferences
    SET ${Object.keys(safeUpdates).map((field, index) => `${field} = $${index + 2}`).join(', ')},
        updated_at = CURRENT_TIMESTAMP
    WHERE user_id = $1
    RETURNING *
  `, [safeUserId, ...Object.values(safeUpdates)]);
  return rowToPreferences(rows[0] || null);
}

export async function shouldCreateNotification({ recipientId, notificationType = 'general_update', priority = 'normal' }) {
  try {
    const preferences = await getNotificationPreferences(recipientId);
    const category = NOTIFICATION_CATEGORY_BY_TYPE[notificationType] || 'general_updates';
    const categoryEnabledField = `${category}_enabled`;
    const isImportant = priority === 'important';
    const isLiveSession = category === 'live_session';

    if (preferences[categoryEnabledField] === false) return false;
    if (preferences.in_app_enabled === false && !isImportant && !isLiveSession) return false;

    if (preferences.quiet_hours_enabled && isWithinQuietHours({
      start: preferences.quiet_hours_start,
      end: preferences.quiet_hours_end,
      timezone: preferences.timezone
    })) {
      if (isLiveSession && preferences.allow_live_session_during_quiet_hours) return true;
      if (isImportant && preferences.allow_important_during_quiet_hours) return true;
      return false;
    }

    return true;
  } catch (error) {
    console.error('Failed to evaluate notification preferences; using safe default create behavior:', error);
    return true;
  }
}
