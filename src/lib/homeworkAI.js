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
  return new Error(apiError?.message || `AI request failed (${response.status}). Please try again.`);
}

async function requestPracticeDraft(body) {
  const token = await getAuthToken();
  const response = await fetch('/api/ai-assigned-practice', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {})
    },
    body: JSON.stringify(body)
  });

  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw normalizeApiError(response, payload);
  return payload?.data?.result;
}

async function generateHomework({ clientId, woundType, secondaryWound, category, guidance, clientName }) {
  return requestPracticeDraft({
    mode: 'single',
    clientId,
    woundType,
    secondaryWound,
    category,
    guidance,
    clientName
  });
}

async function generateHomeworkBatch({ clientId, woundType, secondaryWound, guidance, clientName, count = 4 }) {
  return requestPracticeDraft({
    mode: 'batch',
    clientId,
    woundType,
    secondaryWound,
    guidance,
    clientName,
    count
  });
}

export { generateHomework, generateHomeworkBatch };
