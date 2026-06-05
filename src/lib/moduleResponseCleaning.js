const MEANINGFUL_SHORT_RESPONSES = new Set([
  'yes', 'no', 'ok', 'fear', 'anger', 'shame', 'sad', 'mad', 'calm', 'joy', 'self',
  'curious', 'compassion', 'clarity', 'courage', 'confidence', 'connected', 'creative', 'presence'
]);

const TRIVIAL_RESPONSES = new Set(['', '.', '..', '...', '-', '--', '—', '_', 'n/a', 'na', 'none', 'null', 'undefined', 'answered']);

function normalizeResponseText(value) {
  if (value === null || value === undefined) return '';
  if (typeof value === 'object') {
    try { return JSON.stringify(value); } catch { return ''; }
  }
  return String(value).replace(/\s+/g, ' ').trim();
}

function isDateTimeOnly(value) {
  const text = normalizeResponseText(value);
  if (!text) return false;
  const date = new Date(text);
  if (!Number.isNaN(date.getTime()) && /^\d{4}-\d{2}-\d{2}|^\d{1,2}\/\d{1,2}\/\d{2,4}|^\w{3}\s\w{3}\s\d{1,2}/.test(text)) return true;
  return /^\d{1,2}:\d{2}(?::\d{2})?\s?(am|pm)?$/i.test(text)
    || /^\d{4}-\d{2}-\d{2}(?:[t\s]\d{2}:\d{2}(?::\d{2}(?:\.\d{1,6})?)?(?:z|[+-]\d{2}:?\d{2})?)?$/i.test(text);
}

export function isMeaningfulModuleResponse(value) {
  const text = normalizeResponseText(value);
  const lower = text.toLowerCase();
  if (TRIVIAL_RESPONSES.has(lower)) return false;
  if (/^[\p{P}\p{S}\s]+$/u.test(text)) return false;
  if (isDateTimeOnly(text)) return false;
  if (text.length === 1 && !MEANINGFUL_SHORT_RESPONSES.has(lower)) return false;
  if (text.length <= 3) return MEANINGFUL_SHORT_RESPONSES.has(lower) || /^[a-z][a-z\s'-]{1,}$/i.test(text);
  return true;
}

function cleanAnswersObject(answers = {}, seenValues) {
  return Object.entries(answers || {}).reduce((acc, [key, value]) => {
    if (!isMeaningfulModuleResponse(value)) return acc;
    const text = normalizeResponseText(value);
    const dedupeKey = isDateTimeOnly(text) ? `timestamp:${text}` : `${key}:${text.toLowerCase()}`;
    if (seenValues.has(dedupeKey)) return acc;
    seenValues.add(dedupeKey);
    acc[key] = value;
    return acc;
  }, {});
}

export function cleanModuleResponses(data = {}) {
  if (Array.isArray(data)) {
    const seenValues = new Set();
    return data.map((item) => {
      const answers = cleanAnswersObject(item?.answers || item?.responses || {}, seenValues);
      return { ...item, answers };
    }).filter((item) => Object.keys(item.answers || {}).length > 0);
  }

  return Object.entries(data || {}).reduce((acc, [moduleId, responses]) => {
    const cleaned = cleanModuleResponses(Array.isArray(responses) ? responses : [responses]);
    if (cleaned.length) acc[moduleId] = cleaned;
    return acc;
  }, {});
}
