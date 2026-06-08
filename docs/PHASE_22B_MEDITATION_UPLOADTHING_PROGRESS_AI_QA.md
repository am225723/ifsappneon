# Phase 22B — Guided Meditation, UploadThing, Progress, and Advisor AI QA

## Scope

Phase 22B was a focused QA/fix pass after Phase 22A. It did not add medication workflows, diagnosis generation, risk scoring, emergency monitoring, autonomous clinical conclusions, SQL migrations, frontend AI keys, Perplexity runtime calls, name-based client matching, or unsafe global client loading.

## Guided Meditation blank-page cause and fix

### Cause

The `/meditation` route already existed and `/guided-meditation` already redirected to it, but the page assumed meditation audio files could be used directly for recorded narration. Several meditation cards point at future `/audio/meditations/*.mp3` assets that may not be present in a deployment, so the route needed explicit media-null/error handling and a visible non-audio practice state instead of relying on media readiness.

### Fix

- `/guided-meditation` remains a replace redirect to `/meditation`.
- `/meditation` now renders a visible Guided Meditations page whether UploadThing is configured or not.
- The page has an always-visible fallback practice with:
  - a breathing prompt,
  - a Self-energy check-in,
  - short grounding steps.
- If a selected meditation audio file is missing or cannot play, the page shows: “Guided meditations are being prepared. You can still use the grounding practice below.”
- Missing recorded audio falls back to on-screen prompts and optional browser speech synthesis.
- UploadThing assets are not required for `/meditation` to render.

## UploadThing media readiness

### Installed package and integration style

- `uploadthing` is installed at `^7.7.4`.
- `@uploadthing/react` is installed at `^7.3.3`.
- The server route is `api/uploadthing.js` and imports the file router from `api/_uploadthingRouter.js`.
- The current server route uses UploadThing v7 `UPLOADTHING_TOKEN` through the route handler config.

### Environment variables

Recommended current UploadThing env:

```text
UPLOADTHING_TOKEN
UPLOADTHING_CALLBACK_URL   # optional callback origin override
```

Legacy variables may remain in older environments, but are not preferred for the current route:

```text
UPLOADTHING_APP_ID
UPLOADTHING_SECRET
```

Do not expose UploadThing secrets as `VITE_*` variables.

### File routes

The file router now documents/enforces three server-side upload routes:

- `ifsAttachment`
  - images, PDFs, text files
  - authenticated user upload
  - stores UploadThing key and file URL in `ifs_uploads`
- `meditationAudioUploader`
  - audio files via UploadThing `audio` type
  - max size: `32MB`
  - authenticated Advisor/Admin upload only
  - stores returned `url`/`ufsUrl` in `ifs_uploads`
- `meditationImageUploader`
  - image files
  - max size: `8MB`, max count: `2`
  - authenticated Advisor/Admin upload only
  - stores returned `url`/`ufsUrl` in `ifs_uploads`

Upload errors returned to clients are generic and do not expose raw UploadThing/server details.

### Meditation media checklist

1. Create an UploadThing app.
2. Add `UPLOADTHING_TOKEN` to Vercel server environment variables.
3. Keep the token server-side only; do not add `VITE_UPLOADTHING_TOKEN` or any other frontend secret.
4. Use `meditationAudioUploader` for guided meditation audio files if an uploader UI is introduced, or upload manually in UploadThing.
5. Use `meditationImageUploader` for optional meditation cover/background images.
6. Optional resource PDFs can continue to use the existing attachment route or a future resource-library-specific route.
7. Store the returned `ufsUrl`/file URL in the relevant app content config, content library, or database record before wiring it into meditation cards.
8. Confirm `/meditation` renders even when files are missing.

Do not upload client PHI files unless the product explicitly supports that workflow.

## Home/Curriculum progress consistency

Home, My IFS, and Curriculum use the same shared curriculum helper, `buildSharedCurriculumSummary`, to derive completed module IDs, percent complete, current/next module, and latest completed module. Assigned Advisor practices remain separate and are not counted as curriculum progress. `/my-ifs` resolves a self profile ID and passes that profile ID into Home, while `/curriculum` receives the active client ID; neither path uses hard-coded client IDs, name matching, or unsafe global client loading.

