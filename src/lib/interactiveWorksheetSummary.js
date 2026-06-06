import { serializeWorksheetResponses } from './interactiveWorksheetState';

function asText(value) {
  return String(value ?? '').replace(/[<>]/g, '').trim();
}

function compactLines(lines) {
  return lines.map(asText).filter(Boolean);
}

function objectEntries(value) {
  return value && typeof value === 'object' && !Array.isArray(value) ? Object.entries(value) : [];
}

export function summarizeInteractiveResponses(responses = {}) {
  return Object.values(serializeWorksheetResponses(responses)).map((entry) => {
    const value = entry.value || {};
    const title = asText(entry.title || entry.label || entry.widgetId);

    if (entry.widgetType === 'sorting') {
      const lines = objectEntries(value.assignments).map(([card, column]) => `${asText(card)} → ${asText(column)}`);
      return { widgetId: entry.widgetId, widgetType: entry.widgetType, title, lines: lines.length ? lines : ['No sorted cards recorded.'] };
    }

    if (entry.widgetType === 'matching') {
      const lines = (Array.isArray(value.pairs) ? value.pairs : []).map((pair) => `${asText(pair.leftLabel || pair.leftId || pair.left)} matched with ${asText(pair.rightLabel || pair.rightId || pair.right)}`);
      return { widgetId: entry.widgetId, widgetType: entry.widgetType, title, lines: lines.length ? lines : ['No matched pairs recorded.'] };
    }

    if (entry.widgetType === 'body_map') {
      const lines = (Array.isArray(value.selectedAreas) ? value.selectedAreas : []).map((area) => {
        const label = asText(area.label || area.area || area.id);
        const intensity = area.intensity || area.intensity === 0 ? ` — intensity ${asText(area.intensity)}` : '';
        const note = area.note || area.sensation ? ` — “${asText(area.note || area.sensation)}”` : '';
        return `${label}${intensity}${note}`;
      });
      return { widgetId: entry.widgetId, widgetType: entry.widgetType, title, lines: lines.length ? lines : ['No body areas selected.'] };
    }

    if (entry.widgetType === 'zone_map') {
      const lines = objectEntries(value.placements).map(([node, zone]) => `${asText(node)} placed in ${asText(zone)}`);
      return { widgetId: entry.widgetId, widgetType: entry.widgetType, title, lines: lines.length ? lines : ['No zone placements recorded.'] };
    }

    if (entry.widgetType === 'slider') {
      const values = value.values && typeof value.values === 'object' ? value.values : { [value.label || 'Rating']: value.value };
      const lines = objectEntries(values).map(([label, rating]) => `${asText(label)}: ${asText(rating)}/10`);
      return { widgetId: entry.widgetId, widgetType: entry.widgetType, title, lines: lines.length ? lines : ['No slider values recorded.'] };
    }

    if (entry.widgetType === 'blank') {
      const answers = value.answers && typeof value.answers === 'object' ? Object.values(value.answers) : [];
      return { widgetId: entry.widgetId, widgetType: entry.widgetType, title, lines: compactLines(answers).length ? compactLines(answers) : ['No blanks completed.'] };
    }

    if (entry.widgetType === 'checklist') {
      const checked = Array.isArray(value.checked) ? value.checked : Array.isArray(value.checkedItems) ? value.checkedItems : [];
      return { widgetId: entry.widgetId, widgetType: entry.widgetType, title, lines: compactLines(checked).length ? compactLines(checked) : ['No checklist items selected.'] };
    }

    if (entry.widgetType === 'rating') {
      const label = asText(value.label || title || 'Rating');
      const rating = value.value ?? value.rating ?? '';
      return { widgetId: entry.widgetId, widgetType: entry.widgetType, title, lines: rating !== '' ? [`${label}: ${asText(rating)}`] : ['No rating recorded.'] };
    }

    if (entry.widgetType === 'virtual_paper' || entry.widgetType === 'textarea' || entry.widgetType === 'focus_card' || entry.widgetType === 'timeline') {
      const text = value.text || value.notes || value.anchor || '';
      const lines = asText(text).split('\n').map(asText).filter(Boolean);
      return { widgetId: entry.widgetId, widgetType: entry.widgetType, title, lines: lines.length ? lines : ['No written response recorded.'] };
    }

    return { widgetId: entry.widgetId, widgetType: entry.widgetType, title, lines: ['Response captured.'] };
  }).filter((section) => section.widgetId);
}

export function renderInteractiveResponseSummary(responses = {}) {
  return summarizeInteractiveResponses(responses)
    .map((section) => [`${section.title} (${section.widgetType})`, ...section.lines.map((line) => `• ${line}`)].join('\n'))
    .join('\n\n');
}

export function renderInteractiveResponseSummaryLines(responses = {}) {
  return summarizeInteractiveResponses(responses).flatMap((section) => section.lines);
}
