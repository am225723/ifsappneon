# Phase 18B — Advisor AI, Worksheet Runtime, Visibility, and Regression QA

Date: 2026-06-05

## Scope verified

Phase 18B is a QA and stabilization pass for the Phase 18A Advisor reporting, AI preparation, worksheet rendering, dashboard, and Advisor-visible client input changes. This pass intentionally avoids major new features, SQL, migrations, and historical backfills.

Verified areas:

1. Build/import/route integrity for the primary app routes, Advisor components, AI formatting components, and report/session/practice API handlers.
2. `/curriculum` and `/my-ifs` consistency through the shared curriculum summary helper.
3. Attachment Pattern Assessment display language on `/profile`.
4. Settings/gear placement for legacy profile/import/recovery tools.
5. Navbar duplicate Advisor Dashboard text cleanup while preserving the Advisor workspace icon route.
6. Advisor report module-response cleaning for display/reporting only.
7. Advisor AI Module Response Insights authorization, client scoping, prompt safety, and disclaimer behavior.
8. Session Prep AI sparse-data generation behavior.
9. AI worksheet/assessment formatting and safe React rendering.
10. Interactive worksheet and virtual-paper runtime support.
11. Client input visibility defaults for assigned Advisors.
12. Advisor Dashboard workflow grouping and role-limited tools.
13. Security/authorization regressions, including client-only and Advisor-only wrappers.
14. Medication artifact regression checks.
15. Unsafe global client loading and name-based matching checks.

## Fixes made in Phase 18B

### AI assigned-practice parsing

The Assigned IFS Practice parser now treats `ACTIVITY_BLOCKS_JSON` as a field boundary. This prevents the editable Advisor description from accidentally swallowing structured worksheet JSON and keeps generated structured blocks available for review and assignment.

### Interactive worksheet runtime

`InteractiveWorksheetRenderer` now renders all supported block types safely without raw HTML:

- `instruction`
- `question`
- `textarea`
- `checklist`
- `rating`
- `virtual_paper`
- `sort`
- `match`

If structured JSON is absent or unparsable, the renderer falls back to formatted text plus an in-app virtual-paper response area.

### Attachment Pattern Assessment explanation

The Profile page now always shows client-safe explanatory copy for secure, anxious, avoidant, and disorganized attachment patterns. Primary and secondary patterns are highlighted when available, but the page avoids raw JSON and avoids diagnosis-heavy or score-heavy language.

### Advisor AI Module Response Insights hardening

The module-insights API now catches malformed interactive-data JSON before cleaning responses and merges cleaned response groups without overwriting same-module data from another source. Cleaned responses remain read-only/reporting-only; stored client data is not mutated.

### Session Prep sparse-data prompt hardening

The Session Prep AI prompt now explicitly includes the `session-opening questions` verification phrase in the required suggested-opener section. The endpoint still generates even when the available data is sparse and avoids diagnosis, risk scoring, and “safe/low-risk” conclusions.

### Client input visibility copy

Life Integration reflection copy has been normalized to the intended Advisor-visible language: “Your Advisor can review this to support your work together.” New Life Integration reflections continue to default to `is_private: false` and `shared_with_advisor: true`.

## Verification notes by area

### Build / import / route integrity

- Primary imports were inspected in `src/App.jsx`, `src/components/Navbar.jsx`, the Advisor report/homework/dashboard components, AI formatting components, and the requested API handlers.
- No merge-conflict markers were found.
- No active medication routes were added.
- A historical `src/pages/MedicationInfo.jsx` file exists in the repository tree but is not imported or routed by `src/App.jsx`; it is not an active card, route, or placeholder.

### `/curriculum` and `/my-ifs` consistency

- `/curriculum` and `/my-ifs` rely on `buildSharedCurriculumSummary` from `src/lib/curriculumExperience.js` for completed counts, current/next module, latest completed module, and assigned-module status.
- `/my-ifs` resolves the signed-in Advisor/Admin self-work profile through `loadMyIFSProfile` and passes that resolved client id into `Home`, avoiding name-only matching and global client loading.
- Curriculum reflection counts are loaded from the same curriculum-reflection helper path used by the Home and Curriculum surfaces.

### Profile Attachment Pattern Assessment

- `/profile` displays Attachment Pattern Assessment, primary pattern, secondary pattern when present, and explanatory copy for secure, anxious, avoidant, and disorganized patterns.
- Language frames attachment as learned protective/relational patterns that can be explored compassionately in parts work, not as diagnoses.

### Settings / gear data recovery tools

- Legacy/recovery tools remain under settings/gear or context-specific surfaces.
- Main Home does not overemphasize recovery.
- Import Existing Parts Map remains manually triggered and requires preview/confirmation; no auto-import behavior was introduced.
- Connect My IFS Profile is exposed only when relevant for Advisor/Admin self-work recovery.

### Navbar Advisor Dashboard duplicate

