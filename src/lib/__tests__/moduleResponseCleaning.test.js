import { describe, it, expect } from 'vitest'
import { isMeaningfulModuleResponse, cleanModuleResponses } from '../moduleResponseCleaning.js'

describe('isMeaningfulModuleResponse', () => {
  it('rejects trivial and placeholder responses', () => {
    for (const value of ['', '.', '...', 'n/a', 'na', 'none', 'null', 'undefined']) {
      expect(isMeaningfulModuleResponse(value)).toBe(false)
    }
  })

  it('rejects punctuation-only and single meaningless characters', () => {
    expect(isMeaningfulModuleResponse('---')).toBe(false)
    expect(isMeaningfulModuleResponse('!!!')).toBe(false)
    expect(isMeaningfulModuleResponse('x')).toBe(false)
  })

  it('rejects date/time-only responses', () => {
    expect(isMeaningfulModuleResponse('2024-01-15')).toBe(false)
    expect(isMeaningfulModuleResponse('10:30 am')).toBe(false)
  })

  it('accepts meaningful short emotion words', () => {
    expect(isMeaningfulModuleResponse('yes')).toBe(true)
    expect(isMeaningfulModuleResponse('sad')).toBe(true)
    expect(isMeaningfulModuleResponse('calm')).toBe(true)
  })

  it('accepts substantive free-text responses', () => {
    expect(isMeaningfulModuleResponse('I felt anxious about the meeting')).toBe(true)
  })

  it('normalizes objects before evaluating', () => {
    expect(isMeaningfulModuleResponse({ note: 'a real reflection here' })).toBe(true)
  })
})

describe('cleanModuleResponses', () => {
  it('removes non-meaningful answers from array items', () => {
    const cleaned = cleanModuleResponses([
      { answers: { q1: 'I feel scared', q2: 'n/a', q3: '...' } },
    ])
    expect(cleaned).toHaveLength(1)
    expect(cleaned[0].answers).toEqual({ q1: 'I feel scared' })
  })

  it('deduplicates identical key/value answers across items', () => {
    const cleaned = cleanModuleResponses([
      { answers: { q1: 'calm' } },
      { answers: { q1: 'calm' } },
    ])
    expect(cleaned).toHaveLength(1)
  })

  it('drops items that end up with no meaningful answers', () => {
    const cleaned = cleanModuleResponses([{ answers: { q1: 'none', q2: '' } }])
    expect(cleaned).toEqual([])
  })

  it('handles a keyed object of module responses', () => {
    const cleaned = cleanModuleResponses({
      'module-1': [{ answers: { q1: 'yes' } }],
      'module-2': [{ answers: { q1: 'n/a' } }],
    })
    expect(Object.keys(cleaned)).toEqual(['module-1'])
    expect(cleaned['module-1']).toHaveLength(1)
  })

  it('reads answers from the responses key as a fallback', () => {
    const cleaned = cleanModuleResponses([{ responses: { q1: 'I feel hopeful' } }])
    expect(cleaned[0].answers).toEqual({ q1: 'I feel hopeful' })
  })
})
