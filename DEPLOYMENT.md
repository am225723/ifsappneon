# 🚀 Deployment Guide

## Quick Start

This repository deploys as a Vite React application with Vercel serverless API routes in `api/`.

## 📦 Production Build

Install exactly from the lockfile and build the Vite app:

```bash
npm ci
npm run build
```

The production-ready frontend files are emitted to `dist/`. Serverless API handlers remain in `api/` for Vercel.

## 🌐 Vercel Deployment

The repo includes `vercel.json` with:

- build command: `npm run build`
- output directory: `dist`
- framework: `vite`
- SPA rewrites that keep `/api/*` routed to Vercel serverless functions before falling back to `index.html`

Connect the repository in Vercel and use the committed lockfile as the dependency source. The deployment gate should be a clean Vercel Preview Build after the required environment variables below are configured.

## ⚙️ Required Environment Variables

Configure these in Vercel Project Settings → Environment Variables:

```text
DATABASE_URL
CLERK_SECRET_KEY
OPENROUTER_API_KEY
```

`OPENROUTER_API_KEY` must remain server-side only. Do not create a `VITE_OPENROUTER_API_KEY` variable. OpenRouter is the application AI provider; previous providers are no longer required for runtime AI workflows.

## ⚙️ Optional Environment Variables

```text
CLERK_AUTHORIZED_PARTIES
OPENROUTER_MODEL=openrouter/free
OPENROUTER_SITE_URL
OPENROUTER_APP_TITLE=IFS App
```

Use `CLERK_AUTHORIZED_PARTIES` when Clerk JWT verification should be restricted to known production/preview origins. `OPENROUTER_MODEL` defaults to `openrouter/free`; `OPENROUTER_SITE_URL` and `OPENROUTER_APP_TITLE` are optional OpenRouter attribution headers.

Upload support uses the current UploadThing v7 server token when upload flows are enabled:

```text
UPLOADTHING_TOKEN
UPLOADTHING_CALLBACK_URL   # optional, only when the deployed callback origin needs an override
```

Legacy `UPLOADTHING_APP_ID` / `UPLOADTHING_SECRET` values may remain in older Vercel environments, but the current server route prefers `UPLOADTHING_TOKEN`. Do not create `VITE_UPLOADTHING_*` variables for secrets. Guided Meditation never depends on UploadThing being configured; missing media falls back to on-screen grounding practice.

## 🔐 Server/Client Boundary Expectations

- `DATABASE_URL`, `CLERK_SECRET_KEY`, and `OPENROUTER_API_KEY` are read by server-side API code only.
- Frontend code may use `VITE_*` variables only for non-secret client configuration.
- UploadThing database writes must remain in the server router under `api/_uploadthingRouter.js`.
- Session prep summaries, Advisor note drafts, Assigned IFS Practice drafts, Curriculum support, Life Integration prompts, Parts Work guidance, educational content, and generic drafting use the OpenRouter server API path. Perplexity and OpenAI are no longer required for runtime AI workflows.

## ✅ Pre-Deploy Verification

Run these before relying on a preview deployment:

```bash
npm ci
npm run build
git diff --check
rg "uploadthing|_uploadthingRouter|DATABASE_URL|CLERK_SECRET_KEY" src api
rg "OPENROUTER_API_KEY|VITE_OPENROUTER_API_KEY|DATABASE_URL|CLERK_SECRET_KEY|CLERK_AUTHORIZED_PARTIES|OPENROUTER_MODEL|OPENROUTER_SITE_URL|OPENROUTER_APP_TITLE" src api . --glob '!node_modules'
```

A successful local build plus a successful Vercel Preview Build means the app is ready to promote.
