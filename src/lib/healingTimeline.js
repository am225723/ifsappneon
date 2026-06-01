async function getAuthToken() {
  try {
    const clerk = window.Clerk;
    if (clerk?.session?.getToken) return await clerk.session.getToken();
  } catch (error) {
    console.warn('Unable to read Clerk token for healing timeline:', error);
  }
  return null;
}

export async function loadHealingTimeline({ clientId, range = 'ALL' } = {}) {
  if (!clientId) {
    return { data: null, error: 'Sign in to view your healing timeline.' };
  }

  try {
    const token = await getAuthToken();
    const response = await fetch('/api/healing-timeline/client', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {})
      },
      body: JSON.stringify({ clientId, range })
    });

    const json = await response.json().catch(() => ({}));

    if (!response.ok) {
      if (response.status === 401) return { data: null, error: 'Please sign in again to view your healing timeline.' };
      if (response.status === 403) return { data: null, error: 'You do not have permission to view this healing timeline.' };
      return { data: null, error: json.error || 'Unable to load your healing timeline.' };
    }

    return { data: json.data || null, error: null };
  } catch (error) {
    return { data: null, error: error.message || 'Unable to load your healing timeline.' };
  }
}
