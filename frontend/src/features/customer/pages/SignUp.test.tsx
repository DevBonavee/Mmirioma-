// @vitest-environment jsdom
import { QueryClientProvider } from '@tanstack/react-query'
import { act, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createQueryClient } from '../../../app/queryClient'
import { ApiError } from '../../../lib/api/client'
import { SignUp } from './SignUp'

const server = vi.hoisted(() => ({ refusal: null as unknown, sent: [] as unknown[] }))

vi.mock('../../auth/authApi', async (original) => ({
  ...(await original<object>()),
  register: async (input: unknown) => {
    server.sent.push(input)
    if (server.refusal) throw server.refusal
    return { user: { id: 'u1', name: 'Sample', phone: '+2348031234567', role: 'customer', phone_verified: false }, csrf_token: 'x', expires_at: '2030-01-01T00:00:00Z' }
  },
}))

const STRONG = 'Sample-Passw0rd'

const refused = (status: number, code: string, details: unknown = null) => new ApiError({ kind: 'http', status, code, message: 'Refused by the server', details })

function renderForm() {
  render(
    <QueryClientProvider client={createQueryClient()}>
      <MemoryRouter initialEntries={['/signup']}>
        <Routes>
          <Route path="/signup" element={<SignUp />} />
          <Route path="/verify-phone" element={<p>Verify phone screen</p>} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  )
  return userEvent.setup()
}

const submit = () => screen.getByRole('button', { name: 'Create account' })
const box = () => screen.getByRole('checkbox', { name: /18 or older/ })

async function fill(user: ReturnType<typeof userEvent.setup>, { password = STRONG, confirm = STRONG, tick = true } = {}) {
  await user.type(screen.getByLabelText('Full name'), 'Sample Customer')
  await user.type(screen.getByLabelText('Phone number'), '08031234567')
  await user.type(screen.getByLabelText('Password'), password)
  await user.type(screen.getByLabelText('Confirm password'), confirm)
  if (tick) await user.click(box())
}

beforeEach(() => {
  server.refusal = null
  server.sent = []
})

afterEach(() => vi.useRealTimers())

describe('SignUp password checklist', () => {
  const item = (text: string | RegExp) => screen.getByText(text).closest('li')!

  it('shows the four rules as not met, with no error, on an empty form', () => {
    renderForm()
    const list = screen.getByRole('list', { name: 'Your password needs:' })
    expect(within(list).getAllByRole('listitem')).toHaveLength(4)
    expect(list.textContent?.match(/not met/g)).toHaveLength(4)
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })

  it.each([
    ['At least 8 characters', 'aaaaaaaa'],
    ['An uppercase letter', 'A'],
    ['A number', '1'],
    [/^A symbol/, '!'],
  ])('marks "%s" as met as soon as it is typed', async (rule, typed) => {
    const user = renderForm()
    expect(item(rule)).toHaveTextContent('not met')
    await user.type(screen.getByLabelText('Password'), typed)
    expect(item(rule)).not.toHaveTextContent('not met')
    expect(item(rule)).toHaveTextContent('met')
  })

  it('shows a check icon for a met rule, so it does not rely on colour alone', async () => {
    const user = renderForm()
    expect(item('A number').querySelector('svg')).toBeNull()
    await user.type(screen.getByLabelText('Password'), '1')
    expect(item('A number').querySelector('svg')).not.toBeNull()
  })

  it('announces the count once typing pauses, not on each keystroke', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true })
    const user = renderForm()
    const status = screen.getByRole('status')
    await user.type(screen.getByLabelText('Password'), 'A1')
    expect(status).toHaveTextContent('')
    await act(() => vi.advanceTimersByTimeAsync(1000))
    expect(status).toHaveTextContent('2 of 4 password rules met')
  })
})

