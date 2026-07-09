import { describe, it, expect } from 'vitest'
import { cleanTranscriptText } from '../transcriptCleanup.js'

describe('cleanTranscriptText', () => {
  it('removes break tags and pause markers in various formats', () => {
    expect(cleanTranscriptText('Breathe <break time="2s"/> now')).not.toContain('break')
    expect(cleanTranscriptText('Breathe **pause 3 seconds** now')).not.toContain('pause')
    expect(cleanTranscriptText('Breathe [pause 5 seconds] now')).not.toContain('pause')
    expect(cleanTranscriptText('Breathe [pause] now')).not.toContain('pause')
  })

  it('strips leading metadata lines', () => {
    const cleaned = cleanTranscriptText('Filename: track.mp3\nDuration: 5:00\nActual content')
    expect(cleaned).toBe('Actual content')
  })

  it('removes a leading title line that duplicates the provided title', () => {
    const cleaned = cleanTranscriptText('Morning Meditation\nLet us begin.', 'Morning Meditation')
    expect(cleaned).toBe('Let us begin.')
  })

  it('removes an ALL CAPS heading line', () => {
    const cleaned = cleanTranscriptText('MEDITATION SCRIPT\nSettle in.')
    expect(cleaned).toBe('Settle in.')
  })

  it('keeps a leading welcome line even when it looks like a heading', () => {
    const cleaned = cleanTranscriptText('Welcome to the practice\nBegin now.', 'the practice')
    expect(cleaned.startsWith('Welcome to the practice')).toBe(true)
  })

  it('collapses excessive blank lines', () => {
    expect(cleanTranscriptText('Line one\n\n\n\nLine two')).toBe('Line one\n\nLine two')
  })

  it('handles empty input', () => {
    expect(cleanTranscriptText('')).toBe('')
    expect(cleanTranscriptText()).toBe('')
  })
})
