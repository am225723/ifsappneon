import { UNIFIED_GUIDANCE_DISCLAIMER } from './_unifiedGuidancePrompt.js';

export const ALLOWED_ACTION_ROUTES = [
  '/curriculum',
  '/life-integration',
  '/life-integration/notice-part',
  '/life-integration/return-to-self',
  '/life-integration/trigger-reflection',
  '/life-integration/repair-after-conflict',
  '/life-integration/protector-check-in',
  '/life-integration/needs-boundaries',
  '/parts-relationships',
  '/parts-dialogue',
  '/journal',
  '/tools',
  '/meditation',
  '/assigned-practices',
  '/homework'
];

const PRIORITY_LOOPS = new Set(['momentum', 'reactive', 'relational', 'collaborative', 'integration']);
const PAYLOAD_FORMATS = new Set(['shortcode', 'blocks', 'text']);
const PROHIBITED_PATTERNS = [
  /risk score\s*:?\s*\d*/i,
  /medication recommendation/i,
  /emergency conclusion/i,
  /clinical conclusion/i,
  /diagnosis\s*:?\s*[^,}"]*/i,
  /patient monitoring/i,
  /treatment compliance/i
];

function capString(value, max = 700) {
  const text = value === null || value === undefined ? '' : String(value).replace(/\s+/g, ' ').trim();
  return text.length > max ? `${text.slice(0, max)}…` : text;
}

function safeArray(value, max = 8) {
  let items = value;
  if (typeof items === 'string') {
    try {
      const parsed = JSON.parse(items);
      items = Array.isArray(parsed) ? parsed : items.split(/[;\n]/);
    } catch {
      items = items.split(/[;\n]/);
    }
  }
  return Array.isArray(items) ? items.map((item) => capString(item, 260)).filter(Boolean).slice(0, max) : [];
}

function isAllowedRoute(route) {
  if (!route || typeof route !== 'string') return false;
  const normalized = route.trim();
  const lower = normalized.toLowerCase();
  if (!normalized.startsWith('/') || normalized.startsWith('//')) return false;
  if (/^(https?:|javascript:|data:|vbscript:)/i.test(normalized)) return false;
  if (lower.includes('/medication') || lower.includes('/medications') || lower.includes('/medication-management')) return false;
  if (lower.startsWith('/admin') || lower.startsWith('/therapist') || lower.startsWith('/advisor')) return false;
  if (lower.startsWith('/reports') || lower.startsWith('/analytics') || lower.startsWith('/longitudinal-analytics')) return false;
  if (ALLOWED_ACTION_ROUTES.includes(normalized)) return true;
  return /^\/curriculum\/module\/[A-Za-z0-9_-]+$/.test(normalized);
}

export function fallbackNextBestStep(reason = 'The guidance engine could not generate a personalized step right now, so the curriculum is the safest place to continue.') {
  return {
    title: 'Continue Your IFS Curriculum',
    description: 'Return to the main guided path and continue from your current module.',
    reason,
    action_route: '/curriculum',
    priority_loop: 'momentum',
    estimated_time: '10–20 minutes',
    supporting_signals: ['Curriculum remains the main IFS path.'],
    interactive_payload: {
      format: 'text',
      content: 'Take one slow breath, open your current module, and notice one part that responds to today’s lesson.',
      blocks: []
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
  const source = String(text).trim();
  const fenced = source.match(/```(?:json)?\s*([\s\S]*?)```/i)?.[1];
  const candidate = (fenced || source).trim();
  try { return JSON.parse(candidate); } catch {
    const firstBrace = candidate.indexOf('{');
    const lastBrace = candidate.lastIndexOf('}');
    if (firstBrace >= 0 && lastBrace > firstBrace) {
      try { return JSON.parse(candidate.slice(firstBrace, lastBrace + 1)); } catch { return null; }
    }
    return null;
  }
}

function containsProhibited(value) {
  let serialized = JSON.stringify(value || {});
  serialized = serialized
    .replaceAll(UNIFIED_GUIDANCE_DISCLAIMER, '')
    .replace(/not a diagnosis(?:, risk assessment,)? or clinical conclusion/gi, '')
    .replace(/not a diagnosis or conclusion/gi, '')
    .replace(/not a clinical conclusion/gi, '')
    .replace(/not a diagnosis/gi, '');
  return PROHIBITED_PATTERNS.some((pattern) => pattern.test(serialized));
}

function normalizeBlocks(value) {
  let blocks = value;
  if (typeof blocks === 'string') {
    try { blocks = JSON.parse(blocks); } catch { blocks = []; }
  }
  if (!Array.isArray(blocks)) return [];
  return blocks
    .filter((block) => block && typeof block === 'object')
    .slice(0, 20)
    .map((block, index) => ({ ...block, id: capString(block.id || `block_${index + 1}`, 80) }));
}

function normalizeInteractivePayload(payload = {}) {
  const format = PAYLOAD_FORMATS.has(payload?.format) ? payload.format : 'text';
  return {
    format,
    content: capString(payload?.content, 2500),
    blocks: normalizeBlocks(payload?.blocks)
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
