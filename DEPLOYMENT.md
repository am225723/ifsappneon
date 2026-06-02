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
OPENAI_API_KEY
```

`OPENAI_API_KEY` must remain server-side only. Do not create a `VITE_OPENAI_API_KEY` variable.

## ⚙️ Optional Environment Variables

```text
CLERK_AUTHORIZED_PARTIES
```

Use `CLERK_AUTHORIZED_PARTIES` when Clerk JWT verification should be restricted to known production/preview origins.

Upload support also uses the existing UploadThing server variables when upload flows are enabled:

```text
UPLOADTHING_APP_ID
UPLOADTHING_SECRET
UPLOADTHING_CALLBACK_URL
```

## 🔐 Server/Client Boundary Expectations

- `DATABASE_URL`, `CLERK_SECRET_KEY`, and `OPENAI_API_KEY` are read by server-side API code only.
- Frontend code may use `VITE_*` variables only for non-secret client configuration.
- UploadThing database writes must remain in the server router under `api/_uploadthingRouter.js`.
- Session prep summaries use the OpenAI server API path and do not require Perplexity/PPLX configuration.

## ✅ Pre-Deploy Verification

Run these before relying on a preview deployment:

```bash
npm ci
npm run build
git diff --check
rg "uploadthing|_uploadthingRouter|DATABASE_URL|CLERK_SECRET_KEY" src api
rg "OPENAI_API_KEY|VITE_OPENAI_API_KEY|DATABASE_URL|CLERK_SECRET_KEY|CLERK_AUTHORIZED_PARTIES|PERPLEXITY|PPLX" src api . --glob '!node_modules'
```

A successful local build plus a successful Vercel Preview Build means the app is ready to promote.
