# Phase 19A — Production Readiness, Deployment Verification, and Final Launch Checklist

Date: 2026-06-05  
Scope: final pre-production readiness pass for the IFS app after Phase 17B–18C stabilization/hardening.

## Executive summary

Phase 19A is a production-readiness verification pass with documentation plus a small AI provider error-hygiene hardening. No product features, SQL, Neon migrations, medication workflows, or broad dependency upgrades were added. The app is ready for a Vercel preview deployment gate once production environment variables are configured and the known non-blocking warnings below are accepted.

## 1. Required production environment variables

Configure these as server-side Vercel environment variables for Production and Preview before deployment:

```text
DATABASE_URL
CLERK_SECRET_KEY
OPENROUTER_API_KEY
```

Notes:

- `DATABASE_URL` should be the pooled Neon Postgres connection string for serverless usage.
- `CLERK_SECRET_KEY` is used only by serverless API authentication helpers.
- `OPENROUTER_API_KEY` is used only by serverless AI provider helpers.

## 2. Optional production environment variables

Configure these only when the corresponding production behavior is needed:

```text
CLERK_AUTHORIZED_PARTIES
OPENROUTER_MODEL
OPENROUTER_SITE_URL
OPENROUTER_APP_TITLE
UPLOADTHING_APP_ID
UPLOADTHING_SECRET
UPLOADTHING_CALLBACK_URL
```

Notes:

- `OPENROUTER_MODEL` defaults to `openrouter/free` when unset.
- `OPENROUTER_SITE_URL` and `OPENROUTER_APP_TITLE` provide optional OpenRouter attribution headers.
- `CLERK_AUTHORIZED_PARTIES` should be populated for production/preview origin restrictions if Clerk JWT authorized-party enforcement is desired.
- UploadThing variables are required only if upload flows are enabled in the deployed environment.

## 3. Frontend-safe environment variables

The only frontend-safe variable currently expected by the app is:

```text
VITE_CLERK_PUBLISHABLE_KEY
```

The app also contains an existing frontend API path override:

```text
VITE_DATA_API_PATH
```

This is non-secret and defaults to `/api/db` when unset.

A legacy SSO callback path currently reads one additional frontend variable:

```text
VITE_JWT_SECRET
```

Because every `VITE_*` value is bundled into frontend code, do not place a real production secret in `VITE_JWT_SECRET`. Leave it unset unless the legacy SSO callback is deliberately used with a non-secret compatibility value; prefer Clerk/server-side verification for production SSO.

## 4. Variables that must never be frontend `VITE_*` secrets

Do not create or expose any of these variables:

```text
VITE_OPENROUTER_API_KEY
VITE_OPENAI_API_KEY
VITE_PERPLEXITY_API_KEY
```

Also do not expose server secrets through any other `VITE_*` alias, including `DATABASE_URL`, `CLERK_SECRET_KEY`, `OPENROUTER_API_KEY`, UploadThing server secrets, or any real JWT signing/verifying secret.
Also do not expose server secrets through any other `VITE_*` alias, including `DATABASE_URL`, `CLERK_SECRET_KEY`, `OPENROUTER_API_KEY`, or UploadThing server secrets.

## 5. Production build commands

Use the lockfile install path for deployment verification:

```bash
npm ci
npm run build
```

For local final verification in this phase, `npm install` was also run because the Phase 19A checklist explicitly requested it. It did not change `package-lock.json`.

## 6. Vercel deployment notes

- Vercel should use `npm run build`.
- Output directory is `dist`.
- Serverless API routes remain under `api/`.
- SPA fallback rewrites should keep `/api/*` routed to API handlers before falling back to `index.html`.
- Promote only after a clean Vercel Preview Build with the required environment variables configured.

## 7. Neon production SQL status

No SQL was added in Phase 19A. No migrations were added. The manual script below was not run and remains explicitly out of scope for this phase:

```text
neon/999_backfill_therapist_assignments.sql
```

## 8. Manual SQL still pending from earlier phases

No new manual SQL is required for Phase 19A. If an environment has not already completed earlier assignment/data hardening SQL from prior phases, handle that as a separate planned database task; do not run backfill SQL as part of this launch checklist without an explicit database operations window.

## 9. Route smoke checklist

### Client/self-work routes verified in `src/App.jsx`

- `/`
- `/home` redirects to `/`
- `/my-ifs`
- `/my-ifs-path` redirects to `/my-ifs`
- `/profile`
- `/tools`
- `/curriculum`
- `/curriculum/module/:moduleId`
- `/assessments`
- `/journal`
- `/parts-relationships`
- `/parts-mapping`
- `/parts-dialogue`
- `/life-integration`
- `/life-integration/notice-part`
- `/life-integration/return-to-self`
- `/life-integration/trigger-reflection`
- `/life-integration/repair-after-conflict`
- `/life-integration/protector-check-in`
- `/life-integration/needs-boundaries`
- `/healing-timeline`
- `/progress-timeline`
- `/meditation`

### Advisor/Admin routes verified in `src/App.jsx`

- `/therapist` redirects to `/therapist-dashboard`
- `/admin` redirects by role to `/admin-hub` or `/therapist-dashboard`
- `/advisor-homework`
- `/assessment-builder`
- `/reports`
- `/analytics`
- `/longitudinal-analytics`
- `/live-co-therapy`
- `/caseload`
- `/advisor/shared-reflections`

### Recovery routes verified

- `RouteErrorBoundary` wraps the authenticated route table.
- Wildcard route renders `NotFound`.
- Recovery copy for profile/IFS-path refresh fallbacks remains present in `src/`.

