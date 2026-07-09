import { describe, it, expect } from 'vitest'
import {
  extractJsonFromAIText,
  safeParseAIJson,
  normalizeActivityBlocks,
  splitDescriptionAndActivityBlocks,
} from '../safeAIJson.js'

describe('extractJsonFromAIText', () => {
  it('returns empty string for null/undefined/empty input', () => {
    expect(extractJsonFromAIText(null)).toBe('')
    expect(extractJsonFromAIText(undefined)).toBe('')
    expect(extractJsonFromAIText('   ')).toBe('')
  })

  it('returns objects unchanged', () => {
    const obj = { a: 1 }
    expect(extractJsonFromAIText(obj)).toBe(obj)
  })

  it('extracts JSON from a fenced markdown block', () => {
    const text = 'Here is the data:\n```json\n{"a": 1}\n```'
    expect(extractJsonFromAIText(text)).toBe('{"a": 1}')
  })

  it('extracts the first balanced object from surrounding prose', () => {
    const text = 'Response: {"x": {"nested": true}} end of message'
    expect(extractJsonFromAIText(text)).toBe('{"x": {"nested": true}}')
  })

  it('honors the ACTIVITY_BLOCKS_JSON boundary marker', () => {
    const text = 'Some intro {ignored: true}\nACTIVITY_BLOCKS_JSON: [{"type": "instruction"}]'
    expect(extractJsonFromAIText(text)).toBe('[{"type": "instruction"}]')
  })

  it('returns empty string when there is no JSON at all', () => {
    expect(extractJsonFromAIText('just plain prose')).toBe('')
  })

  it('does not treat quoted braces as structural delimiters', () => {
    const text = '{"note": "a } brace inside a string", "ok": true}'
    expect(extractJsonFromAIText(text)).toBe(text)
  })
})

describe('safeParseAIJson', () => {
  it('returns the fallback for nullish/empty input', () => {
    expect(safeParseAIJson(null, 'fb')).toBe('fb')
    expect(safeParseAIJson('', 'fb')).toBe('fb')
    expect(safeParseAIJson(undefined)).toBe(null)
  })

  it('returns objects directly without parsing', () => {
    const obj = { already: 'parsed' }
    expect(safeParseAIJson(obj)).toBe(obj)
  })

  it('parses valid JSON extracted from text', () => {
    expect(safeParseAIJson('```json\n{"a": 1}\n```')).toEqual({ a: 1 })
    expect(safeParseAIJson('prefix {"b": [1, 2]} suffix')).toEqual({ b: [1, 2] })
  })

  it('returns the fallback when JSON is malformed', () => {
    expect(safeParseAIJson('{not valid json', { safe: true })).toEqual({ safe: true })
  })
})

describe('normalizeActivityBlocks', () => {
  it('keeps only recognized block types and assigns ids', () => {
    const blocks = normalizeActivityBlocks([
      { type: 'question', prompt: 'How do you feel?' },
      { type: 'not-a-real-type' },
    ])
    expect(blocks).toHaveLength(1)
    expect(blocks[0]).toMatchObject({ type: 'question', id: 'question_1' })
  })

  it('normalizes legacy sort/match aliases', () => {
    const blocks = normalizeActivityBlocks([{ type: 'sort' }, { type: 'match' }])
    expect(blocks.map((b) => b.type)).toEqual(['sorting', 'matching'])
  })

  it('reads blocks from wrapper objects', () => {
    expect(normalizeActivityBlocks({ activity_blocks: [{ type: 'rating' }] })).toHaveLength(1)
    expect(normalizeActivityBlocks({ blocks: [{ type: 'checklist' }] })).toHaveLength(1)
  })

  it('parses JSON strings before normalizing', () => {
    expect(normalizeActivityBlocks('[{"type": "textarea"}]')).toHaveLength(1)
  })

  it('returns an empty array for unusable input', () => {
    expect(normalizeActivityBlocks(null)).toEqual([])
    expect(normalizeActivityBlocks({ nope: true })).toEqual([])
  })

  it('preserves explicit ids and extra fields', () => {
    const [block] = normalizeActivityBlocks([{ type: 'slider', id: 'custom', min: 0 }])
    expect(block.id).toBe('custom')
    expect(block.min).toBe(0)
  })
})

describe('splitDescriptionAndActivityBlocks', () => {
  it('splits description text from the activity block JSON', () => {
    const text = 'Welcome to the exercise.\nACTIVITY_BLOCKS_JSON: [{"type": "instruction"}]'
    const result = splitDescriptionAndActivityBlocks(text)
    expect(result.description).toBe('Welcome to the exercise.')
    expect(result.activityBlocks).toHaveLength(1)
    expect(result.activityBlocks[0].type).toBe('instruction')
  })

  it('returns the whole text as description when no marker is present', () => {
    const result = splitDescriptionAndActivityBlocks('Just a description.')
    expect(result.description).toBe('Just a description.')
    expect(result.activityBlocks).toEqual([])
  })
})
