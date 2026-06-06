# Phase 21B — Structured Worksheet JSON Persistence and Formatting Cleanup

## Storage approach

Assigned IFS Practices are stored in `ifs_therapy_homework`. Phase 21B adds two JSONB columns to that existing table rather than introducing a new table:

- `activity_blocks JSONB DEFAULT '[]'::jsonb` stores AI-generated worksheet block definitions separately from Advisor-editable description text.
- `interactive_responses JSONB DEFAULT '{}'::jsonb` stores client widget responses as structured JSON.

This keeps worksheet definitions and worksheet responses separate from legacy text reflection notes.

## SQL / migration

A migration was required because the assigned practice table had `completion_notes` but no safe JSONB response metadata field.

Migration files:

- `neon/032_add_homework_activity_response_json.sql`
- `supabase/migrations/036_add_homework_activity_response_json.sql`

Both migrations are idempotent and use `ADD COLUMN IF NOT EXISTS`. No historical rows are backfilled, and `neon/999_backfill_therapist_assignments.sql` was not run.

Schema snapshots updated:

- `neon/schema.sql`
- `supabase/complete_schema.sql`

## Structured response JSON shape

Client widget responses are persisted in `ifs_therapy_homework.interactive_responses` using this shape:

```json
{
  "version": "1.0",
  "responses": [
    {
      "widgetId": "sorting_1",
      "widgetType": "sorting",
      "value": {
        "assignments": {
          "card_1": "Managers",
          "card_2": "Firefighters"
        }
      },
      "updatedAt": "2026-01-01T00:00:00.000Z",
      "version": "1.0"
    }
  ],
  "summary": [
    "Inner Critic → Managers",
    "Shutdown response → Firefighters"
  ]
}
```

Malformed or legacy response values are normalized defensively before rendering. Empty widget state still serializes to a versioned object with an empty `responses` array.

## Legacy `completion_notes` behavior

`completion_notes` remains the storage location for the client's typed free-text reflection. Phase 21B no longer depends on `completion_notes` as the only widget-response record. When both exist, structured widget summaries render first and typed reflection notes render after them.

Historical records that only have `completion_notes` continue to display those notes cleanly.

## Advisor review summaries

Advisor views use readable summaries rather than raw JSON. Supported summary formats include:

- Sorting: `Inner Critic → Managers`
- Matching: `Perfectionist protector matched with fear of rejection`
- Body map: `Throat — intensity 6 — “tight”`
- Zone map: `Inner Critic placed in Protective edge`
- Slider: `Blending Intensity: 7/10`
- Blank: completed field values
- Virtual paper / textarea: readable text blocks with preserved line breaks
- Checklist: checked items
- Rating: rating label/value

## AI JSON parsing hardening

Shared safe parsing utilities were added for client and API usage:

- `src/lib/safeAIJson.js`
- `api/_safeAIJson.js`

They support:

- JSON inside markdown fences
- JSON with text before or after it
- `ACTIVITY_BLOCKS_JSON` as an explicit field boundary
- arrays returned as strings
- object values returned as strings
- fallback to formatted text and virtual paper if parsing fails

The parser does not use `eval`, the `Function` constructor, unsafe HTML parsing, or raw provider payloads in client-facing errors.

## Markdown-lite formatting behavior

`FormattedAIContent` renders markdown-lite content with React nodes instead of unsafe HTML. Supported formatting includes:

- paragraphs
- section headings
- `**bold labels**`
- `*italic text*`
- bullets
- numbered lists
- blockquotes
- question spacing
- preserved blank-line separation

Raw `**bold**` markers should no longer be visible in normal worksheet, assigned practice, Next Best Step, and assessment preview rendering.

## Assessment formatting improvements

Assessment cards now render generated descriptions through `FormattedAIContent`, so section labels, lists, and spacing are readable instead of appearing as one wall of text. This phase does not add a new assessment engine.

## Next Best Step / Unified Guidance formatting

Unified Guidance prompts now ask for valid JSON only with no markdown fences. Interactive payload validation normalizes structured blocks with the same safe JSON utilities used elsewhere. Client rendering accepts structured blocks, shortcode text, or formatted plain text and falls back to a virtual paper when payload parsing fails.

## Security / visibility behavior

Phase 21B does not loosen authorization. Advisor homework review still loads only clients returned by the assigned-client helper, and client homework still filters to the signed-in client id. Client-visible views do not expose Advisor notes. No global client loading or name matching was added.

## Medication artifact result

No medication routes, cards, tracking, placeholders, advice, or recommendations were added. AI prompts continue to prohibit medication suggestions.

## Known limitations

- Historical `completion_notes` are not backfilled into `interactive_responses`.
- The worksheet block schema remains intentionally small and defensive; unsupported block types fall back to virtual paper / formatted text.
- Full lint still includes pre-existing repository debt and is treated as non-blocking for this phase.
