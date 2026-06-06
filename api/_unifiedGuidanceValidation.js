import { UNIFIED_GUIDANCE_DISCLAIMER } from './_unifiedGuidancePrompt.js';

export const ALLOWED_ACTION_ROUTES = [
  '/curriculum',
  '/life-integration',
  '/life-integration/notice-part',
  '/life-integration/return-to-self',
  '/life-integration/trigger-reflection',
  '/parts-relationships',
  '/parts-dialogue',
  '/journal',
  '/tools',
  '/meditation',
  '/assigned-practices'
];

const PRIORITY_LOOPS = new Set(['momentum', 'reactive', 'relational', 'collaborative', 'integration']);
const PAYLOAD_FORMATS = new Set(['shortcode', 'blocks', 'text']);
const PROHIBITED_PATTERNS = [/risk score:\s*\d/i, /medication recommendation/i, /emergency conclusion/i, /diagnosis:\s*[^,}"]+/i];

function capString(value, max = 700) {
  const text = value === null || value === undefined ? '' : String(value).replace(/\s+/g, ' ').trim();
  return text.length > max ? `${text.slice(0, max)}…` : text;
}

function safeArray(value, max = 8) {
  return Array.isArray(value) ? value.map((item) => capString(item, 260)).filter(Boolean).slice(0, max) : [];
}

function isAllowedRoute(route) {
  if (!route || typeof route !== 'string') return false;
  if (/^https?:\/\//i.test(route) || route.includes('/medication') || route.includes('/admin') || route.includes('/therapist')) return false;
  if (ALLOWED_ACTION_ROUTES.includes(route)) return true;
  return /^\/curriculum\/module\/[A-Za-z0-9_-]+$/.test(route);
}

export function fallbackNextBestStep(reason = 'Continue your curriculum to unlock more personalized guidance.') {
  return {
    title: 'Continue Your IFS Path',
    description: 'The curriculum is the main spine of your IFS path. Continuing with the next module may be the most helpful step right now.',
    reason,
    action_route: '/curriculum',
    priority_loop: 'momentum',
    estimated_time: '10–20 minutes',
    supporting_signals: ['Safe fallback when personalized guidance is unavailable.'],
    interactive_payload: {
      format: 'blocks',
      content: '',
      blocks: [
        { type: 'instruction', text: 'Before you continue, take one slow breath and notice which part of you is most present.' },
        { type: 'textarea', id: 'next_step_reflection', prompt: 'What would feel like a kind next step in your IFS Path today?' }
      ]
    }
  };
}

export function fallbackAdvisorSnapshot(clientId, reason = 'Available data is limited or the AI output could not be validated.') {
  return {
    client_id: clientId || '',
    snapshot_title: 'Advisor Session Snapshot',
    advisor_review_disclaimer: UNIFIED_GUIDANCE_DISCLAIMER,
    curriculum_trajectory: { active_module: 'Available data is limited', percent_complete: 0, recent_response_synthesis: reason },
    parts_and_inner_system_themes: { active_parts_or_protectors: [], relationship_patterns: [], possible_polarizations_to_explore: [] },
    assessment_and_self_energy_themes: { assessment_patterns: [], self_energy_strengths: [], self_energy_growth_edges: [] },
    life_integration_themes: { recent_daily_life_patterns: [], triggers_needs_or_boundaries: [] },
    assigned_practice_status: 'Review current assigned IFS practice status in the client workspace.',
    ai_generated_review_themes: ['Use this sparse snapshot only as a prompt for Advisor review.'],
    suggested_session_questions: ['What feels most important to explore in your IFS Path today?'],
    attention_items_for_advisor: ['Clarify recent app activity and client priorities directly.'],
    what_not_to_overinterpret: ['Do not treat sparse app data as a conclusion about the client inner system.']
  };
}

function parseJson(text) {
  if (!text) return null;
  if (typeof text === 'object') return text;
  const fenced = String(text).match(/```json\s*([\s\S]*?)```/i)?.[1];
  const candidate = fenced || String(text).trim();
  try { return JSON.parse(candidate); } catch { return null; }
}

function containsProhibited(value) {
  const serialized = JSON.stringify(value || {});
  return PROHIBITED_PATTERNS.some((pattern) => pattern.test(serialized));
}

function normalizeInteractivePayload(payload = {}) {
  const format = PAYLOAD_FORMATS.has(payload?.format) ? payload.format : 'blocks';
  return {
    format,
    content: capString(payload?.content, 2500),
    blocks: Array.isArray(payload?.blocks) ? payload.blocks.slice(0, 20) : []
  };
}

function normalizeNextBestStep(step, fallbackReason) {
  if (!step || typeof step !== 'object') return fallbackNextBestStep(fallbackReason);
  const route = isAllowedRoute(step.action_route) ? step.action_route : '/curriculum';
  return {
    title: capString(step.title, 120) || 'Continue Your IFS Path',
    description: capString(step.description, 500) || 'Continue with the next supportive step in your IFS Path.',
    reason: capString(step.reason, 500) || fallbackReason,
    action_route: route,
    priority_loop: PRIORITY_LOOPS.has(step.priority_loop) ? step.priority_loop : 'momentum',
    estimated_time: capString(step.estimated_time, 80) || '10–20 minutes',
    supporting_signals: safeArray(step.supporting_signals, 6),
    interactive_payload: normalizeInteractivePayload(step.interactive_payload)
  };
}

function normalizeSnapshot(snapshot, clientId) {
  const base = fallbackAdvisorSnapshot(clientId);
  if (!snapshot || typeof snapshot !== 'object') return base;
  return {
    client_id: capString(snapshot.client_id || clientId, 80),
    snapshot_title: capString(snapshot.snapshot_title, 140) || base.snapshot_title,
    advisor_review_disclaimer: UNIFIED_GUIDANCE_DISCLAIMER,
    curriculum_trajectory: {
      active_module: capString(snapshot.curriculum_trajectory?.active_module, 180),
      percent_complete: Math.max(0, Math.min(100, Number(snapshot.curriculum_trajectory?.percent_complete) || 0)),
      recent_response_synthesis: capString(snapshot.curriculum_trajectory?.recent_response_synthesis, 700)
    },
    parts_and_inner_system_themes: {
      active_parts_or_protectors: safeArray(snapshot.parts_and_inner_system_themes?.active_parts_or_protectors),
      relationship_patterns: safeArray(snapshot.parts_and_inner_system_themes?.relationship_patterns),
      possible_polarizations_to_explore: safeArray(snapshot.parts_and_inner_system_themes?.possible_polarizations_to_explore)
    },
    assessment_and_self_energy_themes: {
      assessment_patterns: safeArray(snapshot.assessment_and_self_energy_themes?.assessment_patterns),
      self_energy_strengths: safeArray(snapshot.assessment_and_self_energy_themes?.self_energy_strengths),
      self_energy_growth_edges: safeArray(snapshot.assessment_and_self_energy_themes?.self_energy_growth_edges)
    },
    life_integration_themes: {
      recent_daily_life_patterns: safeArray(snapshot.life_integration_themes?.recent_daily_life_patterns),
      triggers_needs_or_boundaries: safeArray(snapshot.life_integration_themes?.triggers_needs_or_boundaries)
    },
    assigned_practice_status: capString(snapshot.assigned_practice_status, 500),
    ai_generated_review_themes: safeArray(snapshot.ai_generated_review_themes),
    suggested_session_questions: safeArray(snapshot.suggested_session_questions),
    attention_items_for_advisor: safeArray(snapshot.attention_items_for_advisor),
    what_not_to_overinterpret: safeArray(snapshot.what_not_to_overinterpret)
  };
}

export function validateUnifiedGuidance({ rawText, mode, clientId }) {
  const parsed = parseJson(rawText);
  if (!parsed || containsProhibited(parsed)) {
    return {
      next_best_step: mode !== 'advisor_snapshot' ? fallbackNextBestStep('The generated guidance could not be validated safely.') : undefined,
      advisor_session_snapshot: mode !== 'client_next_step' ? fallbackAdvisorSnapshot(clientId, 'The generated snapshot could not be validated safely.') : undefined,
      validation_fallback: true
    };
  }
  return {
    next_best_step: mode !== 'advisor_snapshot' ? normalizeNextBestStep(parsed.next_best_step, 'Based on available app activity.') : undefined,
    advisor_session_snapshot: mode !== 'client_next_step' ? normalizeSnapshot(parsed.advisor_session_snapshot, clientId) : undefined,
    validation_fallback: false
  };
}
