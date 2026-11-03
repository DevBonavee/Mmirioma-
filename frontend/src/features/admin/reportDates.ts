/**
 * Date rules of the Reports page's custom range (docs/api/admin-operations.md,
 * the #333 amendment). The server checks the same rules and answers 422
 * `validation_error`; checking here first shows the message next to the
 * field without a round trip.
 */

/** Longest custom range, in Lagos days (both end dates included). */
export const MAX_CUSTOM_DAYS = 90

/**
 * Today's date in Africa/Lagos.
 *
 * @param now - The current time; tests pass a fixed one.
 * @returns `YYYY-MM-DD`.
 */
export function lagosToday(now: Date = new Date()): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Africa/Lagos', year: 'numeric', month: '2-digit', day: '2-digit' }).format(now)
}

/** Whole days from `from` to `to`, both `YYYY-MM-DD`, counting both ends. */
function daysInclusive(from: string, to: string): number {
  return Math.round((Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / 86_400_000) + 1
}

/**
 * Check a custom range before it is sent.
 *
 * @param from - First date, `YYYY-MM-DD`, or empty.
 * @param to - Last date, `YYYY-MM-DD`, or empty.
 * @param today - Today in Africa/Lagos, `YYYY-MM-DD`.
 * @returns The message to show under the fields, or `null` when the range is valid.
 */
export function validateCustomRange(from: string, to: string, today: string): string | null {
  if (!from || !to) return 'Choose a start and an end date.'
  if (to > today) return 'The end date cannot be in the future.'
  if (from > to) return 'From must be on or before To.'
  if (daysInclusive(from, to) > MAX_CUSTOM_DAYS) return `Choose ${MAX_CUSTOM_DAYS} days or fewer.`
  return null
}
