# Phase 18C — Security, Runtime-Lint, Dependency, and Build Hardening

Date: 2026-06-05

## Scope

Phase 18C was a production-risk hardening pass only. No product features, dashboards, AI workflows, assessment engines, SQL, migrations, medication routes, or broad dependency upgrades were added.

## Correct repo and baseline

Verified the checkout from `/workspace/ifsappneon` contains `package.json`, `src/App.jsx`, `api/db.js`, and `neon/`. Baseline `git diff --check` and merge-conflict-marker scans passed. `npm install` completed with the existing npm `http-proxy` warning, and `npm run build` passed before code changes.

## Security and data-access review

Reviewed the requested API and Advisor/client files, including `api/db.js`, `api/life-integration.js`, `api/healing-timeline/client.js`, `api/parts-import.js`, Advisor AI endpoints, report generation, assignment helpers, and active Advisor-facing pages.

Results:

- The unsafe global client-loading search returned no active matches for broad `.eq('user_role', 'client')` loading.
- Advisor-facing client lists continue to use assignment-scoped helpers or secure API assignment checks.
- Client/self-work views continue to use the current self-owned client/profile id rather than global client loading.
- Advisor notes remain blocked from client/self-owned data access.
- AI module response insights remain Advisor/Admin/Supervisor only and assignment-scoped.
- Life Integration and curriculum reflections remain scoped to assigned Advisor/self-owner access.

Hardening fix:

- `api/life-integration.js` now honors the `shared` argument in the share/unshare handler so unsharing sets `shared_with_advisor = false` and returns the reflection to private status instead of always leaving it Advisor-visible.

## Medication artifact result

The medication search returned only documentation references that explicitly document medication exclusion, plus a historical CSV journal entry containing the word “medication.” No active medication route, nav item, card, placeholder, advice, tracking, or management feature was found or added.

## Runtime-risk lint triage

Baseline lint reported 145 errors and 30 warnings. Phase 18C fixed the high-priority runtime-risk classes listed below:

- Removed obsolete file-level `/* global process */` redeclarations from server API files now covered by ESLint Node globals.
- Fixed frontend `process.env` usage in `ClientPINLogin` by using Vite `import.meta.env.DEV`.
- Fixed undefined runtime references in `Home` (`settledDataResult`, `selfProfileForLoad`) and `Profile` (`miles`).
- Fixed conditional React Hook ordering in `LearningModuleRenderer`.
- Moved function declarations above effects/callbacks where the React Hooks lint identified before-declaration runtime/stale-closure risk in active pages.
- Removed small unused variables in touched production/server files where they were part of the hardening changes.

Post-hardening lint still reports 111 errors and 30 warnings. Deferred items are intentionally out of scope for this phase and are primarily broad existing `react-hooks/set-state-in-effect`, old unused variables, fast-refresh-only-export warnings, minor purity/no-empty/no-useless-escape findings, and broad hook dependency warnings. None of the remaining errors are merge conflicts, parsing errors, undefined variables, conditional hook calls, server `process` environment errors, or before-declaration hook immutability findings.

## Dependency audit and outdated review

`npm audit` could not retrieve advisory data because the npm registry returned `403 Forbidden` for the audit bulk endpoint in this environment. Therefore:

- Vulnerabilities before: unknown due registry `403 Forbidden`.
- Vulnerabilities after: unknown due registry `403 Forbidden`.
- `npm audit fix` was not run.
- `npm audit fix --force` was not run.
- No dependency upgrades were performed.
- `package-lock.json` was not changed by this phase.

`npm outdated || true` was also blocked by npm registry `403 Forbidden`, so package currency should be reviewed in a later dependency-upgrade phase with registry access.

## AI / OpenRouter runtime check

OpenRouter remains server-side only through API modules using `callOpenRouterChat`. No frontend `VITE_OPENROUTER`, `VITE_PERPLEXITY`, or `VITE_OPENAI` runtime key was found. No active Perplexity runtime usage was found. OpenAI runtime usage was not introduced. AI Advisor outputs continue to include review-only language where applicable, and API error responses return codes/messages rather than secret values.

## Route and blank-page recovery

Route recovery remains intact:

- `RouteErrorBoundary` still wraps authenticated routes.
- The wildcard `NotFound` route remains in `src/App.jsx`.
- Profile keeps visible loading/error/empty states.
- My IFS Work/Home retains visible partial-data messaging (`Some parts of your IFS path could not be refreshed...`).
- No route behavior changes required updating `docs/ROUTE_NAVIGATION_AUDIT.md`.

The `return null` scan still has component/modal/inline-renderer null returns and known active-page component branches, but no new route-level blank-page regression was introduced by Phase 18C.

## Phase preservation checks

Phase preservation searches confirmed the Phase 17B, 16A/16B, 18A, and 18B artifacts remain present:

- Curriculum reflections and private reflection prompts remain present.
- Life Integration display/Advisor-visible language remains present.
- AI worksheet rendering/structured block markers remain present.
- Module response insights and meaningful-response cleanup remain present.
- Attachment Pattern Assessment explanatory content remains present.

## Build result

`npm run build` passes after Phase 18C. Existing Vite warnings remain for large chunks and mixed static/dynamic imports; those are build-health warnings, not build failures.

## SQL and migrations

No SQL was added, no migrations were added, and `neon/999_backfill_therapist_assignments.sql` was not run.

## Known follow-up tasks

1. Run `npm audit` and `npm outdated` again in an environment with npm registry advisory access.
2. Consider a dedicated lint cleanup phase for existing broad `react-hooks/set-state-in-effect`, unused variable, fast-refresh, hook dependency, and cosmetic lint findings.
3. Consider deleting historical unrouted medication files/fixtures in a future cleanup if product owners want zero repository-level medication text outside documentation and historical data.
4. Consider a build-performance/code-splitting phase for the existing Vite large-chunk warnings.
