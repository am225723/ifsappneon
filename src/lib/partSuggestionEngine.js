import { getPartsMapParts } from './interactiveResults';

const ASSESSMENT_LABELS = {
  assessment_wounds: 'Wound Patterns Assessment',
  assessment_parts: 'Parts System Assessment',
  'assessment_self-energy': 'Self-Energy Assessment',
  assessment_attachment: 'Attachment Pattern Assessment'
};

const KEYWORD_PARTS = [
  { re: /\b(fear|afraid|scared|anxious|panic|worry)\b/i, name: 'Fearful Part', type: 'exile', role: 'Carries fear or worry that may need gentle attention.', color: '#f8e9b8' },
  { re: /\b(shame|embarrass|humiliat|not good enough)\b/i, name: 'Part carrying shame', type: 'exile', role: 'Carries shame or not-good-enough feelings.', color: '#f8e9b8' },
  { re: /\b(boundary|boundaries|no\b|protect my space|needs?\b)\b/i, name: 'Boundary Protector', type: 'protector', role: 'Helps protect needs, limits, and space.', color: '#dfeadd' },
  { re: /\b(trigger|activated|reactive|overwhelmed)\b/i, name: 'Triggered Protector', type: 'protector', role: 'Gets activated around triggers or overwhelm.', color: '#dfeadd' },
  { re: /\b(numb|escape|avoid|shut down|shutdown|distract)\b/i, name: 'Firefighter Part', type: 'firefighter', role: 'May try to reduce pain quickly through escape, numbing, or distraction.', color: '#f8dfd2' },
  { re: /\b(control|perfect|planner|organize|responsible|monitor)\b/i, name: 'Manager Part', type: 'manager', role: 'Tries to keep life organized, controlled, or acceptable.', color: '#dcebdc' }
];

