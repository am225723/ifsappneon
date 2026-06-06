# Phase 20B — Unified Guidance Runtime QA + Prompt/Widget Hardening

Phase 20B is a hardening and runtime QA pass for the Phase 20A Unified IFS Guidance Engine. It does not add SQL, migrations, medication functionality, or new product surfaces.

## Authorization QA

- `POST /api/ai-unified-guidance` now rejects unsupported `mode` values with `400 invalid_mode` instead of silently treating them as client guidance.
- Client mode (`client_next_step`) is limited to the authenticated client user requesting their own client record.
- Advisor-only modes (`advisor_snapshot` and `combined`) require an Advisor/Admin/Supervisor role.
- Non-admin Advisors continue to require an active therapist/client assignment before scoped client data is loaded.
- Admin/Supervisor access remains role-gated.
- Client mode never includes `advisor_session_snapshot` in the validated response.
- The data builder queries only the requested authorized `clientId`; it does not load all clients globally.

## Data Payload Safety

- Unified guidance data is compacted before prompt construction.
- Module responses are cleaned with the shared module-response cleaner before being sent to AI.
- Cleaned module responses are capped to 20 module groups, 5 response rows per module, 12 answers per response, and 500 characters per answer.
- Life Integration reflections are capped at 10 rows.
- Parts are capped at 20 rows.
- Part relationships are capped at 30 rows.
- Assigned practices are capped at 10 rows.
- Mood/trigger entries are capped at 20 rows.
- Per-field text is truncated before prompt use.
- Malformed interactive-data JSON is ignored safely.
- Unavailable source labels are reported through safe source metadata without raw database errors.
- Medication data and Advisor notes are not included in the unified guidance payload.

## AI JSON Parsing and Fallbacks

- The validator accepts JSON returned directly or inside markdown fences.
- It attempts to recover a JSON object from text that wraps a JSON object.
- Plain text, malformed JSON, missing sections, invalid route values, invalid payload arrays, unsupported interactive payload formats, prohibited wording, and overlong strings are normalized or replaced with safe fallbacks.
- Provider failures return safe fallback guidance/snapshots instead of exposing raw provider payloads.
- Validation warnings are limited to non-sensitive flags such as `safe_fallback_used` and provider error codes.
- Raw OpenRouter responses, API keys, and secrets are never returned to clients.

## Allowed Route Validation

Allowed client action routes are limited to:

- `/curriculum`
- `/curriculum/module/:moduleId`
- `/life-integration`
- `/life-integration/notice-part`
- `/life-integration/return-to-self`
- `/life-integration/trigger-reflection`
- `/life-integration/repair-after-conflict`
- `/life-integration/protector-check-in`
- `/life-integration/needs-boundaries`
- `/parts-relationships`
- `/parts-dialogue`
- `/journal`
- `/tools`
- `/meditation`
- `/assigned-practices`
- `/homework`

Invalid, external, JavaScript/data URLs, Advisor/Admin, reports, analytics, unknown, or medication routes are replaced with `/curriculum`.

## Client Next Best Step Runtime Behavior

- Next Best Step generation remains explicit via the **Find My Next Step** button.
- It is not generated automatically on Home/My IFS render.
- Successful client guidance uses a short `sessionStorage` cache keyed by client id to avoid repeated calls during the same session.
- Refresh is intentional via the button.
- Failure does not block Home/My IFS; the UI shows a gentle curriculum fallback message.
- The card remains visually secondary to the Curriculum section.
- Advisor Session Snapshot output is not rendered in client UI.

## Advisor Session Snapshot Runtime Behavior

- Advisor Session Snapshot generation remains explicit through **Generate Session Snapshot**.
- It is not generated automatically on dashboard load.
- A selected client is required.
- Loading and error states are visible.
- The snapshot is clearly labeled as Advisor review material and includes the required disclaimer: “AI-generated preparation aid for Advisor review only. Not a diagnosis, risk assessment, or clinical conclusion.”
- Copy Snapshot remains a transient clipboard action; the snapshot is not saved as a note.
- Snapshot sections cover curriculum trajectory, parts/inner system themes, assessment/Self-energy themes, Life Integration themes, assigned practice status, generated review themes, suggested session questions, attention items, and what not to over-interpret.

## Interactive Shortcode Widget QA

The parser and renderer support all eight Phase 20A shortcodes:

1. `SORTING_WIDGET`
2. `MATCHING_WIDGET`
3. `BODY_MAP_WIDGET`
4. `ZONE_MAP_WIDGET`
5. `BLANK_WIDGET`
6. `SLIDER_WIDGET`
7. `TIMELINE_WIDGET`
8. `FOCUS_CARD`

Runtime hardening notes:

- Missing IDs receive generated fallback IDs.
- Missing titles receive safe fallback labels.
- Malformed shortcode JSON falls back to safe defaults.
- Unsupported fields are ignored.
- Renderer array-like inputs are normalized before mapping to avoid crashes.
- No raw HTML rendering or `dangerouslySetInnerHTML` is used.
- If parsing produces no blocks, the renderer falls back to formatted text plus virtual paper.
- Sorting and matching use select/dropdown controls rather than drag/drop in this phase.
- `FOCUS_CARD` does not fetch data; it only renders a scoped review prompt and safe unavailable state.

## Prohibited Language / Safety Safeguards

Prompts and validation prohibit or normalize away unsafe language and behaviors, including:

- diagnosis generation
- risk scoring
- medication recommendations
- emergency conclusions
- autonomous clinical conclusions
- certainty claims about parts
- patient monitoring language
- treatment compliance language

Preferred phrasing remains cautious: “may suggest,” “could be useful to explore,” “available app data suggests,” “for Advisor review,” and “not a diagnosis or conclusion.”

## Cost Control / Caching

- Client Next Best Step uses short session cache only.
- The cache key is client-specific and not stored in `localStorage`.
- Advisor Session Snapshot is not cached in client-facing storage.
- Failed calls do not retry in a loop.
- Regeneration requires an explicit user action.

## Key and Provider Safety

- OpenRouter remains server-side only through `OPENROUTER_API_KEY`.
- No `VITE_OPENROUTER`, `VITE_OPENAI`, or `VITE_PERPLEXITY` runtime keys are introduced.
- No Perplexity runtime calls are used.
- No OpenAI runtime calls are used by the unified guidance endpoint.

## Medication / SQL / Migration Result

- No medication routes, pages, cards, placeholders, tracking, or advice were added.
- No SQL was added.
- No migrations were added.
- `neon/999_backfill_therapist_assignments.sql` was not run.

## Verification Result

- `git diff --check`: passed.
- `npm install`: completed.
- `npm run build`: passed.
- `npm run lint || true`: completed with deferred lint warnings/errors outside the Phase 20B runtime hardening scope.

## Known Limitations / Follow-ups

- Sorting and matching widgets intentionally use dropdown/select interactions instead of drag/drop.
- Runtime endpoint behavior was hardened by code inspection and build verification; live role-matrix testing still requires authenticated Clerk users and assigned Advisor/client fixtures in a deployed environment.
- Provider outage fallback is safe and non-sensitive, but production observability should continue to monitor provider error rates server-side.
