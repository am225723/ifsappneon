const WIDGET_TYPES = new Set(['sorting', 'matching', 'body_map', 'zone_map', 'blank', 'slider', 'timeline', 'focus_card', 'virtual_paper', 'textarea', 'checklist', 'rating']);

export function safeJsonValue(value, fallback = {}) {
  if (value == null) return fallback;
  if (typeof value === 'string') {
    try { return safeJsonValue(JSON.parse(value), fallback); } catch { return fallback; }
  }
  try { return JSON.parse(JSON.stringify(value)); } catch { return fallback; }
}

export function normalizeWidgetType(type = 'textarea') {
  const normalized = String(type || 'textarea').replace(/^sort$/, 'sorting').replace(/^match$/, 'matching');
  return WIDGET_TYPES.has(normalized) ? normalized : 'textarea';
}

export function normalizeResponseEntry(entry, fallbackId = '', fallbackType = 'textarea') {
  if (!entry || typeof entry !== 'object') {
    return { widgetId: fallbackId, widgetType: normalizeWidgetType(fallbackType), value: safeJsonValue(entry, {}), updatedAt: new Date().toISOString(), version: '1.0' };
  }
  return {
    widgetId: String(entry.widgetId || entry.id || fallbackId),
    widgetType: normalizeWidgetType(entry.widgetType || entry.type || fallbackType),
    value: safeJsonValue(Object.prototype.hasOwnProperty.call(entry, 'value') ? entry.value : entry, {}),
    updatedAt: entry.updatedAt || new Date().toISOString(),
    version: entry.version || '1.0'
  };
}

function flattenBlocks(blocksOrWidgets) {
  if (Array.isArray(blocksOrWidgets)) return blocksOrWidgets;
  if (Array.isArray(blocksOrWidgets?.blocks)) return blocksOrWidgets.blocks;
  if (Array.isArray(blocksOrWidgets?.widgets)) return blocksOrWidgets.widgets;
  return [];
}

export function initializeWorksheetState(blocksOrWidgets = [], existingResponses = {}) {
  const state = {};
  const incoming = safeJsonValue(existingResponses, {});
  const entries = Array.isArray(incoming) ? incoming : Array.isArray(incoming?.responses) ? incoming.responses : Object.values(incoming || {});
  entries.forEach((entry) => {
    const normalized = normalizeResponseEntry(entry);
    if (normalized.widgetId) state[normalized.widgetId] = normalized;
  });
  Object.entries(incoming || {}).forEach(([key, value]) => {
    if (!state[key] && key !== 'responses') state[key] = normalizeResponseEntry(value, key, value?.widgetType || value?.type || 'textarea');
  });
  flattenBlocks(blocksOrWidgets).forEach((block, index) => {
    const widgetId = String(block?.id || `block_${index}`);
    if (!state[widgetId]) {
      state[widgetId] = { widgetId, widgetType: normalizeWidgetType(block?.type), value: {}, updatedAt: new Date().toISOString(), version: '1.0' };
    }
  });
  return state;
}

export function updateWidgetResponse(state = {}, widgetId, widgetType, value) {
  if (!widgetId) return initializeWorksheetState([], state);
  return {
    ...initializeWorksheetState([], state),
    [widgetId]: {
      widgetId: String(widgetId),
      widgetType: normalizeWidgetType(widgetType),
      value: safeJsonValue(value, {}),
      updatedAt: new Date().toISOString(),
      version: '1.0'
    }
  };
}

export function serializeWorksheetResponses(state = {}) {
  return Object.fromEntries(Object.entries(initializeWorksheetState([], state)).map(([id, entry]) => [id, normalizeResponseEntry(entry, id)]));
}

export function serializeStructuredWorksheetResponses(state = {}, summary = []) {
  const responses = Object.values(serializeWorksheetResponses(state))
    .filter((entry) => entry.widgetId)
    .map((entry) => ({
      widgetId: entry.widgetId,
      widgetType: entry.widgetType,
      value: safeJsonValue(entry.value, {}),
      updatedAt: entry.updatedAt || new Date().toISOString(),
      version: entry.version || '1.0'
    }));
  return {
    version: '1.0',
    responses,
    summary: Array.isArray(summary) ? summary.filter(Boolean) : []
  };
}

export function summarizeWorksheetResponses(state = {}) {
  const responses = serializeWorksheetResponses(state);
  return Object.values(responses).map((entry) => {
    const value = entry.value || {};
    if (entry.widgetType === 'sorting') return `${entry.widgetId}: ${Object.keys(value.assignments || {}).length} sorted item(s)`;
    if (entry.widgetType === 'matching') return `${entry.widgetId}: ${(value.pairs || []).length} matched pair(s)`;
    if (entry.widgetType === 'body_map') return `${entry.widgetId}: ${(value.selectedAreas || []).length} body-awareness area(s)`;
    if (entry.widgetType === 'zone_map') return `${entry.widgetId}: ${Object.keys(value.placements || {}).length} zone placement(s)`;
    if (entry.widgetType === 'virtual_paper' || entry.widgetType === 'textarea') return `${entry.widgetId}: ${String(value.text || '').trim().length} character reflection`;
    return `${entry.widgetId}: response captured`;
  });
}
