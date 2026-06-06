# Phase 21C — Structured Worksheet Persistence Migration QA

## Scope

Phase 21C verified and hardened the Phase 21B structured worksheet persistence work for Assigned IFS Practice worksheet definitions and client widget responses. This was a migration and runtime QA pass only: no unrelated product features, widgets, medication features, diagnosis generation, risk scoring, or historical backfills were added.

## Migration files

- Neon migration: `neon/032_add_homework_activity_response_json.sql`
- Supabase migration: `supabase/migrations/036_add_homework_activity_response_json.sql`
- Neon schema snapshot: `neon/schema.sql`
- Supabase schema snapshot: `supabase/complete_schema.sql`

## Table and columns

The assigned-practice table changed by Phase 21B is `public.ifs_therapy_homework`.

Columns added by the migration:

| Column | Type | Default | Purpose |
| --- | --- | --- | --- |
| `activity_blocks` | `JSONB` | `'[]'::jsonb` | Stores worksheet/activity block definitions separately from Advisor-editable description text. |
| `interactive_responses` | `JSONB` | `'{}'::jsonb` | Stores structured client widget responses separately from typed reflection notes. |

`completion_notes` remains a `TEXT` column and remains the typed free-text reflection field.

## Idempotency review

Result: **pass**.

Both migration files use `ALTER TABLE public.ifs_therapy_homework ADD COLUMN IF NOT EXISTS` with JSONB defaults. The migration does not drop columns, rename columns, overwrite `completion_notes`, backfill historical records, create unnecessary indexes, or modify unrelated tables.

`neon/999_backfill_therapist_assignments.sql` was not run and is intentionally unrelated to this phase.

## Schema snapshot status

Result: **pass**.

Both `neon/schema.sql` and `supabase/complete_schema.sql` include `activity_blocks JSONB DEFAULT '[]'::jsonb` and `interactive_responses JSONB DEFAULT '{}'::jsonb` on `ifs_therapy_homework`, matching the migrations.

## Missing-column graceful fallback behavior

Result: **hardened in Phase 21C**.

If production has not yet had the Phase 21B migration applied:

- Client completion first attempts to save `completion_notes` plus `interactive_responses`.
- If the database reports the `interactive_responses` column is missing, the app retries the completion update without `interactive_responses`.
- The client sees a gentle non-SQL warning: “Your written reflection was saved, but the interactive activity responses could not be saved right now.”
- Advisor assignment creation first attempts to save `activity_blocks` when structured blocks exist.
- If the database reports the `activity_blocks` column is missing, the app retries the assignment save without `activity_blocks` and shows an Advisor-facing warning: “Structured worksheet persistence is not available yet. Apply the Phase 21B worksheet persistence migration.”
- Raw SQL/schema-cache errors are not shown in client UI.

Manual SQL is still required before production can persist structured activity blocks and structured widget responses.

## Legacy assignment compatibility

Result: **pass**.

Old assignments remain valid when they have text-only descriptions, missing/null/empty `activity_blocks`, missing/null/empty `interactive_responses`, or `completion_notes` only. Text-only assignments use `FormattedAIContent`, and `InteractiveWorksheetRenderer` splits old embedded `ACTIVITY_BLOCKS_JSON` markers out of description text when possible. Malformed embedded JSON is ignored safely and the renderer falls back to formatted text plus virtual paper.

Advisor review still displays old `completion_notes` normally. Structured summaries are used only when structured responses exist, so old notes are not replaced or overwritten.

## New assignment creation behavior

Result: **pass with missing-column fallback**.

AI-generated activity blocks are parsed out of `ACTIVITY_BLOCKS_JSON` and returned separately from description text. Advisor edits continue to edit `description`, while `activityBlocks` remains a separate form field and preview source. Assignment saves `activity_blocks` when available; if the column is not present yet, Phase 21C now saves the assignment without the structured blocks and displays the Advisor migration warning.

Malformed AI activity block output falls back to description rendering and virtual paper instead of crashing.

## Client completion behavior

Result: **pass with missing-column fallback**.

Client widget changes flow through `onResponsesChange` into normalized worksheet state. Completion saves:

- `completion_notes` for typed reflection text.
- `interactive_responses` for structured widget response JSON when the column exists.

