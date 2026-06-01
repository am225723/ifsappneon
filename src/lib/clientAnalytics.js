async function getAuthToken() {
  try {
    const clerk = window.Clerk;
    if (clerk?.session?.getToken) return await clerk.session.getToken();
  } catch (error) {
    console.warn('Unable to read Clerk token for analytics:', error);
  }
  return null;
}

export async function loadClientAnalytics({ clientId, range = '3M' } = {}) {
  if (!clientId) {
    return { data: null, error: 'Select an assigned client before loading analytics.' };
  }

  try {
    const token = await getAuthToken();
    const response = await fetch('/api/analytics/client', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {})
      },
      body: JSON.stringify({ clientId, range })
    });

    const json = await response.json().catch(() => ({}));

    if (!response.ok) {
      if (response.status === 401) return { data: null, error: 'Please sign in again to view therapist analytics.' };
      if (response.status === 403) return { data: null, error: 'You do not have permission to view analytics for this client.' };
      return { data: null, error: json.error || 'Unable to load client analytics.' };
    }

    return { data: json.data || null, error: null };
  } catch (error) {
    return { data: null, error: error.message || 'Unable to load client analytics.' };
  }
}
