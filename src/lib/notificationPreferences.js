const NOTIFICATION_PREFERENCES_API_PATH = '/api/notification-preferences';

async function getAuthToken() {
  try {
    const clerk = window.Clerk;
    if (clerk?.session?.getToken) return await clerk.session.getToken();
  } catch (error) {
    console.warn('Unable to read Clerk token:', error);
  }
  return null;
}

async function notificationPreferencesRequest(payload) {
  const token = await getAuthToken();
  const response = await fetch(NOTIFICATION_PREFERENCES_API_PATH, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {})
    },
    body: JSON.stringify(payload)
  });

  const json = await response.json().catch(() => ({}));
  if (!response.ok) {
    const fallbackMessage = response.status === 401
      ? 'Please sign in to manage notification preferences.'
      : response.status === 403
        ? 'You can only manage your own notification preferences.'
        : response.statusText || 'Notification preferences request failed';
    return { data: null, error: json.error || { code: 'notification_preferences_error', message: fallbackMessage } };
  }
  return { data: json.data, error: null };
}

export function loadNotificationPreferences() {
  return notificationPreferencesRequest({ action: 'get' });
}

export function updateNotificationPreferences(preferences) {
  return notificationPreferencesRequest({ action: 'update', preferences });
}
