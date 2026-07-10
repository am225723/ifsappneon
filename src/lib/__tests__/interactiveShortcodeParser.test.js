import { describe, it, expect } from 'vitest'
import { parseInteractiveShortcodes, hasInteractiveShortcodes } from '../interactiveShortcodeParser.js'

describe('hasInteractiveShortcodes', () => {
  it('detects presence of any widget tag', () => {
    expect(hasInteractiveShortcodes('intro [SORTING_WIDGET id="x"] ...')).toBe(true)
    expect(hasInteractiveShortcodes('text with [FOCUS_CARD')).toBe(true)
  })

  it('returns false when no widget tags are present', () => {
    expect(hasInteractiveShortcodes('plain content')).toBe(false)
    expect(hasInteractiveShortcodes(null)).toBe(false)
    expect(hasInteractiveShortcodes(42)).toBe(false)
  })
})

describe('parseInteractiveShortcodes', () => {
  it('returns an empty array for non-string or empty input', () => {
    expect(parseInteractiveShortcodes(null)).toEqual([])
    expect(parseInteractiveShortcodes('')).toEqual([])
    expect(parseInteractiveShortcodes('no widgets here')).toEqual([])
  })

  it('parses a paired SORTING_WIDGET with cards and columns', () => {
    const source = `[SORTING_WIDGET title="Sort me"]
- CARD: id="c1" label="Alpha"
- CARD: id="c2" label="Beta"
- COLUMNS: ["Left","Right"]
[/SORTING_WIDGET]`
    const [block] = parseInteractiveShortcodes(source)
    expect(block.type).toBe('sort')
    expect(block.label).toBe('Sort me')
    expect(block.items).toEqual([
      { id: 'c1', label: 'Alpha' },
      { id: 'c2', label: 'Beta' },
    ])
    expect(block.columns).toEqual(['Left', 'Right'])
  })

  it('parses a MATCHING_WIDGET with left/right columns', () => {
    const source = `[MATCHING_WIDGET title="Match"]
- LEFT_COLUMN: ["A","B"]
- RIGHT_COLUMN: ["1","2"]
[/MATCHING_WIDGET]`
    const [block] = parseInteractiveShortcodes(source)
    expect(block.type).toBe('match')
    expect(block.left).toEqual(['A', 'B'])
    expect(block.right).toEqual(['1', '2'])
  })

  it('parses a self-closing FOCUS_CARD widget', () => {
    const source = '[FOCUS_CARD part_id="p1" field="core_fear"/]'
    const [block] = parseInteractiveShortcodes(source)
    expect(block).toMatchObject({ type: 'focus_card', id: 'p1', part_id: 'p1', field: 'core_fear' })
  })

  it('parses a SLIDER_WIDGET scale into min/max numbers', () => {
    const source = '[SLIDER_WIDGET title="Rate" scale="1-7"][/SLIDER_WIDGET]'
    const [block] = parseInteractiveShortcodes(source)
    expect(block).toMatchObject({ type: 'slider', min: 1, max: 7 })
  })

  it('parses a BLANK_WIDGET template into text/input segments', () => {
    const source = '[BLANK_WIDGET title="Fill"]I feel [INPUT: placeholder="emotion"] today[/BLANK_WIDGET]'
    const [block] = parseInteractiveShortcodes(source)
    expect(block.type).toBe('blank')
    expect(block.template.some((seg) => seg.type === 'input')).toBe(true)
    expect(block.template.some((seg) => seg.type === 'text')).toBe(true)
  })

  it('collects multiple widgets from one source', () => {
    const source = `[FOCUS_CARD part_id="p1"/]
[SLIDER_WIDGET scale="0-5"][/SLIDER_WIDGET]`
    const blocks = parseInteractiveShortcodes(source)
    expect(blocks.map((b) => b.type).sort()).toEqual(['focus_card', 'slider'])
  })
})
