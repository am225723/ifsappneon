import { clientAuth } from './supabasePersonalization';

function getRestrictions() {
  const client = clientAuth.getCurrentClient();
  if (!client) return null;
  return client.access_restrictions;
}

export function canAccessModule(moduleId) {
  const r = getRestrictions();
  if (!r) return true;
  if (!r.modules) return true;
  return r.modules.includes(moduleId);
}

export function canAccessAssessment(assessmentId) {
  const r = getRestrictions();
  if (!r) return true;
  if (!r.assessments) return true;
  return r.assessments.includes(assessmentId);
}

export function canAccessFeature(featureName) {
  const r = getRestrictions();
  if (!r) return true;
  if (!r.features) return true;
  return r.features[featureName] !== false;
}

export function hasFullAccess() {
  return getRestrictions() === null;
}
