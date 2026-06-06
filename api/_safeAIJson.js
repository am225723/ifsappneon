const ACTIVITY_BLOCK_TYPES = new Set([
  'instruction', 'question', 'textarea', 'checklist', 'rating', 'virtual_paper',
  'sort', 'sorting', 'match', 'matching', 'body_map', 'zone_map', 'blank',
  'slider', 'timeline', 'focus_card'
]);

function stripMarkdownFence(text) {
  return String(text || '').trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim();
}

function findBalancedJson(source, startIndex) {
  const open = source[startIndex];
  const close = open === '{' ? '}' : ']';
  let depth = 0;
  let inString = false;
  let escaped = false;
  for (let index = startIndex; index < source.length; index += 1) {
    const char = source[index];
    if (inString) {
      if (escaped) escaped = false;
      else if (char === '\\') escaped = true;
      else if (char === '"') inString = false;
      continue;
    }
    if (char === '"') inString = true;
    else if (char === open) depth += 1;
    else if (char === close) {
      depth -= 1;
      if (depth === 0) return source.slice(startIndex, index + 1);
    }
  }
  return '';
}

export function extractJsonFromAIText(text) {
  if (text == null) return '';
  if (typeof text === 'object') return text;
  const source = String(text).trim();
  if (!source) return '';
  const fenced = source.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fenced?.[1]) {
    const candidate = stripMarkdownFence(fenced[1]);
    if (candidate.startsWith('{') || candidate.startsWith('[')) return candidate;
  }
  const boundary = source.match(/ACTIVITY_BLOCKS_JSON\s*:\s*([\s\S]*)/i);
  const search = boundary?.[1] || source;
  const firstObject = search.indexOf('{');
  const firstArray = search.indexOf('[');
  const start = firstObject === -1 ? firstArray : firstArray === -1 ? firstObject : Math.min(firstObject, firstArray);
  if (start === -1) return '';
  return findBalancedJson(search, start) || stripMarkdownFence(search.slice(start));
}

export function safeParseAIJson(textOrObject, fallback = null) {
  if (textOrObject == null || textOrObject === '') return fallback;
  if (typeof textOrObject === 'object') return textOrObject;
  const candidate = extractJsonFromAIText(textOrObject);
  if (!candidate) return fallback;
  try {
    return JSON.parse(candidate);
  } catch {
    return fallback;
  }
}

function parseStringValue(value) {
  if (typeof value !== 'string') return value;
  const trimmed = value.trim();
  if (!trimmed) return value;
  if (trimmed.startsWith('{') || trimmed.startsWith('[') || /^```/.test(trimmed)) return safeParseAIJson(trimmed, value);
  return value;
}

function normalizeBlock(raw, index) {
  const block = parseStringValue(raw);
  if (!block || typeof block !== 'object' || Array.isArray(block)) return null;
  const type = String(block.type || block.widgetType || 'instruction').replace(/^sort$/, 'sorting').replace(/^match$/, 'matching');
  if (!ACTIVITY_BLOCK_TYPES.has(type)) return null;
  return { ...block, type, id: String(block.id || block.widgetId || `${type}_${index + 1}`) };
}

export function normalizeActivityBlocks(value) {
  const parsed = parseStringValue(value);
  const source = Array.isArray(parsed) ? parsed : Array.isArray(parsed?.activity_blocks) ? parsed.activity_blocks : Array.isArray(parsed?.activityBlocks) ? parsed.activityBlocks : Array.isArray(parsed?.blocks) ? parsed.blocks : [];
  return source.map(normalizeBlock).filter(Boolean);
}

export function splitDescriptionAndActivityBlocks(text) {
  const source = String(text || '');
  const match = source.match(/\n?ACTIVITY_BLOCKS_JSON\s*:/i);
  if (!match) return { description: source.trim(), activityBlocks: [] };
  return { description: source.slice(0, match.index).trim(), activityBlocks: normalizeActivityBlocks(source.slice(match.index + match[0].length)) };
}
