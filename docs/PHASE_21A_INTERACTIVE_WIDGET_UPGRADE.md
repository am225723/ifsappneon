# Phase 21A — True Drag-and-Drop Interactive Widget Upgrade

Phase 21A upgrades AI-generated worksheets, assessments, and Assigned IFS Practices from basic dropdown activities into calmer app-native **Interactive Practice** widgets.

## Widgets upgraded

- **Sorting:** cards drag into calm rounded columns with an Unsorted area and a keyboard/mobile “Move to…” select fallback.
- **Matching:** left cards drag onto right cards, with select-based pairing and “Clear match” fallback.
- **Body map:** non-medical body-awareness grid/silhouette, area selection, intensity, notes, and optional quick-add chips.
- **Zone map:** Self-energy zones with draggable part labels and select fallback.
- **Virtual paper:** lined freeform writing surface with prompt header, local state updates, count display, and clear confirmation.
- Existing blank, slider, timeline, checklist, rating, textarea, and focus-card blocks continue to render safely.

## Response state model

Responses are normalized in `src/lib/interactiveWorksheetState.js`:

```json
{
  "widgetId": "string",
  "widgetType": "sorting | matching | body_map | zone_map | blank | slider | timeline | focus_card | virtual_paper | textarea | checklist | rating",
  "value": {},
  "updatedAt": "ISO timestamp"
}
```

The renderer keeps local state unless a parent passes `initialResponses`/`onResponsesChange`. Values are JSON-safe and malformed prior values are ignored rather than crashing.

## Drag/drop and fallback behavior

- Native HTML5 drag/drop is used for desktop sorting, matching, and zone placement.
- Mobile and keyboard users can complete the same interactions with selects and buttons.
- No large drag/drop, canvas, whiteboard, or CRDT dependency was added.

## Response saving behavior

The legacy `ifs_therapy_homework` table exposes text completion storage in the current schema. Phase 21A preserves typed reflection notes and appends a readable structured summary of interactive widget responses into `completion_notes` on completion. No SQL migration was added. If a JSON metadata column becomes available later, the normalized response state can be stored directly without changing widget contracts.

## Advisor review behavior

Advisor review surfaces now receive readable completion text that includes an “Interactive Practice Responses” section. The summary helper in `src/lib/interactiveWorksheetSummary.js` converts sorting, matching, body map, zone map, virtual paper, and other widget responses into safe human-readable lines instead of raw JSON dumps.

## AI output guidance

Assigned-practice and Unified Guidance prompts now ask for structured widget blocks with unique IDs, short draggable cards, limits of 8 sorting cards and 6 matching pairs, body-awareness wording, Self-energy zone maps, and virtual paper fallbacks.

## Safeguards

- No medication routes, cards, pages, advice, placeholders, or tracking were added.
- No diagnosis generation, risk scoring, emergency monitoring, or autonomous clinical conclusions were added.
- No SQL migrations were added and `neon/999_backfill_therapist_assignments.sql` was not run.
- No `dangerouslySetInnerHTML` or `eval` was added.
- Existing assignment-scoped Advisor loading paths remain in place; the phase does not loosen authorization or add global client loading.

## Demo payload

`src/lib/interactiveWorksheetDemoPayloads.js` includes safe sample blocks for sorting, matching, body map, zone map, blank, slider, timeline, focus card, and virtual paper. It contains no real client data.

## Known limitations

- Native HTML5 drag/drop varies on some mobile browsers, so selects remain the primary robust mobile fallback.
- Structured response persistence is currently summarized into the existing text completion field because no JSON-compatible assigned-practice response field is present in the checked schema.
- The visual body silhouette is intentionally simple and non-medical.
