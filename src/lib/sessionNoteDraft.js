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
    ? 'Please sign in again before generating an Advisor note draft.'
    : response.status === 403
      ? 'You are not authorized to draft an Advisor note for this client.'
      : code === 'openai_api_key_missing'
        ? 'OpenAI API key missing. Ask an administrator to configure OPENAI_API_KEY on the server.'
        : 'Unable to generate Advisor note draft.';

  return {
    code,
    status: response.status,
    message: apiError?.message || fallbackMessage
  };
}

export async function generateSessionNoteDraft({
  clientId,
  sessionDate,
  advisorBullets = '',
  includeAgenda = true,
  includeAssignedPractices = true,
  includeGrowthGoals = true,
  includeSharedLifeReflections = true,
  includeParts = true,
  includeRecentMood = true
} = {}) {
  if (!clientId) {
    return { data: null, error: { code: 'missing_client_id', message: 'Select an assigned client before generating an Advisor note draft.' } };
  }

  const token = await getAuthToken();
  const response = await fetch('/api/ai-session-note-draft', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {})
    },
    body: JSON.stringify({
      clientId,
      sessionDate,
      advisorBullets,
      includeAgenda,
      includeAssignedPractices,
      includeGrowthGoals,
      includeSharedLifeReflections,
      includeParts,
      includeRecentMood
    })
  });

  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    return { data: null, error: normalizeApiError(response, payload) };
  }

  return { data: payload.data || null, error: null };
}
