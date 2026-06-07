# Phase 22A — Advanced Personalization and Home Redesign

## Overview
Phase 22A upgrades the app from a broad tool dashboard into a calmer, more personalized IFS experience. The Curriculum remains the main IFS Path. Assigned IFS Practices are treated as separate Advisor-guided worksheets/practices.

## Advanced worksheet generation
- `api/ai-assigned-practice.js` now prompts for advanced multi-section Assigned IFS Practice worksheets.
- Default generations are instructed to include at least five sections unless the Advisor explicitly asks for a short practice.
- Default generations are instructed to use at least three app-native activity block types.
- Supported activity_blocks include instruction, question, textarea, checklist, rating, slider, sorting, matching, body_map, zone_map, blank, timeline, focus_card, and virtual_paper.
- Reflective writing is directed into `virtual_paper`; paper-based activities are converted into app-native interactive blocks.
- Client description text remains separate from `ACTIVITY_BLOCKS_JSON`, so raw worksheet JSON is not shown in the client description.

## Personalized worksheet data sources
`api/_worksheetPersonalizationData.js` builds compact, assignment-scoped personalization context for Advisor worksheet generation. When available and authorized, it includes:
- module responses from `ifs_interactive_data`
- curriculum reflections
- Life Integration reflections
- journal entries
- prior assigned practice status, completion notes, and `interactive_responses` summaries
- parts and part relationships
- formal assessment results
- interactive assessment rows
- mood/trigger entries
- Advisor input from the generator form
- Advisor session notes only for Advisor-only, assignment-scoped generation

The builder caps long text, cleans empty responses, safely ignores malformed JSON, avoids raw JSON dumps, and does not globally load clients.

## Curriculum vs Assigned Practices
- Curriculum summaries no longer treat active Assigned IFS Practices as the current curriculum module.
- Curriculum UI no longer marks modules as “Assigned by Advisor.”
- Assigned IFS Practices remain available through `/assigned-practices`, `/homework` alias behavior, Advisor Practice Generator, Client Home’s compact Advisor-Guided Practice section, and Tools Directory Advisor Support / Practice areas.

## Next Best Step logic
`api/_nextBestStepLogic.js` adds deterministic `nextBestStep` priority ranking before AI wording. Priority considers:
1. active incomplete Advisor-assigned practice
2. current curriculum progress
3. recent mood/trigger activity
4. completed assessments with empty parts map
5. protector/exile confusion in module responses
6. many reflections without Life Integration practice
7. sparse data / curriculum start
8. session-prep signals

AI may write a warm explanation, but server logic preserves the deterministic route/priority and route validation still prevents unsafe destinations.

## Pre-Session AI data expansion
`api/ai-session-summary.js` now produces deeper Pre-Session AI notes from:
- agendas/check-ins
- mood/trigger entries
- journal entries
- parts and relationships
- assigned practice progress, completion notes, and structured response summaries
- curriculum progress
- module responses
- curriculum reflections
- Life Integration reflections
- formal and interactive assessment results
- prior prep summaries when present
- Advisor session notes when assignment-scoped

Required sections now include snapshot, relevant client inputs, module themes, journal/reflection themes, parts/protector themes, assessment themes, assigned practice progress, session-opening questions, follow-ups, and what not to over-interpret.

## Assessment Insights synthesis
`src/pages/Profile.jsx` adds an integrated Assessment Insights section that synthesizes:
- Wound Patterns Assessment
- Parts System Assessment
- Self-Energy Assessment
- Attachment Pattern Assessment
- formal wound results from `ifs_assessment_results` when present
- interactive assessment rows from `ifs_interactive_data`

Language is intentionally cautious: “may suggest,” “could reflect,” “a part may be,” and “worth exploring with your Advisor.” It avoids diagnosis, risk scoring, and certainty language.

## IFS data warning fix
Home/My IFS no longer shows the persistent top-level “Your IFS data could not be loaded” or “Some parts…” warning for optional query failures when the self profile is connected. Optional failures are logged in development and the UI renders available data.

## Client Home redesign
`src/pages/Home.jsx` now uses a calmer hierarchy:
1. elegant hero with greeting, path status, one primary action, one secondary action, and Appearance / Color Palette
2. Continue Your IFS Path as the largest card
3. compact Next Guided Step
4. compact Advisor-Guided Practice status
5. Recent Inner Work timeline preview, max 3 items
6. Inner System Snapshot
7. Quiet Tools drawer with full list moved to `/tools`

The design avoids tile-heavy productivity-dashboard patterns and preserves warm serif heading style.

## Color palette customization
Client Home includes localStorage-backed palette selection using `ifsClientColorPalette` and CSS variables on `document.documentElement`:
- Luminous Green
- Warm Gold
- Soft Sage
- Rosewood
- Ocean Blue
- Lavender Calm

No SQL is required. The setting applies immediately and does not affect role security.

## Security and authorization
- Worksheet personalization is Advisor-only and still requires `requireTherapistAssignment` unless an Admin/Supervisor path already has broader authorization.
- Client-facing guidance does not receive Advisor notes.
- OpenRouter remains server-side only.
- No client data is globally loaded for unassigned Advisors.
- No authorization checks were loosened.

## No medication / diagnosis / risk scoring
This phase adds no medication routes, medication UI, medication advice, diagnosis generation, risk scoring, emergency monitoring, or autonomous clinical conclusions.

## SQL / migration status
No new SQL is required for Phase 22A. Production may still need the prior Phase 21B migration applied manually:

```sql
neon/032_add_homework_activity_response_json.sql
```

Do not run:

```sql
neon/999_backfill_therapist_assignments.sql
```

## Known limitations
- Pre-session optional tables are queried defensively; if a table does not exist in an environment, the summary still generates from available sources.
- Assessment Insights are deterministic client-facing synthesis, not AI-generated prose.
- Home palette customization is local to the browser by design; cross-device persistence would require a future preferences table.
- Lint may continue to report deferred repository-wide lint debt unrelated to this phase.
