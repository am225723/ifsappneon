import { liveSessionRequest } from './liveSession';

export function loadClientPartsForMap({ clientId, sessionId }) {
  return liveSessionRequest({ action: 'get_map_parts', clientId, sessionId });
}

export function setSharedMapSelectedPart({ sessionId, partId }) {
  return liveSessionRequest({ action: 'set_selected_part', sessionId, partId });
}

export function updateSharedMapDraft({ sessionId, layoutDraft, mapMode, advisorPrompt }) {
  return liveSessionRequest({ action: 'update_map_draft', sessionId, layoutDraft, mapMode, advisorPrompt });
}

export function suggestSharedMapPart({ sessionId, suggestion }) {
  return liveSessionRequest({ action: 'suggest_part', sessionId, suggestion });
}

export function acceptSharedMapSuggestion({ sessionId, suggestionId }) {
  return liveSessionRequest({ action: 'accept_suggestion', sessionId, suggestionId });
}

export function dismissSharedMapSuggestion({ sessionId, suggestionId }) {
  return liveSessionRequest({ action: 'dismiss_suggestion', sessionId, suggestionId });
}

export function saveConfirmedSharedMap({ sessionId }) {
  return liveSessionRequest({ action: 'save_confirmed_map', sessionId });
}