Safe development logging is limited to IDs/counts/progress summary fields and does not log raw client content.

## Advisor Pre-Session AI data sources verified

`api/ai-session-summary.js` generates Advisor-review-only Pre-Session AI notes after `requireTherapist` and assignment/admin authorization. The prompt requires these sections:

1. Current IFS path snapshot
2. Most relevant client inputs since last session
3. Module response themes
4. Journal/reflection themes
5. Parts and protector themes
6. Assessment themes to keep in mind
7. Assigned practice progress
8. Possible session-opening questions
9. Specific follow-up questions
10. What not to over-interpret

When available and authorized, the data builder includes:

- submitted/reviewed pre-session agenda inputs,
- mood/trigger entries,
- journal entries,
- parts,
- part relationships,
- assigned practice status, completion notes, `interactive_responses`, and `activity_blocks`,
- curriculum progress,
- interactive module responses,
- curriculum reflections,
- Life Integration reflections,
- assessment results,
- prior session prep summaries,
- Advisor-only session notes scoped to the client.

Sparse data still generates useful preparation and session-opening questions, with explicit sparse-data language.

## Advisor insights and Session Snapshot verification

- Module Response Insights uses `cleanModuleResponses` before AI analysis.
- Advisor Session Snapshot is generated through the server-side unified guidance API with scoped client data and server-side OpenRouter only.
- Advisor-facing outputs are marked as Advisor review only.
- Outputs are not auto-saved as final notes unless the Advisor explicitly saves in the UI workflow.
- Prompts and validation prohibit diagnosis, risk scores, medication recommendations, emergency conclusions, unsafe routes, and client access to Advisor-only summaries.

## Next Guided Step logic verification

The deterministic priority order in `_nextBestStepLogic` is used before AI wording:

1. active Advisor-assigned practice not completed,
2. current curriculum progress,
3. recent trigger/mood entry,
4. assessment complete but parts map empty,
5. protector/exile confusion,
6. reflection without integration,
7. sparse data,
8. upcoming Advisor session / pre-session check-in.

Route validation still blocks external, admin, advisor, therapist, medication, analytics/reporting, JavaScript/data, and unknown routes. Home displays Next Guided Step as a compact section and failure does not block Home.

## IFS warning removal result

The old persistent top-level optional-data warning is not shown on `/home` or `/my-ifs` when optional data is missing. Optional query failures remain development-only logs or section-level empty states. Critical errors are reserved for failure to connect the workspace itself.

## Home redesign regression result

Home remains curriculum-first, with Advisor-Guided Practice separate from curriculum progress. The Next Guided Step section is compact, Recent Inner Work is limited to the recent summary area, Inner System Snapshot stays compact, and the Quiet Tools drawer presents a short curated set of tools rather than every tool tile.

## Color palette persistence

The Home color palette selector persists the selected palette in `localStorage` under `ifsClientColorPalette`. Available palettes include Luminous Green, Warm Gold, Soft Sage, Rosewood, Ocean Blue, and Lavender Calm.

## Security and authorization result

- UploadThing meditation media upload routes are Advisor/Admin-only.
- Advisor Pre-Session AI and Module Response Insights require Advisor/admin access and assignment checks for non-admins.
- No frontend OpenRouter/OpenAI/Perplexity keys are used.
- OpenRouter remains server-side only.
- No Perplexity runtime calls were added.
- No name-based client matching was added.
- No unsafe global client loading was added.
- No raw UploadThing errors are returned to clients.

## Medication artifact result

Medication remains out of scope. No medication pages, cards, placeholders, advice, tracking, or medication-management routes were added.

## SQL status

No new SQL migration is required for Phase 22B.

Prior Phase 21B production migration may still need manual production application:

```text
neon/032_add_homework_activity_response_json.sql
```

Do not run:

```text
neon/999_backfill_therapist_assignments.sql
```

## Known limitations / follow-up tasks

- At the end of Phase 22B there was no Advisor/Admin UI yet for uploading meditation media. Phase 22D adds that content-management UI and stores returned `ufsUrl` values in `ifs_meditation_media`.
- Some meditation cards still reference static audio paths; these are safe because the page now gracefully falls back when assets are absent.
- Lint may still report deferred repository-wide lint debt unrelated to Phase 22B.
