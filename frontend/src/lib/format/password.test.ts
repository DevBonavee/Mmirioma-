import { describe, expect, it } from 'vitest'
import cases from '../../../../docs/api/examples/password-rule-cases.json'
import { newPasswordField } from '../forms'
import { PASSWORD_RULES, isPasswordTooLong, passwordProblem } from './password'

describe('passwordProblem matches the server (docs/api/auth.md, #332)', () => {
  // The backend's test_password_rule.py reads the same file for password_problem.
  it.each(cases)('$name', ({ password, problem }) => {
    expect(passwordProblem(password)).toBe(problem)
  })
})

describe('PASSWORD_RULES (docs/design/sign-up-password-and-terms.md)', () => {
  const met = (password: string) => PASSWORD_RULES.filter((rule) => rule.met(password)).map((rule) => rule.id)

  it('lists the four rules in the order the checklist shows them', () => {
    expect(PASSWORD_RULES.map((rule) => rule.label)).toEqual([
      'At least 8 characters',
      'An uppercase letter',
      'A number',
      'A symbol, such as ! @ _ or ₦',
    ])
  })

  it.each([
    ['nothing', '', []],
    ['the length alone', 'aaaaaaaa', ['length']],
    ['just under the length, with the rest', 'Aa1!aaa', ['uppercase', 'number', 'symbol']],
    ['exactly the length', 'Aa1!aaaa', ['length', 'uppercase', 'number', 'symbol']],
  ])('marks %s', (_name, password, expected) => {
    expect(met(password)).toEqual(expected)
  })

  it('still counts every rule as met over 128 characters, which isPasswordTooLong catches', () => {
    const long = 'A1!' + 'a'.repeat(126)
    expect(met(long)).toHaveLength(4)
    expect(isPasswordTooLong(long)).toBe(true)
    expect(isPasswordTooLong('A1!' + 'a'.repeat(125))).toBe(false)
  })
})

describe('newPasswordField', () => {
  it('passes a strong password', () => {
    expect(newPasswordField.safeParse('Sample-Passw0rd').success).toBe(true)
  })

  it('shows the same message as the server', () => {
    const result = newPasswordField.safeParse('password1!')
    expect(result.success).toBe(false)
    expect(result.error?.issues[0].message).toBe('Your password needs an uppercase letter.')
  })
})
