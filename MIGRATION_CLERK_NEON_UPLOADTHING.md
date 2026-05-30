# Migration: Supabase -> Clerk, Neon, UploadThing

This branch moves the app away from direct Supabase client access and toward:

- **Clerk** for identity/session tokens
- **Neon Postgres** for application data
- **UploadThing** for file uploads and file metadata

## What changed

### Data access

`src/lib/supabase.js` is now a compatibility wrapper. Existing calls such as:

```js
supabase.from('ifs_clients').select('*').eq('id', userId)
```

now flow through:

```txt
frontend -> /api/db -> Neon
```

This keeps most of the app working without rewriting every page immediately.

### Authentication

`src/main.jsx` now wraps the app in `ClerkProvider` when `VITE_CLERK_PUBLISHABLE_KEY` exists.

The `/api/db` endpoint verifies Clerk bearer tokens using `CLERK_SECRET_KEY`. During a short transition period, you can set:

```env
ALLOW_PIN_AUTH_WITHOUT_CLERK=true
```

Only use that while validating legacy PIN-based flows.

### Uploads

UploadThing server files were added:

- `api/uploadthing.js`
- `src/lib/uploadthingServer.js`

Upload metadata is saved to the new `ifs_uploads` Neon table.

## Environment variables

Copy `.env.example` and fill in:

```env
VITE_CLERK_PUBLISHABLE_KEY=
CLERK_SECRET_KEY=
DATABASE_URL=
UPLOADTHING_APP_ID=
UPLOADTHING_SECRET=
UPLOADTHING_CALLBACK_URL=
```

## Neon setup

Run the schema against Neon:

```bash
psql "$DATABASE_URL" -f neon/schema.sql
```

## Supabase data export

From a secure machine that can access the old Supabase database:

```bash
psql "$SUPABASE_DATABASE_URL" -f neon/export-from-supabase.sql
```

This writes CSV files for each app table.

## Neon data import

From the same directory containing the CSV files:

```bash
psql "$DATABASE_URL" -f neon/import-to-neon.sql
```

## Install dependencies

After pulling this branch, regenerate the lockfile:

```bash
npm install
```

The `package.json` dependencies have changed. The lockfile may need regeneration in your local environment or CI.

## Notes and follow-up work

- Legacy PIN auth is still present in `src/lib/supabasePersonalization.js`; the data calls now hit Neon through the compatibility client.
- A deeper second pass should replace PIN login screens with Clerk-native sign-in/sign-up UI and map existing `ifs_clients` rows to `clerk_user_id`.
- Supabase Edge Functions under `supabase/functions` are not used by the new data layer. Replace any live email workflows with a normal serverless route before deleting the old folder.
- UploadThing client UI can be added where files are actually attached; the backend endpoint and metadata table are ready.
