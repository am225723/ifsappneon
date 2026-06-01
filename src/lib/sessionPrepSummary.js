async function getAuthToken() {
  try {
    const clerk = window.Clerk;
    if (clerk?.session?.getToken) return await clerk.session.getToken();
  } catch (error) {
    console.warn('Unable to read Clerk token:', error);
  }
  return null;
}

function normalizeApiError(response, payload) {
  const apiError = payload?.error;
  const code = apiError?.code || (response.status === 401 ? 'unauthorized' : response.status === 403 ? 'forbidden' : 'server_error');
  const fallbackMessage = response.status === 401
    ? 'Please sign in again to generate an AI prep summary.'
    : response.status === 403
      ? 'You are not authorized to generate an AI prep summary for this client.'
      : 'Unable to generate AI prep summary.';

  return {
    code,
    status: response.status,
    message: apiError?.message || fallbackMessage
  };
}

export async function generateSessionPrepSummary({ clientId, rangeDays = 7 } = {}) {
  if (!clientId) {
    return { data: null, error: { code: 'missing_client_id', message: 'Select a client before generating an AI prep summary.' } };
  }

  const token = await getAuthToken();
  const response = await fetch('/api/ai-session-summary', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {})
    },
    body: JSON.stringify({ clientId, rangeDays })
  });

  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    return { data: null, error: normalizeApiError(response, payload) };
  }

  return { data: payload.data || null, error: null };
}
