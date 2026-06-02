const NOTIFICATIONS_API_PATH = '/api/notifications';

async function getAuthToken() {
  try {
    const clerk = window.Clerk;
    if (clerk?.session?.getToken) return await clerk.session.getToken();
  } catch (error) {
    console.warn('Unable to read Clerk token:', error);
  }
  return null;
}

async function notificationsRequest(payload) {
  const token = await getAuthToken();
  const response = await fetch(NOTIFICATIONS_API_PATH, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {})
    },
    body: JSON.stringify(payload)
  });

  const json = await response.json().catch(() => ({}));
  if (!response.ok) {
    return { data: null, error: json.error || { message: response.statusText || 'Notification request failed' } };
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
