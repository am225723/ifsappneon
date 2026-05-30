# Merged IFS App — Clerk + Neon Version

## What was merged

This project uses `ifsappnew` as the main app base because it already contains the stronger production direction:

- Clerk sign-in/sign-up routes.
- Clerk account-claim flow using an existing 6-digit client PIN.
- Serverless Neon database bridge through `/api/db`.
- `/api/me` endpoint for loading the Clerk-linked client profile.
- `/api/claim-client` endpoint for linking a Clerk user to an existing `ifs_clients` record.
- Sanctuary-style UI system with warm amber, emerald, and stone branding.
- Updated routing, Navbar component, protected feature gates, therapist/client navigation, and `InnerLibraryMockup` route.
- Safer `.env.example` placeholders instead of live secrets.

From `ifs-migration-clean`, this merged project adds:

- `migration-csv/` containing the exported CSV data and migration import SQL helpers.
- Migration-support files such as `import-by-header.sql`, `import-failed.sql`, and `import-remaining.sql`.

## Main differences between the uploaded ZIPs

### `ifsappnew.zip`

Best for the live application. It includes:

- Clerk frontend auth via `@clerk/clerk-react`.
- Clerk server token verification via `@clerk/backend`.
- Neon-backed API access through `@neondatabase/serverless`.
- New files:
  - `api/claim-client.js`
  - `api/me.js`
  - `src/lib/clerkClientAuth.js`
  - `src/pages/InnerLibraryMockup.jsx`
  - `supabase/migrations/20260101002000_replace_old_public_contact_info.sql`
- Better API support for `like` and `ilike` filters in both `api/db.js` and `src/lib/neonClient.js`.
- More polished Sanctuary visual system in Tailwind and page styling.
- More Vercel-safe rewrites for API routes, manifest, OneSignal worker, assets, and SPA fallback.

### `ifs-migration-clean.zip`

Best as a migration/data package. It includes:

- `migration-csv/` exports for clients, assessments, progress, messages, homework, journals, mood entries, therapist notes, content library, and other app tables.
- SQL import helpers for loading migration data.
- Older PIN/session-oriented app routing rather than the fuller Clerk account model.
- A less complete Neon client/API bridge because `like` and `ilike` are missing.
- A simpler/older Vercel rewrite setup.
- A `.env.example` with real-looking credentials, which should not be committed or redistributed.

## Backend direction in this merged app

The app keeps the old `supabase.from(...)` calling style for compatibility, but the implementation now points to Neon:

`src/lib/supabase.js` → `src/lib/neonClient.js` → `/api/db` → Neon Postgres

That means existing components do not need to be rewritten immediately. They can keep calling `supabase.from('table')`, while the actual data flow goes through the serverless Neon API.

## Clerk direction

Clerk is the required auth layer for production:

1. User signs in or signs up with Clerk.
2. If no client profile is linked, app routes them to `/claim-account`.
3. User enters their old 6-digit PIN once.
4. `/api/claim-client` verifies the Clerk token and links `ifs_clients.clerk_user_id`.
5. Future logins load the profile with `/api/me`.

## Required environment variables

Copy `.env.example` to `.env.local` for local development, and add the same values to Vercel project environment variables.

Required:

```bash
VITE_CLERK_PUBLISHABLE_KEY=...
CLERK_SECRET_KEY=...
DATABASE_URL=...
VITE_DATA_API_PATH=/api/db
ALLOW_PIN_AUTH_WITHOUT_CLERK=false
```

Optional, if using UploadThing:

```bash
UPLOADTHING_APP_ID=...
UPLOADTHING_SECRET=...
UPLOADTHING_CALLBACK_URL=...
```

## Recommended setup commands

```bash
npm install
npm run build
npm run dev
```

## Migration notes

The `migration-csv/` folder came from `ifs-migration-clean.zip`. Use it only in a controlled migration environment. Do not expose those CSVs publicly because they may contain real app/user records.

Suggested order:

1. Create Neon database.
2. Run `neon/schema.sql`.
3. Import CSVs using the scripts in `migration-csv/`.
4. Confirm `ifs_clients` includes `pin` and `clerk_user_id` columns.
5. Deploy the app with Clerk and Neon environment variables.
6. Have existing users sign in with Clerk and claim their profile using their PIN.

## Build verification

I verified that the `ifsappnew` base builds successfully after refreshing missing Rollup optional dependencies with npm. The build completed with warnings only:

- Browserslist/caniuse data is stale.
- A few static/dynamic imports prevent some chunk splitting.
- Main app chunk is large and should eventually be code-split.

Those are optimization warnings, not build blockers.
