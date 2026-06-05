# Phase 18A — Data Consistency, Advisor Reporting, Navigation Cleanup, and AI Worksheet Usability QA

## Scope

Phase 18A repairs user-facing consistency and Advisor workflow polish without adding medication, billing, diagnosis, risk scoring, emergency monitoring, EHR, telehealth, or SQL migrations.

## Implemented

- `/curriculum` and `/my-ifs` now share curriculum summary logic through `buildSharedCurriculumSummary`, including completed modules from `ifs_client_progress` and curriculum rows from `ifs_interactive_data`.
- My IFS mode continues to use the resolved self-profile/effective client id without name matching, hard-coded client ids, or global client loading.
- `/profile` now explains Attachment Pattern Assessment results with friendly, client-safe descriptions for secure, anxious, avoidant, and disorganized patterns.
- Legacy/recovery actions are grouped under the Settings gear in **Data Recovery Tools**: Connect My IFS Profile, Import Existing Parts Map, Review Legacy Assessment Data, and Data Recovery Tools.
- The visible Advisor Dashboard text link was removed from the top Navbar for Advisor roles; the clipboard icon and routes remain.
- Advisor reports and dashboard module-response views use conservative response cleaning to filter placeholders, single letters, punctuation-only values, date/time-only values, `answered`, and duplicated low-value responses without mutating stored data.
- Added `/api/ai-module-response-insights` for assigned Advisor/Admin/Supervisor module-response insight generation using the existing OpenRouter provider and assignment checks.
- Session Prep AI no longer blocks when data is sparse; it instructs the model to include sparse-data structure and session-opening questions.
- Added safe AI formatting with `FormattedAIContent` for bold markdown, bullets, numbered lists, and readable sections without unsafe HTML injection.
- Added `InteractiveWorksheetRenderer` foundation with normalized activity block schema support for instruction, question, textarea, checklist, rating, virtual_paper, sort, and match; fallback includes virtual paper.
- Advisor Dashboard now surfaces Needs Attention, Selected Client context, Session Prep, Module Response Insights, Practice Generator, Reports/Insights, Live Practice, and Settings/Admin tools in the workflow.
- Client Life Integration and curriculum reflection controls no longer offer private/share toggles. New entries are stored as `is_private: false` / `shared_with_advisor: true` where those flags exist, and UI copy says the assigned Advisor can review reflections.

## Security Notes

- Advisor access remains assignment-scoped via existing wrappers and active assignment checks.
- No client data is exposed to unassigned Advisors.
- Advisor notes are not exposed to clients.
- Existing records were not backfilled; no SQL migration was added.

## Explicit Non-Goals Confirmed

- No medication features were added.
- No billing/Stripe features were added.
- No SQL migrations were added or run.
- `neon/999_backfill_therapist_assignments.sql` was not run.

## Follow-Up Considerations

- Existing historical records with old privacy flags may require a future explicit migration if product decides to backfill visibility.
- Structured AI activity blocks are supported as a foundation; richer drag/drop activity editing remains future work.
