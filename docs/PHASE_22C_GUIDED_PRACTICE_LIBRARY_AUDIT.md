# Phase 22C Guided Practice Library Audit and Media Mapping

## Audit summary

The requested Guided Meditation / Practice Library content was found in `src/pages/Exercises.jsx`, not in UploadThing. The practice categories and main cards were inline in the `exerciseCategories` array, while the quick practices were inline in the Quick Start section. Phase 22C moved the required meditation/practice records into a shared static content config at `src/lib/guidedPracticeLibrary.js` and updated `/meditation` to render from that shared library.

No SQL was added or run for this addendum. Medication remains out of scope.

## Where the existing practice cards were found

- `src/pages/Exercises.jsx` contained inline practice categories:
  - Self-Connection
  - Inner Child Work
  - Parts Work
  - Breathing Exercises
- `src/pages/Exercises.jsx` contained inline practice cards:
  - Meeting Your Self
  - Cultivating Self Qualities
  - Meeting Your Inner Child
  - Reparenting Meditation
  - Inner Child Play
  - Unblending Practice
  - Parts Council Meditation
  - Working with Firefighters
  - Box Breathing
  - 4-7-8 Breathing
- `src/pages/Exercises.jsx` contained inline quick practice tiles:
  - Quick Self-Connection
  - Box Breathing
  - Inner Child Check-in

## Shared library/config

The normalized practice records now live in:

- `src/lib/guidedPracticeLibrary.js`

Each record includes:

- `id`
- `title`
- `description`
- `category`
- `level`
- `duration`
- `durationSeconds`
- `type`
- `route`
- `audioUrl`
- `coverImageUrl`
- `uploadThingFileKey`
- `fallbackPractice`
- `steps`
- optional `breathingPattern`
- optional `reflectionPrompt`

The exported helpers are:

- `guidedPracticeLibrary`
- `quickPractices`
- `practiceCategories`
- `guidedPracticeById`
- `getGuidedPracticeById(practiceId)`

## Full list of visible practice items

### Quick Practices

1. Quick Self-Connection
2. Box Breathing
3. Inner Child Check-in

### Self-Connection

4. Meeting Your Self
5. Cultivating Self Qualities

### Inner Child Work

6. Meeting Your Inner Child
7. Reparenting Meditation
8. Inner Child Play

### Parts Work

9. Unblending Practice
10. Parts Council Meditation
11. Working with Firefighters

### Breathing Exercises

12. Box Breathing
13. 4-7-8 Breathing

## UploadThing media mapping

These are app content records/cards. They should not be treated as UploadThing files by default.

UploadThing should only provide optional media assets for the cards:

- audio files for practices that should have recorded guidance
- optional cover images
- optional PDF/resource files only if future product requirements call for them

When a file is uploaded in UploadThing, store the returned values in the matching record in `src/lib/guidedPracticeLibrary.js` unless a future content table is introduced:

```js
audioUrl: 'https://...',
coverImageUrl: 'https://...',
uploadThingFileKey: '...',
```

If a future database-backed content library is introduced, the same fields can move to that content table. Phase 22C did not create a meditation media SQL table.

## Practices that may benefit from UploadThing audio

Recommended optional audio uploads:

- Meeting Your Self
- Cultivating Self Qualities
- Meeting Your Inner Child
- Reparenting Meditation
- Parts Council Meditation

Optional audio can also be added for:

- Quick Self-Connection
- Inner Child Check-in
- Inner Child Play
- Unblending Practice
- Working with Firefighters

## Practices that work without audio

These practices run safely as in-app guided steps and do not require audio:

- Quick Self-Connection
- Box Breathing
- Inner Child Check-in
- Cultivating Self Qualities
- Reparenting Meditation
- Inner Child Play
- Unblending Practice
- Working with Firefighters
- Box Breathing
- 4-7-8 Breathing

Breathing practices include in-app count prompts. Interactive practices include a virtual reflection area.

## Route behavior

- `/guided-meditation` redirects to `/meditation`.
- `/meditation` renders the full library.
- `/meditation/:practiceId` opens an individual practice start experience.
- Unknown practice IDs show a non-blank fallback with a return button to the full library.

## Start button behavior

Each card has a Start button that links to its `route`.

On the individual practice route:

- if `audioUrl` exists and loads, the audio element is available for playback
- if `audioUrl` is missing or fails to load, the page shows this fallback copy:

> Audio is not available for this practice yet. You can still complete the guided practice below.

- all practices show step-by-step guided text
- breathing practices show a breathing timer/count prompt
- interactive/reflection practices show a virtual paper area
- the user can return to the full library

## Home and Tools navigation

- Tools Directory links clearly to `/meditation` as `Guided Meditation & Practice Library`.
- Home's Quiet Tools Drawer includes one `Guided Meditation` link only.
- Home does not list all meditation cards; the full library remains on `/meditation`.

## Security and safety notes

- No medication routes, cards, advice, or tracking were added.
- No diagnosis generation, risk scoring, emergency monitoring, frontend AI keys, or unsafe global client loading were added.
- Authorization was not loosened.
- No SQL was added or run.
- `neon/999_backfill_therapist_assignments.sql` was not run.

## Known limitations and follow-up tasks

- Phase 22C stores media mapping statically in `src/lib/guidedPracticeLibrary.js`; a future content management workflow may move this into a database-backed content table.
- The current records intentionally use `audioUrl: null`, so all practices currently use in-app guided fallback steps until UploadThing audio URLs are pasted into the library.
- Reflection text on individual practice routes is local UI state only; saving reflections can be added later if product requirements call for it.
