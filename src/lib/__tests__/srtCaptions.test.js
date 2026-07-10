import { describe, it, expect } from 'vitest'
import {
  cleanCaptionText,
  parseSrtTimestamp,
  parseSrtCaptions,
  getActiveCaption,
  getApproximateActiveWord,
} from '../srtCaptions.js'

describe('cleanCaptionText', () => {
  it('strips break tags, html tags and styling braces', () => {
    expect(cleanCaptionText('<break time="1s"/>Hello <b>world</b>')).toBe('Hello world')
    expect(cleanCaptionText('{\\an8}Positioned  text')).toBe('Positioned text')
  })

  it('collapses whitespace and trims', () => {
    expect(cleanCaptionText('  many    spaces  ')).toBe('many spaces')
  })

  it('handles empty/nullish input', () => {
    expect(cleanCaptionText()).toBe('')
    expect(cleanCaptionText(null)).toBe('')
  })
})

describe('parseSrtTimestamp', () => {
  it('parses hours, minutes, seconds and milliseconds', () => {
    expect(parseSrtTimestamp('00:00:01,500')).toBe(1.5)
    expect(parseSrtTimestamp('01:02:03')).toBe(3723)
    expect(parseSrtTimestamp('00:00:02.250')).toBe(2.25)
  })

  it('returns null for malformed timestamps', () => {
    expect(parseSrtTimestamp('not a time')).toBeNull()
    expect(parseSrtTimestamp('')).toBeNull()
    expect(parseSrtTimestamp(null)).toBeNull()
  })
})

const SAMPLE_SRT = `1
00:00:00,000 --> 00:00:02,000
Hello world

2
00:00:02,000 --> 00:00:04,000
Second <i>caption</i> line`

describe('parseSrtCaptions', () => {
  it('parses well-formed SRT into caption objects', () => {
    const captions = parseSrtCaptions(SAMPLE_SRT)
    expect(captions).toHaveLength(2)
    expect(captions[0]).toMatchObject({ id: '1', start: 0, end: 2, text: 'Hello world' })
    expect(captions[0].words).toEqual(['Hello', 'world'])
    expect(captions[1].text).toBe('Second caption line')
  })

  it('handles CRLF line endings', () => {
    const crlf = SAMPLE_SRT.replace(/\n/g, '\r\n')
    expect(parseSrtCaptions(crlf)).toHaveLength(2)
  })

  it('drops cues with invalid or non-increasing timing', () => {
    const bad = `1
00:00:05,000 --> 00:00:02,000
Backwards timing`
    expect(parseSrtCaptions(bad)).toEqual([])
  })

  it('returns an empty array for empty input', () => {
    expect(parseSrtCaptions('')).toEqual([])
    expect(parseSrtCaptions()).toEqual([])
  })
})

describe('getActiveCaption', () => {
  const captions = parseSrtCaptions(SAMPLE_SRT)

  it('returns the caption whose time window contains the current time', () => {
    expect(getActiveCaption(captions, 1)?.id).toBe('1')
    expect(getActiveCaption(captions, 3)?.id).toBe('2')
  })

  it('returns null when nothing matches or input is empty', () => {
    expect(getActiveCaption(captions, 100)).toBeNull()
    expect(getActiveCaption([], 1)).toBeNull()
  })
})

describe('getApproximateActiveWord', () => {
  const [caption] = parseSrtCaptions(SAMPLE_SRT)

  it('approximates the active word from elapsed time', () => {
    expect(getApproximateActiveWord(caption, 0.5)).toMatchObject({ index: 0, word: 'Hello' })
    expect(getApproximateActiveWord(caption, 1.5)).toMatchObject({ index: 1, word: 'world' })
  })

  it('clamps to the last word past the caption end', () => {
    expect(getApproximateActiveWord(caption, 10)?.word).toBe('world')
  })

  it('returns null for invalid captions', () => {
    expect(getApproximateActiveWord(null, 1)).toBeNull()
    expect(getApproximateActiveWord({ words: [] }, 1)).toBeNull()
  })
})
