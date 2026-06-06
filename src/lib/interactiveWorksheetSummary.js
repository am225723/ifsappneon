import { serializeWorksheetResponses } from './interactiveWorksheetState';

function asText(value) {
  return String(value ?? '').replace(/[<>]/g, '').trim();
}

export function summarizeInteractiveResponses(responses = {}) {
  return Object.values(serializeWorksheetResponses(responses)).map((entry) => {
    const value = entry.value || {};
    const title = asText(entry.widgetId);
    if (entry.widgetType === 'sorting') {
      return { widgetId: entry.widgetId, widgetType: entry.widgetType, title, lines: Object.entries(value.assignments || {}).map(([card, column]) => `${asText(card)} → ${asText(column)}`) };
    }
    if (entry.widgetType === 'matching') {
      return { widgetId: entry.widgetId, widgetType: entry.widgetType, title, lines: (value.pairs || []).map(pair => `${asText(pair.leftLabel || pair.leftId)} ↔ ${asText(pair.rightLabel || pair.rightId)}`) };
    }
    if (entry.widgetType === 'body_map') {
      return { widgetId: entry.widgetId, widgetType: entry.widgetType, title, lines: (value.selectedAreas || []).map(area => `${asText(area.label || area.area)}${area.intensity ? ` · intensity ${asText(area.intensity)}` : ''}${area.note ? ` · ${asText(area.note)}` : ''}`) };
    }
    if (entry.widgetType === 'zone_map') {
      return { widgetId: entry.widgetId, widgetType: entry.widgetType, title, lines: Object.entries(value.placements || {}).map(([node, zone]) => `${asText(node)} → ${asText(zone)}`) };
    }
    if (entry.widgetType === 'virtual_paper' || entry.widgetType === 'textarea') {
      return { widgetId: entry.widgetId, widgetType: entry.widgetType, title, lines: [asText(value.text)] };
    }
    return { widgetId: entry.widgetId, widgetType: entry.widgetType, title, lines: [asText(JSON.stringify(value))].filter(Boolean) };
  }).filter(group => group.lines.some(Boolean));
}

export function renderInteractiveResponseSummary(responses = {}) {
  return summarizeInteractiveResponses(responses).map(group => `${group.title}\n${group.lines.map(line => `• ${line}`).join('\n')}`).join('\n\n');
}