describe('SignUp submit', () => {
  it('stays off until the four rules are met, then turns on', async () => {
    const user = renderForm()
    expect(submit()).toBeDisabled()
    await user.type(screen.getByLabelText('Password'), 'Aa1!aaa')
    expect(submit()).toBeDisabled()
    await user.type(screen.getByLabelText('Password'), 'a')
    expect(submit()).toBeEnabled()
  })

  it('stays off over 128 characters and says why, with every rule met', async () => {
    const user = renderForm()
    await user.click(screen.getByLabelText('Password'))
    await user.paste('A1!' + 'a'.repeat(126))
    expect(submit()).toBeDisabled()
    expect(screen.getByText('Use 128 characters or fewer.')).toBeInTheDocument()
  })

  it('sends the tick and never the confirmation', async () => {
    const user = renderForm()
    await fill(user)
    await user.click(submit())
    expect(await screen.findByText('Verify phone screen')).toBeInTheDocument()
    expect(server.sent).toEqual([{ name: 'Sample Customer', phone: '08031234567', password: STRONG, accepted_terms: true }])
  })

  it('does not send when the passwords differ, and says so under the field', async () => {
    const user = renderForm()
    await fill(user, { confirm: 'Sample-Passw0rdX' })
    await user.click(submit())
    expect(await screen.findByText('The passwords do not match.')).toBeInTheDocument()
    expect(screen.getByLabelText('Confirm password')).toHaveAttribute('aria-invalid', 'true')
    expect(server.sent).toEqual([])
  })

  it('shows a mismatch even when another field is also wrong', async () => {
    const user = renderForm()
    await user.type(screen.getByLabelText('Password'), STRONG)
    await user.type(screen.getByLabelText('Confirm password'), 'different')
    await user.click(submit())
    expect(await screen.findByText('The passwords do not match.')).toBeInTheDocument()
    expect(screen.getByText('Enter your full name.')).toBeInTheDocument()
  })

  it('shows a mismatch when the person leaves the field', async () => {
    const user = renderForm()
    await user.type(screen.getByLabelText('Password'), STRONG)
    await user.type(screen.getByLabelText('Confirm password'), 'different')
    await user.tab()
    expect(await screen.findByText('The passwords do not match.')).toBeInTheDocument()
  })

  it('does not send without the tick, and says so under the box', async () => {
    const user = renderForm()
    await fill(user, { tick: false })
    await user.click(submit())
    expect(await screen.findByText('Tick the box to confirm you are 18 or older and agree.')).toBeInTheDocument()
    expect(box()).toHaveAttribute('aria-invalid', 'true')
    expect(server.sent).toEqual([])
  })

  it('checks the phone when the person leaves the field, but not while it is empty', async () => {
    const user = renderForm()
    await user.click(screen.getByLabelText('Phone number'))
    await user.tab()
    expect(screen.queryByText(/Nigerian mobile number/)).not.toBeInTheDocument()
    await user.type(screen.getByLabelText('Phone number'), '12345')
    await user.tab()
    expect(await screen.findByText('Enter a Nigerian mobile number, for example 0803 123 4567.')).toBeInTheDocument()
  })
})

describe('SignUp box', () => {
  it('links the pages by their own names, opening in a new tab so the form is kept', () => {
    renderForm()
    const terms = screen.getByRole('link', { name: /Terms of Service/ })
    const privacy = screen.getByRole('link', { name: /Privacy Notice/ })
    expect(terms).toHaveAttribute('href', '/terms')
    expect(privacy).toHaveAttribute('href', '/privacy')
    for (const link of [terms, privacy]) {
      expect(link).toHaveAttribute('target', '_blank')
      expect(link).toHaveAttribute('rel', 'noreferrer')
    }
  })

  it('replaces the line saying agreement is implied, and the old placeholder', () => {
    renderForm()
    expect(screen.queryByText(/By signing up you agree/)).not.toBeInTheDocument()
    expect(screen.getByLabelText('Password')).not.toHaveAttribute('placeholder')
  })
})

describe('SignUp server errors', () => {
  async function refusedWith(error: ApiError) {
    server.refusal = error
    const user = renderForm()
    await fill(user)
    await user.click(submit())
  }

  it('shows a password refusal under Password and clears both password fields', async () => {
    const msg = 'Your password needs a symbol.'
    await refusedWith(refused(422, 'validation_error', [{ loc: ['body', 'password'], msg, type: 'value_error' }]))
    expect(await screen.findByText(msg)).toBeInTheDocument()
    expect(screen.getByLabelText('Password')).toHaveValue('')
    expect(screen.getByLabelText('Confirm password')).toHaveValue('')
  })

  it('shows an acceptance refusal under the box', async () => {
    const msg = 'Confirm you are 18 or older and accept the Terms of Service and Privacy Notice.'
    await refusedWith(refused(422, 'validation_error', [{ loc: ['body', 'accepted_terms'], msg, type: 'value_error' }]))
    expect(await screen.findByText(msg)).toBeInTheDocument()
    expect(box()).toHaveAttribute('aria-invalid', 'true')
  })

  it('shows a used phone under Phone number, keeps the name, phone and tick, and clears the passwords', async () => {
    await refusedWith(refused(409, 'phone_already_registered'))
    expect(await screen.findByText('This number already has an account. Sign in instead.')).toBeInTheDocument()
    expect(screen.getByLabelText('Full name')).toHaveValue('Sample Customer')
    expect(screen.getByLabelText('Phone number')).toHaveValue('08031234567')
    expect(box()).toBeChecked()
    expect(screen.getByLabelText('Password')).toHaveValue('')
    expect(submit()).toBeDisabled()
  })

  it('shows the wait for too many tries in the top notice, and clears the passwords', async () => {
    await refusedWith(refused(429, 'too_many_attempts', { retry_after_seconds: 600 }))
    expect(await screen.findByText('Too many tries. Wait 10 minutes, then try again.')).toBeInTheDocument()
    expect(screen.getByLabelText('Confirm password')).toHaveValue('')
  })

  it('shows a lost connection in the top notice, and clears the passwords', async () => {
    await refusedWith(new ApiError({ kind: 'network', status: null, code: 'network_error', message: 'Unable to reach the server. Check your connection and try again.', details: null }))
    expect(await screen.findByText(/Unable to reach the server|connection/i)).toBeInTheDocument()
    expect(screen.getByLabelText('Password')).toHaveValue('')
  })
})
