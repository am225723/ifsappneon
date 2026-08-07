import { describe, it, expect } from 'vitest'
import { buildAssessmentInsights, getAttachmentPrimarySecondary } from '../assessmentInsights.js'

describe('getAttachmentPrimarySecondary', () => {
  it('reads primary/secondary from ranked entries', () => {
    const result = getAttachmentPrimarySecondary({ ranked: [['anxious', {}], ['avoidant', {}]] })
    expect(result).toEqual({ primary: 'anxious', secondary: 'avoidant' })
  })

  it('prefers an explicit primary field', () => {
    const result = getAttachmentPrimarySecondary({ primary: 'secure', ranked: [['anxious', {}]] })
    expect(result.primary).toBe('secure')
  })

  it('returns nulls when nothing is available', () => {
    expect(getAttachmentPrimarySecondary(null)).toEqual({ primary: null, secondary: null })
  })
})

describe('buildAssessmentInsights', () => {
  it('returns gentle placeholders when nothing has been completed', () => {
    const sections = buildAssessmentInsights({})
    const wound = sections.find((s) => s.id === 'wound-summary')
    expect(wound.body).toMatch(/not been completed yet/)
    expect(sections.find((s) => s.id === 'system-loop')).toBeUndefined()
  })

  it('confirms a wound-protector connection when an identified part matches the wound archetype', () => {
    const sections = buildAssessmentInsights({
      wounds: { primary_wound: 'shame', secondary_wound: null, scores: { shame: 20 } },
      identifiedParts: [
        { name: 'The Inner Critic', type: 'manager', role: 'Criticizes harshly', intensity: 5, intensityLabel: 'Very Active' }
      ]
    })
    const connection = sections.find((s) => s.id === 'wound-parts-connection')
    expect(connection.bullets[0]).toMatch(/^Confirmed:/)
    expect(connection.bullets[0]).toContain('The Inner Critic')
  })

  it('flags a pattern to watch when no matching part has been identified', () => {
    const sections = buildAssessmentInsights({
      wounds: { primary_wound: 'shame', scores: { shame: 20 } },
      identifiedParts: []
    })
    const connection = sections.find((s) => s.id === 'wound-parts-connection')
    expect(connection.bullets[0]).toMatch(/^Pattern to watch:/)
  })

  it('confirms the self-energy link when the predicted quality is the actual growth edge', () => {
    const sections = buildAssessmentInsights({
      wounds: { primary_wound: 'shame', scores: { shame: 20 } },
      selfEnergy: { ranked: [['calmness', { average: 4.5 }], ['compassion', { average: 1.5 }]] }
    })
    const connection = sections.find((s) => s.id === 'self-attachment-connection')
    expect(connection.bullets[0]).toMatch(/^Confirmed:.*[Cc]ompassion/)
  })

  it('notes a different pattern when attachment results do not match the predicted style', () => {
    const sections = buildAssessmentInsights({
      wounds: { primary_wound: 'shame', scores: { shame: 20 } },
      attachment: { primary: 'secure', ranked: [['secure', { average: 4 }]] }
    })
    const connection = sections.find((s) => s.id === 'self-attachment-connection')
    expect(connection.bullets[1]).toMatch(/^Different pattern:/)
  })

  it('builds the full system-in-motion synthesis once at least two assessments are present', () => {
    const sections = buildAssessmentInsights({
      wounds: { primary_wound: 'abandonment', scores: { abandonment: 22 } },
      parts: { primary: 'manager' },
      identifiedParts: [{ name: 'The People Pleaser', type: 'manager', role: 'Keeps relationships safe', intensity: 5, intensityLabel: 'Very Active' }]
    })
    const loop = sections.find((s) => s.id === 'system-loop')
    expect(loop).toBeDefined()
    expect(loop.span).toBe('full')
    expect(loop.body).toContain('Abandonment')
    expect(loop.body).toContain('The People Pleaser')
  })

  it('pulls curriculum focus from the shared curriculum personalizer for the primary wound', () => {
    const sections = buildAssessmentInsights({
      wounds: { primary_wound: 'neglect', scores: { neglect: 15 } }
    })
    const curriculum = sections.find((s) => s.id === 'curriculum-focus')
    expect(curriculum.body).toMatch(/Neglect/)
    expect(curriculum.bullets?.length).toBeGreaterThan(0)
  })
})