export function normalizePartSuggestionName(value) {
  return String(value || '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
}

function textFrom(value, depth = 0) {
  if (!value || depth > 3) return '';
  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') return String(value);
  if (Array.isArray(value)) return value.map((item) => textFrom(item, depth + 1)).join(' ');
  if (typeof value === 'object') return Object.entries(value)
    .filter(([key]) => !/^(id|client_id|created_at|updated_at|clerk|email|name)$/i.test(key))
    .map(([, item]) => textFrom(item, depth + 1))
    .join(' ');
  return '';
}

function hasSignal(data, words) {
  const text = textFrom(data).toLowerCase();
  return words.some((word) => text.includes(word));
}

function addSuggestion(map, suggestion, existingParts = []) {
  const normalized = normalizePartSuggestionName(suggestion.name);
  if (!normalized) return;
  const duplicate = existingParts.some((part) => normalizePartSuggestionName(part.part_name || part.name) === normalized)
    || existingParts.some((part) => String(part.part_type || part.type || '').toLowerCase() === suggestion.type && normalizePartSuggestionName(part.role) === normalizePartSuggestionName(suggestion.role));
  if (duplicate) return;
  const key = `${normalized}:${suggestion.type}:${suggestion.sourceId || suggestion.source}`;
  if (!map.has(key)) map.set(key, { id: key, confidence: 'possible signal', ...suggestion });
}

function addFromAssessment(map, row, existingParts) {
  const moduleId = row.module_id || row.moduleId;
  const data = row.data || row;
  const sourceLabel = ASSESSMENT_LABELS[moduleId] || 'Assessment';
  if (moduleId === 'assessment_wounds') {
    if (hasSignal(data, ['shame'])) addSuggestion(map, { name: 'Part carrying shame', type: 'exile', role: 'Carries shame that may be connected to an old wound.', source: 'assessment', sourceId: moduleId, sourceLabel, confidence: 'strong signal', evidenceSummary: 'Shame appeared as a wound-pattern signal.', color: '#f8e9b8', relatedPattern: 'shame' }, existingParts);
    if (hasSignal(data, ['abandon', 'rejection', 'rejected'])) addSuggestion(map, { name: 'Rejection Wound Protector', type: 'protector', role: 'Works to prevent rejection or abandonment pain.', source: 'assessment', sourceId: moduleId, sourceLabel, confidence: 'strong signal', evidenceSummary: 'Rejection or abandonment appeared in wound-pattern responses.', color: '#dfeadd', relatedPattern: 'rejection' }, existingParts);
  }
  if (moduleId === 'assessment_attachment') {
    if (hasSignal(data, ['avoidant'])) addSuggestion(map, { name: 'Distance Protector', type: 'protector', role: 'Creates distance to protect vulnerable feelings.', source: 'assessment', sourceId: moduleId, sourceLabel, confidence: 'strong signal', evidenceSummary: 'Avoidant attachment signals suggest a distance-creating protector.', color: '#dfeadd', relatedPattern: 'avoidant attachment' }, existingParts);
    if (hasSignal(data, ['anxious'])) addSuggestion(map, { name: 'Reassurance-Seeking Part', type: 'protector', role: 'Seeks closeness or reassurance when connection feels uncertain.', source: 'assessment', sourceId: moduleId, sourceLabel, confidence: 'strong signal', evidenceSummary: 'Anxious attachment signals suggest a reassurance-seeking part.', color: '#dfeadd', relatedPattern: 'anxious attachment' }, existingParts);
    if (hasSignal(data, ['disorganized', 'fearful'])) addSuggestion(map, { name: 'Push-Pull Protector', type: 'protector', role: 'Moves between wanting closeness and needing distance.', source: 'assessment', sourceId: moduleId, sourceLabel, confidence: 'strong signal', evidenceSummary: 'Push-pull attachment signals appeared in responses.', color: '#dfeadd', relatedPattern: 'disorganized attachment' }, existingParts);
  }
  if (moduleId === 'assessment_parts') {
    if (hasSignal(data, ['manager'])) addSuggestion(map, { name: 'Manager Part', type: 'manager', role: 'Tries to organize, prevent mistakes, or keep things under control.', source: 'assessment', sourceId: moduleId, sourceLabel, confidence: 'strong signal', evidenceSummary: 'Manager energy appeared in the Parts System Assessment.', color: '#dcebdc' }, existingParts);
    if (hasSignal(data, ['firefighter'])) addSuggestion(map, { name: 'Firefighter Part', type: 'firefighter', role: 'Responds quickly when vulnerable feelings become intense.', source: 'assessment', sourceId: moduleId, sourceLabel, confidence: 'strong signal', evidenceSummary: 'Firefighter energy appeared in the Parts System Assessment.', color: '#f8dfd2' }, existingParts);
  }
  if (moduleId === 'assessment_self-energy' && hasSignal(data, ['self', 'calm', 'clarity', 'compassion'])) {
    addSuggestion(map, { name: 'Self', type: 'self', role: 'Center of calm, curious, compassionate Self-energy.', source: 'assessment', sourceId: moduleId, sourceLabel, confidence: 'strong signal', evidenceSummary: 'Self-energy qualities appeared in assessment responses.', color: '#f7e2a0' }, existingParts);
  }
}

function addKeywordSuggestions(map, source, existingParts) {
  const text = textFrom(source.data || source).slice(0, 6000);
  KEYWORD_PARTS.forEach((rule) => {
    if (rule.re.test(text)) addSuggestion(map, { ...rule, source: source.source || 'reflection', sourceId: source.id || source.module_id || source.moduleId, sourceLabel: source.sourceLabel || 'Reflection', confidence: 'possible signal', evidenceSummary: `${rule.name.replace('Part', 'part')} language appeared in a short reflection summary.` }, existingParts);
  });
}

function addLegacyParts(map, legacyRow, existingParts) {
  getPartsMapParts(legacyRow).forEach((part) => addSuggestion(map, {
    name: part.name || part.part_name,
    type: String(part.type || part.part_type || 'unknown').toLowerCase(),
    role: part.role || part.description || 'Imported from an older saved Parts Map.',
    source: 'legacy_parts_map',
    sourceId: part.id || legacyRow?.id || 'parts_map',
    sourceLabel: 'Older saved Parts Map',
    confidence: 'strong signal',
    evidenceSummary: 'This part was found in your older saved Parts Map.',
    color: part.color,
    legacyPartId: part.id
  }, existingParts));
}

export function buildPartSuggestions({ assessmentRows = [], interactiveRows = [], curriculumReflectionRows = [], lifeIntegrationRows = [], journalRows = [], legacyPartsMap = null, existingParts = [], existingRelationships = [] } = {}) {
  const suggestions = new Map();
  [...assessmentRows, ...interactiveRows.filter((row) => String(row.module_id || '').startsWith('assessment_'))].forEach((row) => addFromAssessment(suggestions, row, existingParts));
  interactiveRows.filter((row) => String(row.module_id || '').startsWith('module')).forEach((row) => {
    addKeywordSuggestions(suggestions, { ...row, source: 'module', sourceLabel: 'Curriculum module response' }, existingParts);
    const reflections = Array.isArray(row.data?.curriculumReflections) ? row.data.curriculumReflections : [];
    reflections.forEach((reflection, index) => addKeywordSuggestions(suggestions, { id: `${row.module_id}:reflection:${index}`, data: reflection, source: 'curriculum_reflection', sourceLabel: 'Curriculum reflection' }, existingParts));
    if (row.data?.latestCurriculumReflection) addKeywordSuggestions(suggestions, { id: `${row.module_id}:latestCurriculumReflection`, data: row.data.latestCurriculumReflection, source: 'curriculum_reflection', sourceLabel: 'Latest curriculum reflection' }, existingParts);
  });
  curriculumReflectionRows.forEach((row) => addKeywordSuggestions(suggestions, { ...row, source: 'curriculum_reflection', sourceLabel: 'Curriculum reflection' }, existingParts));
  lifeIntegrationRows.forEach((row) => addKeywordSuggestions(suggestions, { ...row, source: 'life_integration', sourceLabel: 'Life Integration reflection' }, existingParts));
  journalRows.forEach((row) => addKeywordSuggestions(suggestions, { ...row, source: 'journal', sourceLabel: 'Journal entry' }, existingParts));
  if (legacyPartsMap) addLegacyParts(suggestions, legacyPartsMap, existingParts);

  const parts = Array.from(suggestions.values()).slice(0, 24);
  const relationshipSuggestions = [];
  const names = new Set(parts.map((part) => part.name));
  const existingRelKeys = new Set(existingRelationships.map((rel) => `${rel.from_part_id}:${rel.relationship_type}:${rel.to_part_id}`));
  const pushRel = (fromName, toName, relationshipType, label, source = 'suggestion') => {
    if (!names.has(fromName) || !names.has(toName) || fromName === toName) return;
    const key = `${fromName}:${relationshipType}:${toName}`;
    if (existingRelKeys.has(key) || relationshipSuggestions.some((rel) => rel.id === key)) return;
    relationshipSuggestions.push({ id: key, fromName, toName, relationshipType, label, source, confidence: 'possible signal', evidenceSummary: `${fromName} may ${label.toLowerCase()} ${toName}.` });
  };
  parts.filter((p) => p.type !== 'self').forEach((part) => pushRel('Self', part.name, 'supports', 'supports', part.source));
  pushRel('Manager Part', 'Part carrying shame', 'protects', 'protects', 'assessment');
  pushRel('Firefighter Part', 'Part carrying shame', 'concerned_about', 'reacts to', 'assessment');
  pushRel('Distance Protector', 'Part carrying shame', 'needs_space_from', 'needs space from', 'assessment');
  pushRel('Boundary Protector', 'Triggered Protector', 'protects', 'protects', 'life_integration');
  return { parts, relationships: relationshipSuggestions.slice(0, 12) };
}
