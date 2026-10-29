import {describe, expect, it} from 'vitest'
import {
  compareVersions,
  nextMinor,
  replaceMarketingVersion
} from '../src/version'

describe('nextMinor', () => {
  it('bumps a two-part version', () => {
    expect(nextMinor('1.2')).toBe('1.3')
  })

  it('turns a single segment into x.1', () => {
    expect(nextMinor('3')).toBe('3.1')
  })
})

describe('compareVersions', () => {
  it('orders dotted versions', () => {
    expect(compareVersions('1.2', '1.10')).toBeLessThan(0)
    expect(compareVersions('2.0', '1.9')).toBeGreaterThan(0)
  })
})

describe('replaceMarketingVersion', () => {
  it('rewrites the marketing version line', () => {
    expect(
      replaceMarketingVersion('MARKETING_VERSION = 1.0\nOTHER = 1\n', '1.1')
    ).toBe('MARKETING_VERSION = 1.1\nOTHER = 1\n')
  })
})
