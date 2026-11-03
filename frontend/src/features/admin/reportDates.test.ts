import { describe, expect, it } from 'vitest'
import { MAX_CUSTOM_DAYS, lagosToday, validateCustomRange } from './reportDates'

const TODAY = '2026-11-02'

describe('validateCustomRange', () => {
  it('accepts one day, today included', () => {
    expect(validateCustomRange(TODAY, TODAY, TODAY)).toBeNull()
  })

  it('accepts exactly 90 days and refuses 91', () => {
    expect(validateCustomRange('2026-08-05', TODAY, TODAY)).toBeNull() // 90 days counting both ends
    expect(validateCustomRange('2026-08-04', TODAY, TODAY)).toBe(`Choose ${MAX_CUSTOM_DAYS} days or fewer.`)
  })

  it('asks for both dates', () => {
    expect(validateCustomRange('', TODAY, TODAY)).toBe('Choose a start and an end date.')
    expect(validateCustomRange(TODAY, '', TODAY)).toBe('Choose a start and an end date.')
  })

  it('refuses an end date in the future, before the order check', () => {
    expect(validateCustomRange('2026-11-04', '2026-11-03', TODAY)).toBe('The end date cannot be in the future.')
  })

  it('refuses a start date after the end date', () => {
    expect(validateCustomRange('2026-11-02', '2026-11-01', TODAY)).toBe('From must be on or before To.')
  })

  it('counts days across a leap day correctly', () => {
    expect(validateCustomRange('2028-01-01', '2028-03-30', '2028-12-31')).toBeNull() // 90 days
    expect(validateCustomRange('2028-01-01', '2028-03-31', '2028-12-31')).not.toBeNull() // 91 days
  })
})

describe('lagosToday', () => {
  it('uses the Lagos date, not the UTC one', () => {
    // 23:30 UTC on 1 November is 00:30 on 2 November in Lagos (UTC+1).
    expect(lagosToday(new Date('2026-11-01T23:30:00Z'))).toBe('2026-11-02')
    expect(lagosToday(new Date('2026-11-02T10:00:00Z'))).toBe('2026-11-02')
  })
})
