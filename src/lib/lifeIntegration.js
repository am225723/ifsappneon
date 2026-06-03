const API_PATH = '/api/life-integration';

export const LIFE_REFLECTION_TYPES = {
  notice_part: 'Notice a Part in the Moment',
  return_to_self: 'Return to Self-Energy',
  trigger_reflection: 'Reflect on a Trigger',
  repair_after_conflict: 'Repair After Conflict',
  protector_check_in: 'Protector Check-In',
  needs_boundaries: 'Needs & Boundaries Reflection'
};

async function getAuthToken() {
  const clerk = window.Clerk;
  if (clerk?.session?.getToken) return clerk.session.getToken();
  return null;
}

async function lifeIntegrationRequest(payload) {
  const token = await getAuthToken();
  const response = await fetch(API_PATH, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {})
    },
    body: JSON.stringify(payload)
  });

  const json = await response.json().catch(() => ({}));
  if (!response.ok) {
    const message = json.error || response.statusText || 'Unable to complete Life Integration request.';
    return { data: null, error: { message, status: response.status } };
  }
  return { data: json.data, error: null };
}

export function loadLifeIntegrationReflections({ type, includeArchived = false } = {}) {
  return lifeIntegrationRequest({ action: 'list', type, includeArchived });
}

export function saveLifeIntegrationReflection(payload) {
  return lifeIntegrationRequest({ action: 'create', payload });
}

export function getLifeIntegrationReflection(reflectionId) {
  return lifeIntegrationRequest({ action: 'get_reflection', reflectionId });
}

export function updateLifeIntegrationReflection(reflectionId, updates) {
  return lifeIntegrationRequest({ action: 'update_reflection', reflectionId, updates });
}

export function archiveLifeIntegrationReflection(reflectionId) {
  return lifeIntegrationRequest({ action: 'archive_reflection', reflectionId });
}

export function deleteLifeIntegrationReflection(id) {
  return archiveLifeIntegrationReflection(id);
}

export function shareReflectionWithAdvisor(reflectionId, shared = true) {
  return lifeIntegrationRequest({ action: shared ? 'share_reflection' : 'unshare_reflection', reflectionId });
}

export function loadSharedLifeIntegrationReflectionsForAdvisor(clientId) {
  return lifeIntegrationRequest({ action: 'list_shared_for_advisor', clientId });
}

export function getSharedLifeIntegrationReflectionForAdvisor(reflectionId) {
  return lifeIntegrationRequest({ action: 'get_shared_for_advisor', reflectionId });
}
