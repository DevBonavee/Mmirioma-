import { describe, expect, it } from 'vitest'
import { newPasswordField } from '../forms'
import { passwordProblem } from './password'

describe('passwordProblem (docs/api/auth.md, #332)', () => {
  it.each([
    ['exactly 8 characters', 'Aa1!aaaa'],
    ['exactly 128 characters', 'A1!' + 'a'.repeat(125)],
    ['no lowercase', 'ALLCAPS1!'],
    ['the naira sign as the symbol', 'Password1₦'],
    ['spaces, with an underscore as the symbol', 'Pass word 1_'],
  ])('accepts %s', (_name, password) => {
    expect(passwordProblem(password)).toBeNull()
  })

  it.each([
    ['7 characters', 'Aa1!aaa', 'Your password needs at least 8 characters.'],
    ['129 characters', 'A1!' + 'a'.repeat(126), 'Use 128 characters or fewer.'],
    ['no uppercase', 'password1!', 'Your password needs an uppercase letter.'],
    ['no number', 'Password!!', 'Your password needs a number.'],
    ['no symbol', 'Password11', 'Your password needs a symbol.'],
    ['two missing', 'password1', 'Your password needs an uppercase letter and a symbol.'],
    ['three missing', 'password', 'Your password needs an uppercase letter, a number and a symbol.'],
    ['everything missing', 'abc', 'Your password needs at least 8 characters, an uppercase letter, a number and a symbol.'],
    ['a space as the only other character', 'Password1 ', 'Your password needs a symbol.'],
    ['an accented capital only', 'Éclair1!', 'Your password needs an uppercase letter.'],
    ['a non-ASCII digit only', 'Pass١word!', 'Your password needs a number.'],
    ['an accented letter as the only other character', 'Passw0rdé', 'Your password needs a symbol.'],
  ])('refuses %s, naming everything missing', (_name, password, message) => {
    expect(passwordProblem(password)).toBe(message)
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
