import { describe, it, expect } from 'vitest'
import {
  getInteractiveResultLabel,
  getInteractiveResultCategory,
  isInteractiveAssessmentModule,
  isCurriculumInteractiveModule,
  displayInteractiveValue,
  normalizeJson,
  normalizeInteractiveResult,
  summarizeInteractiveInsights,
  getPartsMapParts,
} from '../interactiveResults.js'

describe('getInteractiveResultLabel', () => {
  it('returns known labels', () => {
    expect(getInteractiveResultLabel('assessment_wounds')).toBe('Wound Patterns Assessment')
    expect(getInteractiveResultLabel('parts_map')).toBe('Inner System Map')
  })

  it('humanizes unknown module ids', () => {
    expect(getInteractiveResultLabel('module-4-self-leadership')).toBe('Module 4 Self Leadership')
    expect(getInteractiveResultLabel('assessment_custom_thing')).toBe('Custom Thing')
  })
})

describe('getInteractiveResultCategory', () => {
  it('maps known assessments to their category', () => {
    expect(getInteractiveResultCategory('assessment_parts')).toBe('parts')
    expect(getInteractiveResultCategory('assessment_self-energy')).toBe('self-energy')
  })

  it('classifies module, parts map and generic ids', () => {
    expect(getInteractiveResultCategory('module-9-relationships')).toBe('curriculum')
    expect(getInteractiveResultCategory('parts_map')).toBe('parts-map')
    expect(getInteractiveResultCategory('something-else')).toBe('interactive')
  })
})

describe('module id predicates', () => {
  it('identifies assessment modules', () => {
    expect(isInteractiveAssessmentModule('assessment_wounds')).toBe(true)
    expect(isInteractiveAssessmentModule('module-1')).toBe(false)
  })

  it('identifies curriculum modules', () => {
    expect(isCurriculumInteractiveModule('module-1-intro-ifs')).toBe(true)
    expect(isCurriculumInteractiveModule('assessment_parts')).toBe(false)
  })
})

describe('displayInteractiveValue', () => {
  it('renders primitives, arrays and objects', () => {
    expect(displayInteractiveValue('hello')).toBe('hello')
    expect(displayInteractiveValue(42)).toBe('42')
    expect(displayInteractiveValue(['a', 'b'])).toBe('a, b')
    expect(displayInteractiveValue({ name: 'Anger' })).toBe('Anger')
    expect(displayInteractiveValue({ id: 'p1' })).toBe('p1')
  })

  it('returns null for empty values', () => {
    expect(displayInteractiveValue(null)).toBeNull()
    expect(displayInteractiveValue({})).toBeNull()
  })
})

describe('normalizeJson', () => {
  it('returns objects as-is and parses JSON strings', () => {
    const obj = { a: 1 }
    expect(normalizeJson(obj)).toBe(obj)
    expect(normalizeJson('{"a":1}')).toEqual({ a: 1 })
  })

  it('returns null for invalid or empty values', () => {
    expect(normalizeJson('not json')).toBeNull()
    expect(normalizeJson(null)).toBeNull()
  })
})

describe('normalizeInteractiveResult', () => {
  it('builds a normalized result with label, category and summary', () => {
    const result = normalizeInteractiveResult({
      id: 5,
      client_id: 'c1',
      module_id: 'assessment_wounds',
      data: { primary: 'Abandonment', secondary: { name: 'Shame' }, ranked: ['A', 'B', 'C', 'D'] },
      updated_at: '2024-01-01',
    })
    expect(result).toMatchObject({
      id: 5,
      clientId: 'c1',
      moduleId: 'assessment_wounds',
      label: 'Wound Patterns Assessment',
      category: 'wound',
      categoryLabel: 'Wound',
      primary: 'Abandonment',
      secondary: 'Shame',
    })
    expect(result.summary).toContain('Primary: Abandonment')
    expect(result.summary).toContain('Secondary: Shame')
    expect(result.summary).toContain('Top themes: A, B, C')
    expect(result.completedAt).toBe('2024-01-01')
  })

  it('parses a JSON string data payload and supports camelCase keys', () => {
    const result = normalizeInteractiveResult({
      moduleId: 'module-1-intro-ifs',
      data: '{"primary":"Self"}',
    })
    expect(result.moduleId).toBe('module-1-intro-ifs')
    expect(result.category).toBe('curriculum')
    expect(result.primary).toBe('Self')
  })
})

describe('summarizeInteractiveInsights', () => {
  it('summarizes only results with primary/secondary values', () => {
    const insights = summarizeInteractiveInsights([
      { categoryLabel: 'Wound', primary: 'Abandonment', secondary: 'Shame' },
      { categoryLabel: 'Parts', primary: null, secondary: null },
    ])
    expect(insights).toEqual(['Wound: Abandonment / Shame'])
  })
})

describe('getPartsMapParts', () => {
  it('extracts parts from object or JSON string data', () => {
    expect(getPartsMapParts({ data: { parts: [{ id: 1 }] } })).toEqual([{ id: 1 }])
    expect(getPartsMapParts({ data: '{"parts":[1,2]}' })).toEqual([1, 2])
  })

  it('returns an empty array when parts are missing', () => {
    expect(getPartsMapParts({})).toEqual([])
    expect(getPartsMapParts({ data: { parts: 'nope' } })).toEqual([])
  })
})
