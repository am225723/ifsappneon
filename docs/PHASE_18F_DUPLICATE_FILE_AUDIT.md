# Phase 18F Duplicate/Stale Artifact Audit + Phase 18G Follow-Up

## Phase 18F baseline

Phase 18F identified `src/pages/Home.jsx.backup` as the primary safe deletion candidate and retained `src/pages/Home.jsx` as the canonical active Home page. It did not approve deletion of meaningful source files beyond a later follow-up decision for that backup file.

## Phase 18G approved Home backup cleanup

- Approved removal completed: `src/pages/Home.jsx.backup` was deleted.
- Canonical file retained: `src/pages/Home.jsx`.
- Import/reference check before deletion found no active references to `src/pages/Home.jsx.backup`, `Home.jsx.backup`, or a Home backup import in `src`, `api`, `docs`, or repository files outside `node_modules`.
- Canonical Home route check found `src/App.jsx` imports `Home` from `./pages/Home`, and `src/pages/MyIFSWork.jsx` imports `Home` from `./Home`, confirming `src/pages/Home.jsx` remains the active Home implementation.
- Build verification after deletion passed.

## Phase 18G duplicate audio basename audit

Duplicate basename found: `attachment-assessment-intro.mp3`.

| Audio path | SHA-256 | References found | Recommendation |
| --- | --- | --- | --- |
| `public/audio/assessments/attachment-assessment-intro.mp3` | `6c0c5f07497340157ae1882a145b657a68ac05e7b95d12fdea940a7101221a4b` | Active assessment audio reference in `src/pages/Assessments.jsx`; recording-script references in `public/docs/assessment-recording-scripts.md`; filename references in `public/voice-scripts.txt`. | Keep. This is the active assessment-domain asset. |
| `public/audio/meditations/attachment-assessment-intro.mp3` | `6c0c5f07497340157ae1882a145b657a68ac05e7b95d12fdea940a7101221a4b` | No active `src` reference found by basename search; basename appears in shared public documentation/script text. | Remove later only after manual approval. The file is checksum-identical to the active assessment asset, but it sits in a separate audio domain and was not deleted in this pass. |

Result: the duplicate basename is a true byte-for-byte duplicate by checksum, but only the assessment path is actively referenced by app code. No audio files were deleted in Phase 18G because the meditations-domain copy may be a legacy/static asset requiring product-owner approval.

## Phase 18G route alias policy review

Canonical route policy was re-checked against `src/App.jsx` and `docs/ROUTE_NAVIGATION_AUDIT.md`.

- `/` is the canonical Home route; `/home` redirects to `/` with `replace`.
- `/my-ifs` is canonical for My IFS Work; `/my-ifs-path` redirects with `replace`.
- `/therapist-dashboard` is canonical for Advisor Dashboard; `/therapist` redirects with `replace`.
- `/admin-hub` is canonical for Admin/Supervisor workflow; `/admin` redirects with `replace` to `/admin-hub` for admin/supervisor users and `/therapist-dashboard` otherwise.
- `/assigned-practices` is canonical for assigned IFS practices; `/my-homework` and `/homework` redirect with `replace`.
- `/meditation` is canonical for guided meditation; `/guided-meditation` redirects with `replace`.
- `/parts-relationships` is canonical for the Inner System Map; `/parts-mapping`, `/parts-map`, and `/parts-relationship-map` redirect with `replace`.
- No medication route aliases were found in the active route table.

Result: legacy aliases remain intentional bookmark/deep-link compatibility redirects. The reviewed aliases use `Navigate` with `replace`, reducing browser Back loops or stale alias route states. No aliases were removed.

## Phase 18G curriculum component overlap audit

Reviewed files:

- `src/components/CurriculumSystem.jsx`
- `src/components/LearningModuleEnhanced.jsx`
- `src/components/LearningModuleRenderer.jsx`
- `src/lib/curriculumExperience.js`
- `src/lib/curriculumReflections.js`

Findings:

- Canonical curriculum landing component: `CurriculumSystem`, routed at `/curriculum` from `src/App.jsx`.
- Canonical module route wrapper: `LearningModuleRenderer`, routed at `/curriculum/module/:moduleId` from `src/App.jsx`.
- Canonical module experience component: `LearningModuleEnhanced`, rendered by `LearningModuleRenderer` with module data, completion handling, and reflection saving.
- Helper ownership: `curriculumExperience.js` owns shared curriculum summary/action/support-link helpers used by Home and Curriculum; `curriculumReflections.js` owns reflection load/save/count utilities used by Home, Journal, Progress Timeline, Curriculum, and module rendering.
- The apparent overlap is intentional layering: landing/catalog (`CurriculumSystem`), route/data wrapper (`LearningModuleRenderer`), and detailed lesson renderer (`LearningModuleEnhanced`).

Result: no curriculum components were deleted. No safe deletion candidates were identified for approval from this focused audit.

## Phase 18G historical medication / wrong-repo documentation review

Searches found medication references in documentation/audit notes, API prompt/validation prohibitions, and a historical migration CSV journal entry. Active app code continues to block medication suggestions/routes in guidance validation and prompt text. No active medication UI route, nav card, page import, or medication-management route was found in `src/App.jsx`.

Wrong-repo / Next-client-structure references remain documentation-only historical audit text where present. No active `client/src/App.tsx`, `client/src/pages`, `pages/_app.tsx`, `pages/404.tsx`, `components/route-error-boundary`, or `use-supabase-auth` app structure was found in active `src`/`api` code.

Historical warning: documentation references are historical only. Do not implement medication routes or wrong-repo Next/client structure.

## Phase 18G security/access recovery checks

- Unsafe global client-loading pattern search returned no matches for the targeted `ifs_clients` client-role-wide query pattern.
- Advisor notes and assigned-client access searches confirm protected note tables/utilities and assigned-client language remain present.
- Route recovery remains present through `RouteErrorBoundary` and `NotFound` in `src/App.jsx`, with user-facing recovery copy in `src/components/RouteErrorBoundary.jsx` and `src/pages/NotFound.jsx`.
- No role gates were intentionally loosened in this cleanup/audit pass.

## Phase 18G remaining deletion candidates requiring approval

- `public/audio/meditations/attachment-assessment-intro.mp3` — byte-for-byte duplicate of `public/audio/assessments/attachment-assessment-intro.mp3`, but not removed because it is a meaningful public audio asset in a separate domain.
- Historical documentation/data medication mentions — keep unless product owners approve repository-text cleanup beyond active UI/code removal.
