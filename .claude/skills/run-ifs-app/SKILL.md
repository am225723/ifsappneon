---
name: run-ifs-app
description: Run, start, build, screenshot, or verify the IFS Healing web app (Vite + React). Use when asked to run the app, take a screenshot, confirm a change works, or check that a page loads.
---

# run-ifs-app

The IFS Healing app is a Vite + React SPA with Vercel serverless functions. The driver is
`.claude/skills/run-ifs-app/driver.mjs`; it starts the dev server if needed, loads the page
with Playwright (headless Chromium), and verifies the brand CSS loaded. Full React UI requires
a valid `VITE_CLERK_PUBLISHABLE_KEY` in `.env.local`.

## Prerequisites

```bash
npm install           # installs Playwright among other devDeps
npx playwright install chromium   # Playwright already installs chromium for this project
```

Both commands ran successfully in this container (Playwright 1.60.0, Chromium 1223).

## Build / dev setup

```bash
# Copy the example and fill in real values before running the app
cp .env.example .env.local
# Required minimum to render any UI:
#   VITE_CLERK_PUBLISHABLE_KEY=pk_test_...  (from Clerk Dashboard)
#   DATABASE_URL=...                        (Neon connection string)
#   OPENROUTER_API_KEY=...                  (AI endpoints)
```

Without `VITE_CLERK_PUBLISHABLE_KEY` the app mounts, Tailwind paints the `#faf9f5`
brand-sanctuary background, but then ClerkProvider throws and `#root` stays empty.
The driver detects and reports this clearly.

## Run (agent path)

```bash
# Quick health check — port 5001 is the real default on macOS (5000 is grabbed by AirTunes)
node .claude/skills/run-ifs-app/driver.mjs --port 5001

# Start server + check + screenshot
node .claude/skills/run-ifs-app/driver.mjs --port 5001 --ss /tmp/home.png

# Navigate to a specific route (e.g. sign-in page)
node .claude/skills/run-ifs-app/driver.mjs --port 5001 --url /sign-in --ss /tmp/signin.png
```

The driver prints a health summary:

```
--- Health check ---
URL            : http://localhost:5000/
HTTP 200       : OK
CSS loaded     : OK (brand background)
React rendered : YES — UI is visible
```

Exit code 0 = server healthy (brand CSS present); exit code 1 = server unreachable.

`React rendered: YES` means `#root` has content — the Clerk key is valid and the UI is up.
`React rendered: NO` means the key is missing/invalid; the page is usable CSS-only.

## Run (human path)

```bash
npm run dev   # starts on port 5000 (or next free: 5001, 5002, …)
```

Then open `http://localhost:5000` in a browser. The first page shown is the Clerk sign-in
form. After sign-in, if the Clerk user has no linked `ifs_clients` row, the app shows a
PIN-claim screen (`/claim-account`) to link the old 6-digit PIN to the new Clerk identity.

## Gotchas

- **Port 5000 is often already in use** (macOS AirTunes / Bonjour uses 5000). Vite silently
  moves to 5001, 5002, etc. Always confirm the actual port from stdout before running the
  driver. The driver accepts `--port` to target any port.

- **`#root` is empty without a real Clerk key.** Providing a fake key (e.g. `pk_test_abc123`)
  still fails — Clerk validates the key format on the client. The app's `main.jsx` renders
  `<App/>` outside `ClerkProvider` when the key is absent; `App` calls `useAuth()` which
  throws. The body background (`#faf9f5`) still paints from Tailwind, so CSS changes _are_
  verifiable without credentials.

- **OneSignal errors are noise.** The OneSignal push SDK logs `Error: Can only be used on:
  https://ifs.aleix.help` on every local load. The driver blocks OneSignal's CDN URL so
  it doesn't pollute the console. Ignore any OneSignal errors that slip through.

- **The `supabase` import is a shim.** The app uses `supabase.from(...)` syntax everywhere
  but this is NOT a real Supabase client — it's a Neon-backed proxy that POSTs JSON to
  `/api/db`. That endpoint is a Vercel serverless function and does NOT run via `npm run dev`.
  Any feature that writes/reads data will fail locally unless you also run the API functions
  (e.g. with `vercel dev`).

## Troubleshooting

| Symptom | Fix |
|---|---|
| `React rendered: NO` | Add valid `VITE_CLERK_PUBLISHABLE_KEY` to `.env.local` |
| `Cannot find module 'playwright'` | `npm install` (playwright is a devDependency) |
| `Dev server did not start on port 5000 within 15 s` | Port in use — pass `--port 5001` or kill the occupant |
| Blank screenshot but CSS OK | Expected without Clerk key; CSS changes are still verifiable |
| `@clerk/clerk-react: The publishableKey passed to Clerk is invalid` | You used a placeholder key; use a real `pk_test_…` from Clerk Dashboard |
