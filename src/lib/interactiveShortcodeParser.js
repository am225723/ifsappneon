const WIDGET_TAGS = ['SORTING_WIDGET', 'MATCHING_WIDGET', 'BODY_MAP_WIDGET', 'ZONE_MAP_WIDGET', 'BLANK_WIDGET', 'SLIDER_WIDGET', 'TIMELINE_WIDGET', 'FOCUS_CARD'];

function parseAttrs(raw = '') {
  const attrs = {};
  raw.replace(/([\w-]+)=(["'])(.*?)\2/g, (_, key, __, value) => {
    attrs[key] = value;
    return '';
  });
  return attrs;
}

function parseJsonAfter(label, body, fallback = []) {
  const match = body.match(new RegExp(`-\\s*${label}:\\s*([^\\n]+)`, 'i'));
  if (!match) return fallback;
  try { return JSON.parse(match[1].trim()); } catch { return fallback; }
}

function parseQuotedList(label, body, fallback = []) {
  return parseJsonAfter(label, body, fallback);
}

function parseCards(body) {
  return [...body.matchAll(/-\s*CARD:\s*(.*)$/gim)].map((match, index) => {
    const attrs = parseAttrs(match[1]);
    return { id: attrs.id || `card_${index + 1}`, label: attrs.label || `Card ${index + 1}` };
  });
}

function normalizeInputTemplate(body) {
  const segments = [];
  let lastIndex = 0;
  const inputPattern = /\[INPUT:\s*([^\]]*)\]/gi;
  let match;
  while ((match = inputPattern.exec(body))) {
    const before = body.slice(lastIndex, match.index);
    if (before) segments.push({ type: 'text', text: before.replace(/^\s+|\s+$/g, ' ') });
    const attrs = parseAttrs(match[1]);
    segments.push({ type: 'input', placeholder: attrs.placeholder || 'your words' });
    lastIndex = match.index + match[0].length;
  }
  const after = body.slice(lastIndex);
  if (after) segments.push({ type: 'text', text: after.replace(/^\s+|\s+$/g, ' ') });
  return segments.filter((segment) => segment.type === 'input' || segment.text?.trim());
}

function widgetToBlock(tag, attrs, body, index) {
  const id = attrs.id || attrs.part_id || `${tag.toLowerCase()}_${index}`;
  if (tag === 'SORTING_WIDGET') {
    return { type: 'sort', id, label: attrs.title || 'Sort these items', items: parseCards(body), columns: parseQuotedList('COLUMNS', body, []) };
  }
  if (tag === 'MATCHING_WIDGET') {
    return { type: 'match', id, label: attrs.title || 'Match the pairs', left: parseJsonAfter('LEFT_COLUMN', body, []), right: parseJsonAfter('RIGHT_COLUMN', body, []) };
  }
  if (tag === 'BODY_MAP_WIDGET') {
    return { type: 'body_map', id, prompt: attrs.prompt || attrs.title || 'Notice where this part shows up in or around your body.', presets: parseQuotedList('PRESETS', body, []) };
  }
  if (tag === 'ZONE_MAP_WIDGET') {
    return { type: 'zone_map', id, label: attrs.title || 'Map part blending proximity', core: parseJsonAfter('CORE', body, attrs.core || 'Self-energy'), rings: parseQuotedList('RINGS', body, []), nodes: parseQuotedList('NODES', body, []) };
  }
  if (tag === 'BLANK_WIDGET') {
    return { type: 'blank', id, label: attrs.title || 'Fill in the blanks', template: normalizeInputTemplate(body) };
  }
  if (tag === 'SLIDER_WIDGET') {
    const [min = '0', max = '10'] = String(attrs.scale || '0-10').split('-');
    return { type: 'slider', id, label: attrs.title || 'Self-energy sliders', min: Number(min) || 0, max: Number(max) || 10, metrics: parseJsonAfter('METRICS', body, []) };
  }
  if (tag === 'TIMELINE_WIDGET') {
    const prompt = body.match(/-\s*ANCHOR_PROMPT:\s*["']?([^"'\n]+)["']?/i)?.[1] || attrs.prompt || 'Add a timeline anchor.';
    return { type: 'timeline', id, label: attrs.title || 'Healing timeline', range: attrs.range || '0-current_age', prompt };
  }
  if (tag === 'FOCUS_CARD') {
    return { type: 'focus_card', id, part_id: attrs.part_id || '', field: attrs.field || 'core_fear', label: attrs.title || 'Focus card' };
  }
  return null;
}

export function parseInteractiveShortcodes(source) {
  if (!source || typeof source !== 'string') return [];
  const blocks = [];
  WIDGET_TAGS.forEach((tag) => {
    const paired = new RegExp(`\\[${tag}([^\\]]*)\\]([\\s\\S]*?)\\[\\/${tag}\\]`, 'gi');
    let match;
    while ((match = paired.exec(source))) {
      const block = widgetToBlock(tag, parseAttrs(match[1]), match[2], blocks.length + 1);
      if (block) blocks.push(block);
    }
    const selfClosing = new RegExp(`\\[${tag}([^\\]]*)\\s*\\/]`, 'gi');
    while ((match = selfClosing.exec(source))) {
      const block = widgetToBlock(tag, parseAttrs(match[1]), '', blocks.length + 1);
      if (block) blocks.push(block);
    }
  });
  return blocks;
}

export function hasInteractiveShortcodes(source) {
  return typeof source === 'string' && WIDGET_TAGS.some((tag) => source.includes(`[${tag}`));
}
