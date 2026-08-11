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

  describe('full wound breakdown', () => {
    it('ranks all five wound scores and flags elevated categories beyond primary/secondary', () => {
      const sections = buildAssessmentInsights({
        wounds: {
          primary_wound: 'shame',
          secondary_wound: 'abandonment',
          scores: { shame: 21, abandonment: 16, neglect: 14, betrayal: 8, helplessness: 5 }
        }
      })
      const breakdown = sections.find((s) => s.id === 'wound-breakdown')
      expect(breakdown.bullets).toContain('Shame: 21/25 (High)')
      expect(breakdown.bullets).toContain('Neglect: 14/25 (Moderate)')
      expect(breakdown.bullets.some((b) => b.includes('Neglect') && b.includes('elevated'))).toBe(true)
    })

    it('notes when the primary and secondary wound share the same exile', () => {
      const sections = buildAssessmentInsights({
        wounds: { primary_wound: 'abandonment', secondary_wound: 'neglect', scores: { abandonment: 20, neglect: 18, shame: 5, betrayal: 5, helplessness: 5 } }
      })
      const breakdown = sections.find((s) => s.id === 'wound-breakdown')
      expect(breakdown.bullets.some((b) => b.includes('The Lonely Child'))).toBe(true)
    })

    it('omits the breakdown card when no wound scores are available', () => {
      const sections = buildAssessmentInsights({})
      expect(sections.find((s) => s.id === 'wound-breakdown')).toBeUndefined()
    })
  })

  describe('daily tracking cross-reference', () => {
    it('confirms wound-linked emotions logged in recent mood check-ins', () => {
      const sections = buildAssessmentInsights({
        wounds: { primary_wound: 'shame', scores: { shame: 20 } },
        moodEntries: [
          { date: '2026-08-05', mood: 2, energy: 4, emotions: ['Shame', 'Anxious'] },
          { date: '2026-08-06', mood: 2, energy: 3, emotions: ['Shame'] }
        ]
      })
      const tracking = sections.find((s) => s.id === 'daily-tracking')
      expect(tracking.bullets.some((b) => b.startsWith('Confirmed') && b.includes('Shame'))).toBe(true)
    })

    it('notes when the wound pattern has not shown up in recent mood tags', () => {
      const sections = buildAssessmentInsights({
        wounds: { primary_wound: 'shame', scores: { shame: 20 } },
        moodEntries: [{ date: '2026-08-06', mood: 4, energy: 7, emotions: ['Calm'] }]
      })
      const tracking = sections.find((s) => s.id === 'daily-tracking')
      expect(tracking.bullets.some((b) => b.startsWith('Not yet visible'))).toBe(true)
    })

    it('surfaces streak and milestone data when present', () => {
      const sections = buildAssessmentInsights({
        streakData: { currentStreak: 12, longestStreak: 20 },
        timeline: [{ title: 'Completed Module 3', date: '2026-08-01' }]
      })
      const tracking = sections.find((s) => s.id === 'daily-tracking')
      expect(tracking.bullets.some((b) => b.includes('12-day practice streak'))).toBe(true)
      expect(tracking.bullets.some((b) => b.includes('Completed Module 3'))).toBe(true)
    })

    it('omits the daily-tracking card when there is no tracking data at all', () => {
      const sections = buildAssessmentInsights({ wounds: { primary_wound: 'shame', scores: { shame: 20 } } })
      expect(sections.find((s) => s.id === 'daily-tracking')).toBeUndefined()
    })

    it('keeps a recorded zero-day streak instead of treating it as missing', () => {
      const sections = buildAssessmentInsights({
        streakData: { currentStreak: 0, longestStreak: 5 }
      })
      const tracking = sections.find((s) => s.id === 'daily-tracking')
      expect(tracking).toBeDefined()
      expect(tracking.bullets.some((b) => b.includes('0-day practice streak'))).toBe(true)
    })
  })

  describe('custom assessment connections', () => {
    it('confirms a custom category that matches the primary wound', () => {
      const sections = buildAssessmentInsights({
        wounds: { primary_wound: 'betrayal', scores: { betrayal: 20 } },
        customAssessments: [
          { assessmentTitle: 'Relationship Check', ranked: [['Trust Issues', { average: 4.5 }], ['Boundaries', { average: 3 }]] }
        ]
      })
      const custom = sections.find((s) => s.id === 'custom-assessment-connections')
      expect(custom).toBeDefined()
      expect(custom.bullets[0]).toMatch(/^Confirmed:.*Betrayal/)
    })

    it('flags a related-but-different pattern when the wound does not match', () => {
      const sections = buildAssessmentInsights({
        wounds: { primary_wound: 'abandonment', scores: { abandonment: 20 } },
        customAssessments: [
          { assessmentTitle: 'Relationship Check', ranked: [['Trust Issues', { average: 4.5 }]] }
        ]
      })
      const custom = sections.find((s) => s.id === 'custom-assessment-connections')
      expect(custom.bullets[0]).toMatch(/^Related pattern:.*Betrayal.*Abandonment/)
    })

    it('surfaces a category with no keyword overlap as an independent data point', () => {
      const sections = buildAssessmentInsights({
        customAssessments: [
          { assessmentTitle: 'Sleep Habits', ranked: [['Nighttime Routine', { average: 4 }]] }
        ]
      })
      const custom = sections.find((s) => s.id === 'custom-assessment-connections')
      expect(custom.bullets[0]).toMatch(/doesn't map onto a specific wound/)
    })

    it('prefixes bullets with the assessment title when there are multiple custom assessments', () => {
      const sections = buildAssessmentInsights({
        customAssessments: [
          { assessmentTitle: 'Sleep Habits', ranked: [['Nighttime Routine', { average: 4 }]] },
          { assessmentTitle: 'Relationship Check', ranked: [['Trust Issues', { average: 4.5 }]] }
        ]
      })
      const custom = sections.find((s) => s.id === 'custom-assessment-connections')
      expect(custom.bullets.some((b) => b.startsWith('Sleep Habits:'))).toBe(true)
      expect(custom.bullets.some((b) => b.startsWith('Relationship Check:'))).toBe(true)
    })

    it('omits the card entirely when there are no custom assessments with ranked results', () => {
      const sections = buildAssessmentInsights({ customAssessments: [{ assessmentTitle: 'Empty', ranked: [] }] })
      expect(sections.find((s) => s.id === 'custom-assessment-connections')).toBeUndefined()
    })
  })
})
