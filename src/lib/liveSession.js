const LIVE_SESSION_API_PATH = '/api/live-session';

async function getAuthToken() {
  try {
    const clerk = window.Clerk;
    if (clerk?.session?.getToken) return await clerk.session.getToken();
  } catch (error) {
    console.warn('Unable to read Clerk token:', error);
  }
  return null;
}

export async function liveSessionRequest(payload) {
  const token = await getAuthToken();
  const response = await fetch(LIVE_SESSION_API_PATH, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {})
    },
    body: JSON.stringify(payload)
  });

  const json = await response.json().catch(() => ({}));
  if (!response.ok) {
    const message = json.error?.message || response.statusText || 'Live session request failed';
    const accessMessage = response.status === 401
      ? 'Please sign in again to access live guided practice.'
      : response.status === 403
        ? 'You do not have access to this live guided practice session.'
        : message;
    return { data: null, error: { ...(json.error || {}), status: response.status, message: accessMessage } };
  }

  return { data: json.data, error: null };
}

export function startLiveSession({ clientId }) {
  return liveSessionRequest({ action: 'start_session', clientId });
}

export function getLiveSessionState({ sessionId }) {
  return liveSessionRequest({ action: 'get_state', sessionId });
}

export function getActiveLiveSessionForClient() {
  return liveSessionRequest({ action: 'get_active_for_client' });
}

export function startLiveActivity({ sessionId, activity = 'guided_breathing', activityState = {} }) {
  return liveSessionRequest({ action: 'start_activity', sessionId, activity, activityState });
}

export function pauseLiveActivity({ sessionId }) {
  return liveSessionRequest({ action: 'pause_activity', sessionId });
}

export function resumeLiveActivity({ sessionId }) {
  return liveSessionRequest({ action: 'resume_activity', sessionId });
}

export function endLiveActivity({ sessionId }) {
  return liveSessionRequest({ action: 'end_activity', sessionId });
}

export function sendLivePrompt({ sessionId, prompt }) {
  return liveSessionRequest({ action: 'send_prompt', sessionId, prompt });
}

export function setLiveActivityStep({ sessionId, currentStep }) {
  return liveSessionRequest({ action: 'set_activity_step', sessionId, currentStep });
}

export function nextLiveActivityStep({ sessionId }) {
  return liveSessionRequest({ action: 'next_step', sessionId });
}

export function previousLiveActivityStep({ sessionId }) {
  return liveSessionRequest({ action: 'previous_step', sessionId });
}

export function endLiveSession({ sessionId }) {
  return liveSessionRequest({ action: 'end_session', sessionId });
}

export function heartbeatLiveSession({ sessionId, role }) {
  return liveSessionRequest({ action: 'heartbeat', sessionId, role });
}

export function updateSharedPartsMap({ sessionId, mapUpdate }) {
  return liveSessionRequest({ action: 'update_shared_map', sessionId, mapUpdate });
}

export function selectSharedMapNode({ sessionId, nodeId }) {
  return liveSessionRequest({ action: 'select_map_node', sessionId, nodeId });
}

export function confirmSharedMapNode({ sessionId, nodeId }) {
  return liveSessionRequest({ action: 'confirm_map_node', sessionId, nodeId });
}


export function saveConfirmedMapNode({ sessionId, nodeId }) {
  return liveSessionRequest({ action: 'save_confirmed_map_node', sessionId, nodeId });
}

export function removeSharedMapNode({ sessionId, nodeId }) {
  return liveSessionRequest({ action: 'remove_map_node', sessionId, nodeId });
}
