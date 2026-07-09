import { describe, it, expect } from 'vitest'
import {
  WOUND_MODULE_PRIORITIES,
  LEVEL_ORDER,
  getWoundPriority,
} from '../woundModulePriorities.js'

describe('WOUND_MODULE_PRIORITIES data', () => {
  it('exposes a config for each known wound with required fields', () => {
    for (const config of Object.values(WOUND_MODULE_PRIORITIES)) {
      expect(typeof config.childName).toBe('string')
      expect(config.modules).toBeTypeOf('object')
      expect(Array.isArray(config.tips)).toBe(true)
    }
  })
})

describe('LEVEL_ORDER', () => {
  it('orders priority levels from core (highest) to standard (lowest)', () => {
    expect(LEVEL_ORDER.core).toBeLessThan(LEVEL_ORDER.high)
    expect(LEVEL_ORDER.high).toBeLessThan(LEVEL_ORDER.medium)
    expect(LEVEL_ORDER.medium).toBeLessThan(LEVEL_ORDER.standard)
  })
})

describe('getWoundPriority', () => {
  it('returns the configured priority for a known wound + module', () => {
    const priority = getWoundPriority('abandonment', 'module-7-reparenting')
    expect(priority.level).toBe('core')
    expect(priority.badge).toContain('Abandonment')
    expect(typeof priority.message).toBe('string')
  })

  it('falls back to a standard priority for an unknown module of a known wound', () => {
    expect(getWoundPriority('abandonment', 'module-does-not-exist')).toEqual({
      level: 'standard',
      badge: null,
      message: null,
    })
  })

  it('returns null for an unknown wound type', () => {
    expect(getWoundPriority('not-a-wound', 'module-1-intro-ifs')).toBeNull()
  })
})
