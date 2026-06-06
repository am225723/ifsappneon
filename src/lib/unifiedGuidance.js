const API_PATH = '/api/ai-unified-guidance';
const CACHE_TTL_MS = 10 * 60 * 1000;

async function getClerkToken() {
  const clerk = typeof window !== 'undefined' ? window.Clerk : null;
  if (clerk?.session?.getToken) return await clerk.session.getToken();
  return null;
}

function cacheKey(clientId) {
  return `ifs_next_best_step:${clientId}`;
}

function readCachedNextStep(clientId) {
  if (typeof window === 'undefined' || !clientId) return null;
  try {
    const cached = JSON.parse(window.sessionStorage.getItem(cacheKey(clientId)) || 'null');
    if (!cached?.timestamp || Date.now() - cached.timestamp > CACHE_TTL_MS) return null;
    return cached.data;
  } catch {
    return null;
  }
}

function writeCachedNextStep(clientId, data) {
  if (typeof window === 'undefined' || !clientId || !data) return;
  try { window.sessionStorage.setItem(cacheKey(clientId), JSON.stringify({ timestamp: Date.now(), data })); } catch { /* session cache is optional */ }
}

export async function loadNextBestStep({ clientId, force = false } = {}) {
  if (!clientId) throw new Error('clientId is required');
  if (!force) {
    const cached = readCachedNextStep(clientId);
    if (cached) return { ...cached, cached: true };
  }
  const token = await getClerkToken();
  const response = await fetch(API_PATH, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: JSON.stringify({ clientId, mode: 'client_next_step', includeInteractivePayload: true, rangeDays: 30 })
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(payload?.error?.message || 'Unable to generate your Next Best Step.');
  writeCachedNextStep(clientId, payload.data);
  return payload.data;
}

export async function loadAdvisorSessionSnapshot({ clientId, rangeDays = 30 } = {}) {
  if (!clientId) throw new Error('clientId is required');
  const token = await getClerkToken();
  const response = await fetch(API_PATH, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: JSON.stringify({ clientId, mode: 'advisor_snapshot', includeInteractivePayload: true, rangeDays })
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(payload?.error?.message || 'Unable to generate Advisor Session Snapshot.');
  return payload.data;
}
