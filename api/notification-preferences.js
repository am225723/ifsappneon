import { getCurrentAppUserFromClerk } from './_auth.js';
import { ensureNotificationPreferences, updateNotificationPreferences } from './_notificationPreferences.js';

const ACTIONS = new Set(['get', 'update']);

function sendError(res, status, message, code = 'notification_preferences_error') {
  return res.status(status).json({ error: { code, message } });
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return sendError(res, 405, 'Method not allowed', 'method_not_allowed');
  }

  try {
    const user = await getCurrentAppUserFromClerk(req);
    if (!user?.id) return sendError(res, 401, 'Authentication required', 'unauthorized');

    const body = req.body || {};
    const action = String(body.action || '');
    if (!ACTIONS.has(action)) return sendError(res, 400, 'Unsupported notification preference action', 'unsupported_action');

    if (action === 'get') {
      const preferences = await ensureNotificationPreferences(user.id);
      return res.status(200).json({ data: preferences });
    }

    const preferences = await updateNotificationPreferences(user.id, body.preferences || {});
    return res.status(200).json({ data: preferences });
  } catch (error) {
    return sendError(res, error.statusCode || 500, error.message || 'Notification preferences request failed', error.code || 'server_error');
  }
}
