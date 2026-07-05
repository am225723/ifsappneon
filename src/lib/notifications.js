import { getClerkBearerToken, missingAuthResponse } from './apiAuth';

const NOTIFICATIONS_API_PATH = '/api/notifications';

async function getAuthToken() {
  return getClerkBearerToken();
}

async function notificationsRequest(payload) {
  const token = await getAuthToken();
  if (!token) {
    return missingAuthResponse('Unable to reach your secure session yet. Please wait a moment and try again.');
  }

  let response;
  try {
    response = await fetch(NOTIFICATIONS_API_PATH, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify(payload)
    });
  } catch (error) {
    return { data: null, error: { message: error.message || 'Network request failed', status: 0 } };
  }

  const json = await response.json().catch(() => ({}));
  if (!response.ok) {
    const message = typeof json.error === 'string'
      ? json.error
      : json.error?.message || response.statusText || 'Notification request failed';
    return { data: null, error: { message, status: response.status } };
  }
  return { data: json.data, error: null };
}

export function loadNotifications({ includeArchived = false, limit = 50, filter = 'all' } = {}) {
  return notificationsRequest({ action: 'list', includeArchived, limit, filter });
}

export function loadUnreadNotificationCount() {
  return notificationsRequest({ action: 'unread_count' });
}

export function markNotificationRead(notificationId) {
  return notificationsRequest({ action: 'mark_read', notificationId });
}

export function markAllNotificationsRead() {
  return notificationsRequest({ action: 'mark_all_read' });
}

export function archiveNotification(notificationId) {
  return notificationsRequest({ action: 'archive', notificationId });
}

export function createNotification(payload) {
  return notificationsRequest({ action: 'create', payload });
}
