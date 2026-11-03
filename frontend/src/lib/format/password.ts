/**
 * The new-password rule from docs/api/auth.md (#332). The server enforces it;
 * forms and mocks use this copy so they give the same answer and the same words.
 */

const MIN_LENGTH = 8
const MAX_LENGTH = 128

/**
 * Say what a new password still needs.
 *
 * Uppercase and number mean plain `A-Z` and `0-9`. A symbol is anything that is
 * not a letter, a number or whitespace, so `₦` counts. Lowercase is not required.
 * Length counts characters, not UTF-16 units, as the server does.
 *
 * @returns A message naming everything missing at once, or `null` when the
 *   password is acceptable.
 */
export function passwordProblem(password: string): string | null {
  const length = [...password].length
  if (length > MAX_LENGTH) return `Use ${MAX_LENGTH} characters or fewer.`
  const missing: string[] = []
  if (length < MIN_LENGTH) missing.push(`at least ${MIN_LENGTH} characters`)
  if (!/[A-Z]/.test(password)) missing.push('an uppercase letter')
  if (!/[0-9]/.test(password)) missing.push('a number')
  if (!/[^\p{L}\p{N}\s]/u.test(password)) missing.push('a symbol')
  if (missing.length === 0) return null
  const needed = missing.length === 1 ? missing[0] : `${missing.slice(0, -1).join(', ')} and ${missing.at(-1)}`
  return `Your password needs ${needed}.`
}
