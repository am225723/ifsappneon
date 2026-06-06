# Phase 20A — Unified IFS Guidance Engine

## What changed

Phase 20A adds a unified, safe IFS guidance layer that connects client Next Best Step recommendations, interactive worksheet payloads, and Advisor Session Snapshot preparation.

## Endpoint added

- `POST /api/ai-unified-guidance`
- Server-only OpenRouter call through `callOpenRouterChat()`.
- Request shape:

```json
{
  "clientId": "uuid",
  "mode": "client_next_step | advisor_snapshot | combined",
  "includeInteractivePayload": true,
  "rangeDays": 30
}
```

## Data sources used

The compact AI payload builder uses available scoped data from:

- `ifs_client_progress`
- `ifs_interactive_data`
- `ifs_life_integration_reflections`
- `ifs_parts`
- `ifs_part_relationships`
- `ifs_assigned_homework`
- `ifs_mood_entries`
- `ifs_assessment_results`

Module responses are cleaned before being sent to AI so low-value response clutter is minimized. Long values are truncated and the total payload is compacted if it grows too large.

## Authorization model

- Client/self users may request only `client_next_step` for their own `clientId`.
- Advisor/Admin/Supervisor users may request `advisor_snapshot` or `combined`.
- Non-admin Advisors must have an active assignment in `ifs_therapist_clients` for the selected client.
- The endpoint does not perform global client loading or name matching.
- Clients do not receive Advisor Session Snapshot output.
- Advisor notes are not included in client-facing output.

## Client Next Best Step behavior

Client Home/My IFS now includes a gentle **Your Next Guided Step** card near the curriculum section. It:

- uses explicit user action to generate guidance;
- does not block Home if generation fails;
- shows title, description, reason, estimated time, supporting signals, and a client-safe internal route;
- can preview an optional Guided Practice via the existing interactive worksheet renderer;
- stores a short sessionStorage cache to avoid repeated AI calls on page render.

## Advisor Session Snapshot behavior

The Advisor dashboard Insights area now includes **Advisor Session Snapshot** with an explicit **Generate Session Snapshot** button. It displays:

- curriculum trajectory;
- parts and Inner System themes;
- assessment and Self-energy themes;
- Life Integration themes;
- assigned practice status;
- AI-generated review themes and suggested session questions;
- attention items for Advisor;
- what not to over-interpret;
- the required Advisor-review disclaimer.

The snapshot is not auto-saved as an Advisor note and is not exposed to clients. A copy button is available for Advisor convenience.

## Interactive worksheet shortcode support

`InteractiveWorksheetRenderer` now converts safe shortcode widgets into internal interactive blocks:

- `SORTING_WIDGET`
- `MATCHING_WIDGET`
- `BODY_MAP_WIDGET`
- `ZONE_MAP_WIDGET`
- `BLANK_WIDGET`
- `SLIDER_WIDGET`
- `TIMELINE_WIDGET`
- `FOCUS_CARD`

The parser lives in `src/lib/interactiveShortcodeParser.js`. It does not use raw HTML or `dangerouslySetInnerHTML`. Malformed or unsupported payloads fall back to formatted text plus virtual paper behavior.

## Validation and fallback behavior

Server-side validation lives in `api/_unifiedGuidanceValidation.js` and checks:

- JSON parse success;
- allowed `priority_loop` values;
- allowed interactive payload formats;
- client-safe internal `action_route` values;
- Advisor disclaimer normalization;
- capped strings and arrays;
- obvious prohibited language such as diagnosis/risk-score/medication recommendation/emergency conclusion language.

If validation fails, the endpoint returns safe fallback guidance to continue the curriculum and/or a sparse Advisor Session Snapshot for review only.

## Cost control

- Client Next Best Step generation requires a button click and is cached in `sessionStorage` for a short period.
- Advisor Session Snapshot generation requires an explicit button click.
- No expensive AI request is automatically triggered on Home render or dashboard selection.

## Safety boundaries

- No diagnosis generation.
- No risk scoring.
- No emergency monitoring or autonomous safety conclusions.
- No medication routes, cards, placeholders, tracking, or medication advice.
- No frontend AI provider keys.
- No Perplexity runtime calls.
- No OpenAI runtime calls.
- No SQL migration is required for this phase.

## Known limitations

- Shortcode widgets use lightweight controls rather than heavy drag/drop interactions.
- `FOCUS_CARD` renders a safe review prompt and does not independently fetch part metadata; it relies on already scoped data available to the page or AI payload.
- Missing optional tables are treated as unavailable data sources rather than hard failures.
- The AI output remains a preparation aid and must be reviewed by an Advisor.
