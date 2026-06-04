export const INTERACTIVE_RESULT_LABELS = {
  assessment_wounds: 'Wound Patterns Assessment',
  assessment_parts: 'Parts System Assessment',
  'assessment_self-energy': 'Self-Energy Assessment',
  assessment_attachment: 'Attachment Pattern Assessment',
  parts_map: 'Inner System Map',
  'module-1-intro-ifs': 'Module 1: Introduction to IFS',
  'module-2-inner-child-wounds': 'Module 2: Inner Child Wounds',
  'module-3-protectors-unlocked': 'Module 3: Protectors Unlocked'
};

export const INTERACTIVE_ASSESSMENT_CATEGORIES = {
  assessment_wounds: 'wound',
  assessment_parts: 'parts',
  'assessment_self-energy': 'self-energy',
  assessment_attachment: 'attachment'
};

const CATEGORY_LABELS = {
  wound: 'Wound',
  parts: 'Parts',
  'self-energy': 'Self-Energy',
  attachment: 'Attachment'
};

function humanizeModuleId(moduleId = '') {
  return String(moduleId)
    .replace(/^assessment_/, '')
    .replace(/^module-/, 'Module ')
    .replace(/[-_]+/g, ' ')
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

export function getInteractiveResultLabel(moduleId) {
  return INTERACTIVE_RESULT_LABELS[moduleId] || humanizeModuleId(moduleId);
}

export function getInteractiveResultCategory(moduleId) {
  if (INTERACTIVE_ASSESSMENT_CATEGORIES[moduleId]) return INTERACTIVE_ASSESSMENT_CATEGORIES[moduleId];
  if (String(moduleId || '').startsWith('module-')) return 'curriculum';
  if (moduleId === 'parts_map') return 'parts-map';
  return 'interactive';
}

export function isInteractiveAssessmentModule(moduleId) {
  return String(moduleId || '').startsWith('assessment_');
}

export function isCurriculumInteractiveModule(moduleId) {
  return String(moduleId || '').startsWith('module-');
}

export function displayInteractiveValue(value) {
  if (!value) return null;
  if (typeof value === 'string') return value;
  if (typeof value === 'number') return String(value);
  if (Array.isArray(value)) return value.map(displayInteractiveValue).filter(Boolean).join(', ');
  return value.name || value.label || value.id || value.type || null;
}

function summarizeRanked(ranked) {
  if (!ranked) return null;
  const values = Array.isArray(ranked) ? ranked : Object.entries(ranked).map(([key, value]) => ({ key, value }));
  const labels = values
    .slice(0, 3)
    .map((item) => displayInteractiveValue(item) || displayInteractiveValue(item?.key))
    .filter(Boolean);
  if (!labels.length) return null;
  return `Top themes: ${labels.join(', ')}`;
}

export function normalizeJson(value) {
  if (!value) return null;
  if (typeof value === 'object') return value;
  if (typeof value === 'string') {
    try { return JSON.parse(value); } catch { return null; }
  }
  return null;
}

export function normalizeInteractiveResult(row) {
  const moduleId = row?.module_id || row?.moduleId || '';
  const data = normalizeJson(row?.data) || {};
  const category = getInteractiveResultCategory(moduleId);
  const primary = displayInteractiveValue(data.primary);
  const secondary = displayInteractiveValue(data.secondary);
  const completedAt = data.completedAt || data.completed_at || row?.updated_at || row?.created_at || null;
  const summaryParts = [];

  if (primary) summaryParts.push(`Primary: ${primary}`);
  if (secondary) summaryParts.push(`Secondary: ${secondary}`);
  const rankedSummary = summarizeRanked(data.ranked || data.rankings || data.results);
  if (rankedSummary) summaryParts.push(rankedSummary);

  return {
    id: row?.id,
    clientId: row?.client_id || row?.clientId,
    moduleId,
    label: getInteractiveResultLabel(moduleId),
    category,
    categoryLabel: CATEGORY_LABELS[category] || humanizeModuleId(category),
    primary,
    secondary,
    completedAt,
    updatedAt: row?.updated_at || null,
    summary: summaryParts.join(' • '),
    data
  };
}

export function summarizeInteractiveInsights(results = []) {
  return results
    .filter((result) => result?.primary || result?.secondary)
    .map((result) => {
      const values = [result.primary, result.secondary].filter(Boolean).join(' / ');
      return values ? `${result.categoryLabel}: ${values}` : null;
    })
    .filter(Boolean);
}

export function getPartsMapParts(partsMapRow) {
  const data = normalizeJson(partsMapRow?.data);
  const parts = data?.parts;
  return Array.isArray(parts) ? parts : [];
}