- The visible text link “Advisor Dashboard” is not present as a redundant nav item.
- The clipboard icon remains the Advisor/Supervisor workspace entry point.
- Admin/Supervisor users keep Admin Hub access; client-only users do not see Advisor/Admin workspace tools.

### Advisor Reports response-cleaning QA

- `isMeaningfulModuleResponse` filters meaningless display/report values such as single letters, punctuation-only strings, timestamps, “answered,” and trivial placeholders (`.`, `-`, `n/a`, `na`, `none`).
- Meaningful short responses such as yes, no, fear, anger, shame, part names, and Self-energy qualities are preserved.
- Cleaning is applied while building Advisor reports/insights and does not mutate stored rows.

### Advisor AI Module Response Insights

- Endpoint requires Advisor/Admin/Supervisor access through `requireTherapist`.
- Non-admin Advisors require active assignment before client data is loaded.
- Clients cannot call the endpoint.
- Data loads are scoped to the selected client id and date range.
- Cleaned responses are used, malformed JSON is skipped safely, and long reflection/prompt content is truncated before prompt inclusion.
- Prompt instructions prohibit diagnosis, risk scoring, safety conclusions, final notes, and treatment plans.
- Response payload includes: “AI-generated preparation aid for Advisor review only. Not a diagnosis, risk assessment, or clinical conclusion.”
- UI generation displays the result for Advisor review and does not auto-save an Advisor note.

### Session Prep sparse-data QA

- No sparse-data hard block remains.
- Session Prep AI generation proceeds with limited data and instructs the model to state that available data is limited, summarize what is available, list missing areas, include session-opening questions, and provide Advisor clarification prompts.
- Prompt still avoids diagnosis, risk scoring, and safe/low-risk language.

### AI worksheet / assessment formatting QA

- `FormattedAIContent` renders markdown bold, bullets, numbered lists, paragraphs, and headings through React elements.
- There is no `dangerouslySetInnerHTML` usage in `src` or `api`.
- Advisor-generated descriptions remain editable before assignment.

### Interactive worksheet / virtual paper QA

- Structured activity blocks render as in-app worksheets when present.
- Virtual paper/freeform response areas appear for paper-like activities and fallback rendering.
- Client responses continue through the existing assigned-practice response flow when a caller provides `value`/`onChange` integration.
- No new heavy dependency was added.

### Client input visibility to Advisor

- Client-facing “keep private” controls and “Private unless shared” copy were not found in active Life Integration reflection UI.
- New Life Integration reflections default to `is_private: false` and `shared_with_advisor: true`.
- Curriculum reflections normalize to `isPrivate: false` and `sharedWithAdvisor: true`.
- Advisor access to client reflections still requires assignment.
- No historical backfill was performed; historical private records may remain private until a separate migration is intentionally planned.

### Advisor Dashboard layout QA

The Advisor Dashboard keeps a top-to-bottom workflow focused on:

1. Today / Needs Attention
2. Selected Client
3. Session Prep
4. Review Module Responses / Generate AI Insights
5. Assigned IFS Practice Generator
6. Reports / Longitudinal Insights
7. Live Guided Practice
8. Settings / Admin Tools

High-frequency client-context actions are near the top, Reports/Insights are grouped, Practice/Assessment generators remain visible, and admin-only tools remain role-limited.

### Security / authorization regression QA

- Client-only wrappers remain in `src/App.jsx`.
- Advisor/Admin wrappers remain in `src/App.jsx`.
- FeatureGate wrappers remain in `src/App.jsx`.
- Advisor assignment checks remain in report, session prep, module insights, and Life Integration Advisor-access flows.
- Advisor notes remain protected from client access.
- No name-based matching or unsafe global client loading was added.

### Medication artifact result

Medication remains out of scope. No medication route, nav item, card, placeholder, advice, tracking, or management feature was added.

Search notes:

- Documentation intentionally mentions medication only to record that it remains excluded.
- A historical CSV journal entry contains the word “medication.” It is not active app UI.
- The historical `src/pages/MedicationInfo.jsx` file is not imported or routed.

### SQL / migrations

- No SQL was added.
- No migrations were added.
- `neon/999_backfill_therapist_assignments.sql` was not run.

## Remaining limitations / follow-up tasks

- Historical private Life Integration or curriculum reflection records were not backfilled in this phase by design.
- The repository still contains an unrouted historical `src/pages/MedicationInfo.jsx` file. It is inactive, but a future cleanup pass could delete it if desired.
- Interactive worksheet `sort` support uses number inputs rather than drag-and-drop to avoid adding a heavy dependency.
- The build currently reports existing Vite/browser-data/chunk-size warnings; these warnings do not block production build output.

## Build result

`npm run build` completed successfully on 2026-06-05 after Phase 18B hardening. Existing Vite/browser-data/chunk-size warnings were observed and documented as non-blocking.
