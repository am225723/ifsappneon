# Vercel Deployment Readiness

## Current Status

Phase 5B verified the install/build path for Vercel deployment readiness:

- `npm ci` succeeds from the committed `package-lock.json`.
- `npm run build` succeeds with Vite available from `npm ci`.
- Build artifacts are emitted to `dist/` and should not be committed.
- Serverless API routes remain under `api/`.

## Vercel Configuration

`vercel.json` is configured for a Vite build:

```text
buildCommand: npm run build
outputDirectory: dist
framework: vite
```

The rewrite order keeps `/api/*` requests routed to Vercel serverless functions before the SPA fallback to `/index.html`.

## Required Vercel Environment Variables

```text
DATABASE_URL
CLERK_SECRET_KEY
OPENAI_API_KEY
```

Do not expose `OPENAI_API_KEY`, `DATABASE_URL`, or `CLERK_SECRET_KEY` as frontend `VITE_*` variables.

## Optional Vercel Environment Variables

```text
CLERK_AUTHORIZED_PARTIES
```

Upload flows also require the existing UploadThing variables when enabled:

```text
UPLOADTHING_APP_ID
UPLOADTHING_SECRET
UPLOADTHING_CALLBACK_URL
```

## Deployment Gate

Use the Vercel Preview Build as the final deployment gate after configuring environment variables. If preview fails, capture the exact package, API route, or build error from Vercel logs before changing dependencies or application code.
