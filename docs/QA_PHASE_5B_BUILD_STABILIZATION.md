# Phase 5B — Build Stabilization and Vercel Readiness

This checklist records the dependency, build, server/client boundary, and Vercel deployment checks for Phase 5B. This phase intentionally does not add clinical product features or new AI/reporting capabilities.

## Dependency and install verification

- [x] Confirm Node and npm are available in the build environment.
- [x] Confirm npm registry is `https://registry.npmjs.org/`.
- [x] Run `npm ci` from the committed lockfile.
- [x] Avoid broad dependency upgrades.
- [x] Confirm no future-only dependency on `@ai-sdk provider packages`, `ai`, `@react-pdf/renderer`, `recharts`, Puppeteer, or Chromium was introduced.

## Build verification

- [x] Run `npm run build` successfully with Vite available from `npm ci`.
- [x] Treat Vite chunk-size and browsers data messages as warnings, not deployment blockers.
- [x] Keep generated `node_modules/` and `dist/` artifacts out of version control.

## UploadThing server boundary

- [x] UploadThing route imports the server router from `api/_uploadthingRouter.js`.
- [x] Upload database writes remain in server-side API code.
- [x] Frontend `src` code does not import `api/_uploadthingRouter.js` or server-only UploadThing/database modules.
- [x] `DATABASE_URL` and `CLERK_SECRET_KEY` remain server-only and are not accessed through Vite frontend variables.

## Environment secret boundary

Required Vercel environment variables:

```text
DATABASE_URL
CLERK_SECRET_KEY
OPENROUTER_API_KEY
```

Optional Vercel environment variables:

```text
CLERK_AUTHORIZED_PARTIES
OPENROUTER_MODEL=openrouter/free
OPENROUTER_SITE_URL
OPENROUTER_APP_TITLE=IFS App
```

Validation expectations:

- [x] `OPENROUTER_API_KEY` is read only by server-side API code.
- [x] `DATABASE_URL` is read only by server-side API code.
- [x] `CLERK_SECRET_KEY` is read only by server-side API code.
- [x] No frontend `VITE_OPENROUTER_API_KEY` usage exists; do not create this variable.
- [x] Session prep summaries, Advisor note drafts, Assigned IFS Practice drafts, Curriculum support, Life Integration prompts, Parts Work guidance, educational content, and generic drafting use the OpenRouter server provider. OpenAI and Perplexity are no longer required for runtime AI workflows.

## Security regression checks

- [x] No unsafe global client loading pattern remains from `ifs_clients` filtered only by `user_role = client`.
- [x] Assignment-scoped therapist/client helpers and routes remain referenced.
- [x] Clinical tables for assigned homework, session agendas, treatment plans, and generated reports remain referenced by secured code.
- [x] Therapist notes and tagged note metadata remain therapist-only and remain blocked from clients by server-side table authorization.

## Deployment readiness result

Phase 5B is Vercel-ready when `npm ci`, `npm run build`, and the security boundary checks pass locally and the required Vercel environment variables above are configured in the Vercel project.
