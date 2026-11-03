/**
 * The new-password rule from docs/api/auth.md (#332). The server enforces it;
 * forms, the checklist and mocks use this copy, so they give the same answer and
 * the same words. `docs/api/examples/password-rule-cases.json` is checked against
 * both copies.
 */

const MIN_LENGTH = 8
const MAX_LENGTH = 128

/** Length in characters, not UTF-16 units, as the server counts. */
const length = (password: string) => [...password].length

/** One rule of the password: what the checklist shows and what a refusal names. */
export interface PasswordRule {
  id: 'length' | 'uppercase' | 'number' | 'symbol'
  /** The checklist's text. */
  label: string
  /** The words in a refusal: "Your password needs ...". */
  need: string
  met: (password: string) => boolean
}

/**
 * The four rules, in the order they are shown and named. Uppercase and number
 * mean plain `A-Z` and `0-9`. A symbol is anything that is not a letter, a number
 * or whitespace, so `₦` counts. Lowercase is not required.
 */
export const PASSWORD_RULES: readonly PasswordRule[] = [
  { id: 'length', label: `At least ${MIN_LENGTH} characters`, need: `at least ${MIN_LENGTH} characters`, met: (p) => length(p) >= MIN_LENGTH },
  { id: 'uppercase', label: 'An uppercase letter', need: 'an uppercase letter', met: (p) => /[A-Z]/.test(p) },
  { id: 'number', label: 'A number', need: 'a number', met: (p) => /[0-9]/.test(p) },
  { id: 'symbol', label: 'A symbol, such as ! @ _ or ₦', need: 'a symbol', met: (p) => /[^\p{L}\p{N}\s]/u.test(p) },
]

/** Whether the password is over the maximum, which the checklist cannot show. */
export function isPasswordTooLong(password: string): boolean {
  return length(password) > MAX_LENGTH
}

/**
 * Say what a new password still needs.
 *
 * @returns A message naming everything missing at once, or `null` when the
 *   password is acceptable.
 */
export function passwordProblem(password: string): string | null {
  if (isPasswordTooLong(password)) return `Use ${MAX_LENGTH} characters or fewer.`
  const missing = PASSWORD_RULES.filter((rule) => !rule.met(password)).map((rule) => rule.need)
  if (missing.length === 0) return null
  const needed = missing.length === 1 ? missing[0] : `${missing.slice(0, -1).join(', ')} and ${missing.at(-1)}`
  return `Your password needs ${needed}.`
}
