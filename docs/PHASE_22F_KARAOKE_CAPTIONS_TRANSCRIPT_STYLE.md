# Phase 22F — Karaoke Captions and Premium Transcript Styling

## Scope

Phase 22F upgrades the guided-practice audio experience across Section A Guided Meditation, Section B Curriculum Guided Practices, and Section C Micro-Learning Exercises. It adds SRT caption awareness, approximate karaoke-style word highlighting, transcript cleanup, and a collapsed premium transcript reader.

No medication features were added. No SQL is required for the preferred static mapping approach.

## Media file roles

- **MP3**: the UploadThing-hosted guided-practice audio file used by the player.
- **TXT**: the written transcript stored under `public/docs` and rendered by the transcript panel.
- **SRT**: phrase-level captions stored under `public/docs/captions` and referenced by `captionsPath` in the canonical media map.
- **AAF**: production/session source assets are not used by the frontend player; they are not required for app playback.

## SRT location and mapping

SRT files should live in:

```text
public/docs/captions
```

Every canonical guided practice now has a `captionsPath`, for example:

```text
/docs/captions/01_Meeting_Your_Self.srt
/docs/captions/02_Cultivating_Self_Qualities.srt
/docs/captions/27_Mini_Body_Scan.srt
```

If an SRT file is not present yet, playback and transcript rendering continue. The caption area displays:

```text
Captions are not available yet.
```

## Approximate karaoke behavior

Standard SRT captions usually contain phrase-level timing rather than exact per-word timing. The current implementation parses each cue, splits the cue text into words, and divides the cue duration evenly across those words.

Example: if a cue has 10 words and lasts 5 seconds, each word receives an estimated 0.5 seconds. The estimated active word is highlighted, enlarged slightly, and given a warm accent treatment.

True word-perfect highlighting requires word-level timestamps. The component is isolated so word-level timing JSON can be added later without replacing transcript cleanup or the audio player.

## Transcript cleanup rules

Transcripts are cleaned at render time; source transcript files are not mutated. Cleanup removes:

- first-line title/filename-style headings when they match the practice title or look like metadata;
- all-caps metadata headings;
- `Filename:` lines;
- `Duration:` lines;
- `Type:` lines;
- `Source script document:` lines;
- bracketed pause markers such as `[Pause 3 seconds]` and `[Pause]`;
- markdown-bold pause markers such as `**pause 3 seconds**` and `**pause**`;
- timed plain pause markers such as `pause 3 seconds`;
- standalone `pause` lines;
- SSML break tags such as `<break time="3.0s" />` and `<break time="10s" />`.

The cleanup intentionally does **not** remove every occurrence of the word “pause,” because that could remove meaningful spoken text inside a sentence.

## Collapsed transcript behavior and styling

The transcript panel is collapsed by default. The closed button label is:

```text
Read the Guided Practice
```

The open button label is:

```text
Hide Guided Practice
```

The panel uses an accessible disclosure pattern with `aria-expanded` and `aria-controls`. When opened, the transcript is displayed in a soft card with comfortable padding, readable serif typography, generous line height, paragraph spacing, and a max-width for readability.

## Accessibility and reduced motion

The karaoke display uses a polite, atomic screen-reader announcement for the active phrase rather than announcing every visual word change. The individual highlighted words are visual-only and avoid unsafe HTML rendering.

When `prefers-reduced-motion: reduce` is active, word transitions avoid smooth scaling animation classes.

## Missing media fallback

- Missing SRT: the caption display shows “Captions are not available yet.”
- Missing audio: the written guided practice and transcript remain available.
- Missing transcript: the transcript panel shows a non-blocking “The written transcript is not available yet.” message.

## Security notes

- The implementation does not use `dangerouslySetInnerHTML`.
- The implementation does not use `eval` or `new Function`.
- UploadThing remains the place for audio/images; SRT captions are static files under `public/docs/captions`.
- No frontend UploadThing, OpenRouter, OpenAI, or Perplexity secrets were added.
- Authorization was not loosened.

## SQL

No SQL is required. Static `captionsPath` values in the canonical media map are preferred. If the database table is later expanded to include caption fields, use an idempotent migration and keep static paths as the fallback.

## Known limitations and follow-up

- Current highlighting is approximate and phrase-level because SRT does not usually provide word-level timestamps.
- Word-perfect karaoke highlighting requires future word-level timing JSON.
- The media manager can show configured caption paths and expected SRT filenames, but static SRT file existence is ultimately determined by whether the file has been published under `public/docs/captions`.
