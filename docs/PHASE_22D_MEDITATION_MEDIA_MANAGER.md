# Phase 22D — Advisor/Admin Meditation Media Manager

## Route added

- Advisor/Admin media manager route: `/admin/meditation-media`.
- Client meditation route remains `/meditation` and `/meditation/:practiceId`.
- Upload controls are not rendered on `/meditation`.

## Storage strategy

Uploaded guided meditation media is database-backed in a new global content table:

- `public.ifs_meditation_media`

The static `src/lib/guidedPracticeLibrary.js` remains the fallback source of truth for card copy, fallback steps, breathing prompts, and empty-state behavior. The media table stores only public UploadThing URLs, UploadThing file keys, and non-PHI meditation metadata.

## Table and migrations

Added idempotent migrations:

- Neon: `neon/033_create_ifs_meditation_media.sql`
- Supabase parity: `supabase/migrations/037_create_ifs_meditation_media.sql`

The Neon schema snapshot was updated with the table and indexes. No historical backfill is included.

## UploadThing routes used

The manager uses the Phase 22B UploadThing routes:

- `meditationAudioUploader` for audio files.
- `meditationImageUploader` for cover images.

Both routes are implemented server-side in `api/_uploadthingRouter.js` and require Advisor/Admin upload access. The frontend passes a Clerk bearer token in UploadThing request headers; it does not contain UploadThing secrets.

## Required environment variables

Server-side UploadThing configuration remains:

```bash
UPLOADTHING_TOKEN=
UPLOADTHING_CALLBACK_URL=
```

`UPLOADTHING_CALLBACK_URL` is optional and only needed when the deployed callback origin needs an override. Legacy `UPLOADTHING_APP_ID` and `UPLOADTHING_SECRET` may exist in older deployments, but this app prefers `UPLOADTHING_TOKEN`.

Do not add `VITE_UPLOADTHING_TOKEN`, `VITE_UPLOADTHING_SECRET`, or `VITE_UPLOADTHING_APP_ID`.

## File types supported

UploadThing route config controls accepted files:

- Audio: UploadThing `audio`, max `32MB`, max `1` file.
- Image: UploadThing `image`, max `8MB`, max `2` files.

## Where URLs are saved

UploadThing upload completion returns the public URL (`ufsUrl` or `url`) and file key. The media manager stores:

- `audio_url`
- `cover_image_url`
- `uploadthing_audio_key`
- `uploadthing_image_key`

in `ifs_meditation_media` through `api/meditation-media.js`.

The UploadThing router also continues to log uploaded files in `ifs_uploads` for upload history.

## Merge behavior with guidedPracticeLibrary

`src/lib/meditationMedia.js` exposes `mergeMeditationMediaWithLibrary(staticLibrary, mediaRows)`:

- Active media rows with `practice_id` matching a static `guidedPracticeLibrary` id override the static record's media fields.
- `audio_url` overrides `audioUrl` when present.
- `cover_image_url` overrides `coverImageUrl` when present.
- Title, description, category, level, duration label, and practice type can also be overridden for the rendered card.
- Active media rows whose `practice_id` does not match a static practice become additional custom meditation cards with safe generic fallback steps.

## `/meditation` fallback behavior

- If no uploaded media exists, `/meditation` renders the static guided practice library.
- If active media cannot be loaded, `/meditation` logs a dev-only warning and keeps the static library visible.
- If a practice has no playable audio, the player shows the written fallback practice steps.
- If audio fails to load or play, the same written fallback remains available.
- The page should never render blank because the static library remains the local fallback.

## Security and authorization

- `/admin/meditation-media` is protected by the existing Advisor/Admin route guard.
- The page also performs a role check and redirects non-Advisor/client-only users.
- `api/meditation-media.js` uses Clerk auth and resolves the linked app user.
- Authenticated users may read active media records.
- Advisor/Admin/Supervisor roles may create, update, and archive media records.
- Client-only users cannot create, update, archive, or open the manager UI.
- The endpoint does not load all clients and does not use name-based matching.
- Media records are global non-PHI content and do not expose client data.

## Frontend secret safety

The frontend imports UploadThing React components and sends Clerk auth headers only. It does not read or expose:

- `UPLOADTHING_TOKEN`
- `UPLOADTHING_SECRET`
- `UPLOADTHING_APP_ID`
- any `VITE_UPLOADTHING_*` secret

## No medication scope

Phase 22D does not add medication routes, cards, tracking, placeholders, or advice.

## Manual SQL required

Apply the new migration before using the manager in deployed environments:

- Neon: `neon/033_create_ifs_meditation_media.sql`
- Supabase parity if applicable: `supabase/migrations/037_create_ifs_meditation_media.sql`

Do not run `neon/999_backfill_therapist_assignments.sql` for this phase.

## Known limitations

- UploadThing route-level MIME/type validation is delegated to UploadThing's `audio` and `image` route definitions.
- Deactivation archives media by setting `is_active = false`; this does not delete files from UploadThing storage.
- If multiple active records target the same `practice_id`, the merge helper applies one active record for that static card, preferring the highest `sort_order` among active rows.
