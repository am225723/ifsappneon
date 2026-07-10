---
name: testing-serverless-api-auth
description: Test auth/security changes to the Vercel serverless API endpoints (api/*.js) in this IFS app. Use when verifying authentication, authorization, or dependency changes without full Clerk/Neon credentials.
---

# Testing serverless API auth changes (ifsappneon)

This app is a Vite React front-end + Vercel serverless functions (`api/*.js`) backed by
Clerk auth and a Neon Postgres DB. Endpoints authenticate via `api/_auth.js`
(`getCurrentAppUserFromClerk` / `verifyClerkUser`), which reads a Clerk bearer token from
`Authorization` and requires `CLERK_SECRET_KEY` + `DATABASE_URL` env vars.

## Key constraints learned
- **The Vercel PR preview is behind Vercel deployment SSO protection.** Anonymous requests
  get a platform `302 → vercel.com/sso-api` (GET) or `401 {"protection":{"vercel_auth_enabled":true}}`
  (POST) *before reaching app code*, so you cannot verify the app's own auth response through the
  preview URL without a `VERCEL_AUTOMATION_BYPASS_SECRET` or disabling protection.
- **Production (`https://ifsappnew.vercel.app`) runs the old/base code** and is publicly reachable —
  ideal for capturing "before" behavior in a before/after security test.
- **Clerk/Neon credentials are usually NOT present** in the Devin env (`/run/repo_secrets/ifsappneon/`
  and env vars were empty). So full authenticated end-to-end flows often can't be run; say so
  explicitly rather than faking it.

## Recommended approach for an auth/security fix
1. Capture "before" from production with `curl -i` (this is the legitimate unauthenticated path,
   not cookie theft):
   `curl -i "https://ifsappnew.vercel.app/api/<endpoint>?..."`.
2. Capture "after" by executing the *changed handler directly* with a mock `req`/`res` in a
   throwaway `.mjs` script (the handler is an ESM default export). Assert `res.statusCode`, JSON
   body, and any streamed writes. Example mock `res`: implement `setHeader/writeHead/write/status/json/on`.
   - No `Authorization` and no `?token=` → `verifyClerkUser` throws 401 before touching env (deterministic).
   - To exercise the Clerk-verify path with a forged token, set a dummy `CLERK_SECRET_KEY=sk_test_dummy`;
     an invalid token then yields 401 (without the key set it's a 500 env error, which is expected).
3. Front-end token wiring (EventSource can't send headers, so a Clerk token is passed as `?token=`;
   fetch POSTs use `Authorization: Bearer`): confirm via `getClerkBearerToken()` usage in source and by
   grepping the built bundle (`npm run build` then grep `dist/assets/index-*.js`). This is static only —
   a true logged-in round-trip needs real Clerk keys.

## Build / dep checks
- `npm run lint` (eslint, warnings only), `npm run build` (vite → `dist/`).
- `npm audit --omit=dev` for dependency advisories. Note the app had unused `gh`/`github` deps that
  pulled in most vulns; confirm removals with `git grep "from 'gh'|'github'"`.

## Devin Secrets Needed
- To run the authenticated end-to-end UI flow (not required for the API-level before/after test):
  `CLERK_SECRET_KEY`, `VITE_CLERK_PUBLISHABLE_KEY`, `DATABASE_URL`.
- To reach the Vercel preview through SSO: `VERCEL_AUTOMATION_BYPASS_SECRET` (or disable Deployment Protection).