## 10. Role/authorization checklist

Verified by code inspection and required searches:

- Client workspace routes are guarded by `clientOnly` where required.
- Advisor/Admin routes are guarded by `therapistOnly` or Admin/Supervisor-specific checks.
- Admin Hub requires Admin or Supervisor role.
- Tools Directory receives the current client context and remains role-aware.
- Advisor client lists use assignment-scoped loading through `loadAssignedClients` and `/api/therapist/assigned-clients`.
- Self-owned API access remains exact-client-ID scoped.
- `ifs_therapist_notes` is not in the self-owned allow-list.
- Advisor notes remain blocked from client/self-owned access.
- AI module response insights require Advisor/Admin/Supervisor role plus assignment to the selected client.
- No unsafe global `ifs_clients` client-role loading pattern was found by the Phase 19A search.
- No name-based client matching was introduced.

## 11. AI/OpenRouter checklist

Verified by code inspection and required searches:

- OpenRouter remains server-side only through `api/_aiProvider.js` and API handlers.
- No frontend `VITE_OPENROUTER`, `VITE_OPENAI`, or `VITE_PERPLEXITY` key usage exists.
- No active Perplexity runtime call exists.
- No active OpenAI runtime call exists.
- AI provider errors return safe status/code messages and no longer forward upstream provider payload text, reducing the risk of leaking secrets, request metadata, or raw client content.
- Advisor AI outputs remain review-only.
- Module response insights include the Advisor-review-only disclaimer.
- Session Prep prompts avoid diagnosis, risk scoring, safety conclusions, and “safe/low-risk” conclusions.

## 12. UploadThing checklist

UploadThing remains optional. If enabled in production:

- Configure `UPLOADTHING_APP_ID`.
- Configure `UPLOADTHING_SECRET`.
- Configure `UPLOADTHING_CALLBACK_URL` when required by the deployed callback origin.
- Keep UploadThing server secrets out of `VITE_*` variables.
- Keep UploadThing database writes inside server-side API/router code.

## 13. Medication artifact result

Medication remains out of scope. Phase 19A found no active medication routes, cards, placeholders, advice, tracking, or management workflows in `src` or `api`. The remaining medication search hits are documentation that explicitly records medication exclusion and one historical migration CSV journal entry. No `/medication`, `/medications`, or `/medication-management` route exists in `src/App.jsx`.

## 14. Client journey smoke result

Code-level smoke review completed for:

- `/my-ifs`
- `/home`
- `/curriculum`
- `/curriculum/module/module-1-intro-ifs`
- `/profile`
- `/tools`
- `/assessments`
- `/journal`
- `/parts-relationships`
- `/life-integration`
- `/progress-timeline`
- `/healing-timeline`

Expected behavior remains preserved by code inspection: route recovery exists, My IFS/profile/curriculum routes are present, Tools Directory receives role context, Life Integration reflection routes remain client-scoped, and no blank-page route gaps were identified in the route table. Browser smoke testing was not added because no browser automation was requested or already required for this phase.

## 15. Advisor/Admin journey smoke result

Code-level smoke review completed for:

- `/therapist`
- `/admin`
- `/advisor-homework`
- `/assessment-builder`
- `/reports`
- `/analytics`
- `/longitudinal-analytics`
- `/live-co-therapy`
- `/caseload`
- `/advisor/shared-reflections`

Expected behavior remains preserved by code inspection: Advisor/Admin routes are role-gated, dashboards and Advisor tools load assignment-scoped clients, module response insights are Advisor-visible, reports use cleaned module response utilities, and shared Life Integration reflections require assignment-scoped Advisor access.

## 16. Build, lint, audit, and dependency verification

Commands run during Phase 19A:

```bash
npm install
npm run build
npm run lint || true
npm audit || true
npm outdated || true
```

Results:

- `npm install`: passed; no `package-lock.json` change.
- `npm run build`: passed.
- `npm run lint || true`: completed with existing deferred lint debt: 141 total problems, 111 errors and 30 warnings.
- `npm audit || true`: blocked by npm registry 403 on the audit endpoint.
- `npm outdated || true`: blocked by npm registry 403 while reading npm package metadata.

## 17. Known warnings

- Vite chunk size warning remains for the main app bundle.
- Vite reports dynamic/static import chunking warnings for shared modules.
- `baseline-browser-mapping` data is older than two months.
- Browserslist `caniuse-lite` data is stale.
- npm emits `Unknown env config "http-proxy"` in this environment.
- Existing lint debt remains deferred and non-blocking for this phase.
- npm audit/outdated are blocked by npm registry 403 in this environment.

## 18. Final go/no-go recommendation

Recommendation: **GO for Vercel Preview deployment**, with promotion to production only after:

1. Required production environment variables are configured server-side.
2. Vercel Preview Build passes with `npm run build`.
3. A human smoke test confirms authenticated Client and Advisor/Admin journeys against production-like Clerk/Neon data.
4. Known non-blocking warnings are accepted or scheduled for follow-up.

## 19. Follow-up tasks after launch gate

- Reduce Vite bundle size/code-splitting warnings.
- Refresh Browserslist/baseline browser data in a routine dependency maintenance pass.
- Pay down deferred lint debt without mixing it into launch documentation work.
- Re-run `npm audit` and `npm outdated` from an environment with npm registry access.
- Consider deleting historical documentation/data medication mentions only if product owners want repository text cleanup beyond active UI/code removal.