If `interactive_responses` is missing, the fallback preserves completion status and typed reflection notes but clearly warns that interactive activity responses were not saved. Empty widget state serializes safely. Existing malformed `interactive_responses` normalizes to a safe empty object/summary rather than crashing.

Mentally reviewed response shapes include sorting, matching, body map, zone map, virtual paper, blank, slider, checklist, and rating responses.

## Advisor review behavior

Result: **pass**.

Advisor views render structured response summaries before typed reflections. They do not render raw response JSON. Existing completion-note-only assignments still display the reflection. Unknown widget types fall back to “Response captured,” and malformed response JSON normalizes safely.

Expected readable summary styles are supported, including:

- Sorting: `Inner Critic → Managers`
- Matching: `Perfectionist protector matched with fear of rejection`
- Body map: `Throat — intensity 6 — tight`
- Zone map: `Inner Critic placed in Protective edge`
- Slider: `Blending Intensity: 7/10`
- Virtual paper: readable text lines

## FormattedAIContent QA

Result: **pass**.

`FormattedAIContent` renders markdown-lite content without `dangerouslySetInnerHTML`, `eval`, or `new Function`. It supports bold (`**bold**`), italic (`*italic*`), headings, bullets, numbered lists, question spacing, and blockquotes through React elements.

Remaining `**` search hits are expected in docs, prompts, or content strings and are not raw standard generated content rendering failures.

## Unified Guidance / Next Best Step compatibility

Result: **pass**.

Unified Guidance continues to accept structured block payloads, shortcode/text payloads, and fallback text. Invalid/malformed payloads are normalized and rendered by `InteractiveWorksheetRenderer` with formatted text/virtual paper fallback. Invalid action routes fall back to `/curriculum`, and route validation blocks medication, admin, Advisor, reports, analytics, external, JavaScript, and unknown client routes.

No raw JSON is displayed in the Next Guided Step card.

## Security and authorization checks

Result: **pass for Phase 21C scope**.

- Client homework loading remains scoped to the signed-in client ID.
- Advisor homework loading uses assignment-scoped client lists from `loadAssignedClients`, then loads `ifs_therapy_homework` only for those assigned client IDs.
- AI assigned-practice generation requires therapist auth and `requireTherapistAssignment` for the target client.
- Unified Guidance client mode requires the client to request only their own Next Best Step; Advisor snapshot modes require Advisor/Admin role and assignment checks for non-admin Advisors.
- The unsafe global client-loading search returned no matching active `ifs_clients` user-role query pattern.
- Advisor notes remain in Advisor/Admin paths and are not exposed through client homework changes.

## Medication artifact result

Result: **pass for active code paths**.

No medication routes, medication pages, medication cards, medication tracking, or medication-management features were added. Search hits are documentation exclusions, prompt-level prohibitions, and historical data/docs artifacts. Route validation explicitly blocks medication routes in Unified Guidance.

## Frontend AI key result

Result: **pass for runtime code**.

No frontend runtime use of `VITE_OPENROUTER`, `VITE_OPENAI`, or `VITE_PERPLEXITY` was found in `src` or `api`. Search hits are deployment/readiness documentation warning not to use frontend AI keys.

## Unsafe HTML / eval result

Result: **pass**.

The formatted content renderer does not use `dangerouslySetInnerHTML`, `eval`, or `new Function`. The verification search did not identify unsafe rendering in the inspected worksheet/content paths.

## Manual SQL required

Manual SQL is required if the Neon production database has not applied Phase 21B yet. Apply the migration manually through the normal deployment path:

- `neon/032_add_homework_activity_response_json.sql`

Do not run `neon/999_backfill_therapist_assignments.sql` for this phase. Do not backfill historical `completion_notes` into `interactive_responses`.

## Known limitations and follow-ups

- If production is missing the migration, structured worksheet definitions/responses cannot be persisted; Phase 21C preserves text/completion data and shows clear warnings instead.
- Historical records are not backfilled by design.
- Repository-wide lint still has deferred lint debt; full lint is not required to block this phase if build passes.
- Historical documentation/data medication mentions remain outside active product UI and can be cleaned up separately only if product owners want repository text cleanup.
