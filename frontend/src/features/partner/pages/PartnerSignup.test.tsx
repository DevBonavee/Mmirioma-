// @vitest-environment jsdom
import { QueryClientProvider } from '@tanstack/react-query'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createQueryClient } from '../../../app/queryClient'
import { ApiError } from '../../../lib/api/client'
import { PartnerSignup } from './PartnerSignup'

/** What the next sign-up answers; set by each test. */
const server = vi.hoisted(() => ({
  refusal: null as unknown,
  /** What the area list answers: areas, or an error to throw. */
  areas: [{ id: 'zone-1', name: 'Zone One' }] as { id: string; name: string }[] | Error,
  signedUp: [] as unknown[],
}))

vi.mock('../partnerApi', () => ({
  listSignupAreas: async () => {
    if (server.areas instanceof Error) throw server.areas
    return server.areas
  },
  partnerSignup: async (input: unknown) => {
    server.signedUp.push(input)
    if (server.refusal) throw server.refusal
    return { user: { id: 'u1', name: 'Sample Rider', phone: '+2348031234567', role: 'driver', phone_verified: false } }
  },
}))

vi.mock('../../marketing/queries', () => ({ useSupportContact: () => ({ phone: '+2348000000000', whatsapp: null }) }))

const refused = (details: unknown) =>
  new ApiError({ kind: 'http', status: 422, code: 'validation_error', message: 'Request validation failed', details })

function renderSignup() {
  return render(
    <QueryClientProvider client={createQueryClient()}>
      <MemoryRouter initialEntries={['/partner/signup']}>
        <Routes>
          <Route path="/partner/signup" element={<PartnerSignup />} />
          <Route path="/partner" element={<p>Partner home</p>} />
          <Route path="/partner/verify-phone" element={<p>Verify phone screen</p>} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

/** The password, its confirmation and the box, which every submit needs. */
async function fillSecurity(user: ReturnType<typeof userEvent.setup>) {
  await user.type(screen.getByLabelText('Password'), 'Sample-Passw0rd-1')
  await user.type(screen.getByLabelText('Confirm password'), 'Sample-Passw0rd-1')
  await user.click(screen.getByRole('checkbox', { name: /18 or older/ }))
}

async function submitForm(refusal: ApiError) {
  server.refusal = refusal
  const user = userEvent.setup()
  renderSignup()
  await user.type(screen.getByLabelText('Full name'), 'Sample Rider')
  await user.type(screen.getByLabelText('Phone number'), '08031234567')
  await user.type(screen.getByLabelText('Plate number'), 'ENU 482 KK')
  await user.selectOptions(await screen.findByLabelText('Area you work in'), 'zone-1')
  await fillSecurity(user)
  await user.click(screen.getByRole('button', { name: 'Create account' }))
}

describe('PartnerSignup server errors (#80)', () => {
  it('shows an area error under the area field', async () => {
    const msg = 'This area is not open for sign-up any more. Choose another area.'
    await submitForm(refused([{ loc: ['body', 'service_zone_id'], msg, type: 'value_error' }]))
    expect(await screen.findByText(msg)).toBeInTheDocument()
    expect(screen.queryByText('Request validation failed')).not.toBeInTheDocument()
  })

  it('puts errors no field can show in the top notice, and keeps the field errors', async () => {
    await submitForm(
      refused([
        { loc: ['body', 'plate'], msg: 'Use 4 to 15 characters', type: 'value_error' },
        { loc: ['body', 'vehicle_type'], msg: 'Choose keke or tanker', type: 'enum' },
        { loc: ['body'], msg: 'Request body is not valid', type: 'value_error' },
      ]),
    )
    expect(await screen.findByText('Choose keke or tanker Request body is not valid')).toBeInTheDocument()
    expect(screen.getByText('Use 4 to 15 characters')).toBeInTheDocument()
  })

  it('shows the message of a validation error without details', async () => {
    await submitForm(refused(null))
    expect(await screen.findByText('Request validation failed')).toBeInTheDocument()
  })
})

describe('PartnerSignup password and terms (#336, the same as the customer form)', () => {
  const submit = () => screen.getByRole('button', { name: 'Create account' })
  const box = () => screen.getByRole('checkbox', { name: /18 or older/ })

  async function fillAllBut(user: ReturnType<typeof userEvent.setup>, { confirm = 'Sample-Passw0rd-1', tick = true } = {}) {
    await user.type(screen.getByLabelText('Full name'), 'Sample Rider')
    await user.type(screen.getByLabelText('Phone number'), '08031234567')
    await user.type(screen.getByLabelText('Plate number'), 'ENU 482 KK')
    await user.selectOptions(await screen.findByLabelText('Area you work in'), 'zone-1')
    await user.type(screen.getByLabelText('Password'), 'Sample-Passw0rd-1')
    await user.type(screen.getByLabelText('Confirm password'), confirm)
    if (tick) await user.click(box())
  }

  beforeEach(() => {
    server.areas = [{ id: 'zone-1', name: 'Zone One' }]
    server.refusal = null
    server.signedUp = []
  })

  it('shows the checklist, and keeps the button off until the four rules are met', async () => {
    const user = userEvent.setup()
    renderSignup()
    await screen.findByRole('option', { name: 'Zone One' })
    expect(screen.getByRole('list', { name: 'Your password needs:' }).textContent?.match(/not met/g)).toHaveLength(4)
    expect(submit()).toBeDisabled()
    await user.type(screen.getByLabelText('Password'), 'Aa1!aaaa')
    expect(submit()).toBeEnabled()
  })

  it('sends the tick and never the confirmation', async () => {
    const user = userEvent.setup()
    renderSignup()
    await fillAllBut(user)
    await user.click(submit())
    await screen.findByText('Verify phone screen')
    expect(server.signedUp[0]).toMatchObject({ password: 'Sample-Passw0rd-1', accepted_terms: true })
    expect(server.signedUp[0]).not.toHaveProperty('confirm_password')
  })

  it('does not send when the passwords differ', async () => {
    const user = userEvent.setup()
    renderSignup()
    await fillAllBut(user, { confirm: 'different' })
    await user.click(submit())
    expect(await screen.findByText('The passwords do not match.')).toBeInTheDocument()
    expect(server.signedUp).toEqual([])
  })

  it('does not send without the tick', async () => {
    const user = userEvent.setup()
    renderSignup()
    await fillAllBut(user, { tick: false })
    await user.click(submit())
    expect(await screen.findByText('Tick the box to confirm you are 18 or older and agree.')).toBeInTheDocument()
    expect(server.signedUp).toEqual([])
  })

  it('shows an acceptance refusal under the box, not in the top notice', async () => {
    const msg = 'Confirm you are 18 or older and accept the Terms of Service and Privacy Notice.'
    server.refusal = refused([{ loc: ['body', 'accepted_terms'], msg, type: 'value_error' }])
    const user = userEvent.setup()
    renderSignup()
    await fillAllBut(user)
    await user.click(submit())
    expect(await screen.findByText(msg)).toBeInTheDocument()
    expect(box()).toHaveAttribute('aria-invalid', 'true')
    expect(screen.getAllByText(msg)).toHaveLength(1)
  })

  it('after a refusal keeps the phone and the tick, and clears both password fields', async () => {
    const msg = 'Your password needs a symbol.'
    server.refusal = refused([{ loc: ['body', 'password'], msg, type: 'value_error' }])
    const user = userEvent.setup()
    renderSignup()
    await fillAllBut(user)
    await user.click(submit())
    expect(await screen.findByText(msg)).toBeInTheDocument()
    expect(screen.getByLabelText('Phone number')).toHaveValue('08031234567')
    expect(box()).toBeChecked()
    expect(screen.getByLabelText('Password')).toHaveValue('')
    expect(screen.getByLabelText('Confirm password')).toHaveValue('')
  })

  it('links the pages by their own names, opening in a new tab', async () => {
    renderSignup()
    await screen.findByRole('option', { name: 'Zone One' })
    expect(screen.getByRole('link', { name: /Terms of Service/ })).toHaveAttribute('target', '_blank')
    expect(screen.getByRole('link', { name: /Privacy Notice/ })).toHaveAttribute('target', '_blank')
  })
})

describe('PartnerSignup after success', () => {
  it('goes to the phone verification screen, because admin cannot approve an unverified phone', async () => {
    server.areas = [{ id: 'zone-1', name: 'Zone One' }]
    server.refusal = null
    const user = userEvent.setup()
    renderSignup()
    await user.type(screen.getByLabelText('Full name'), 'Sample Rider')
    await user.type(screen.getByLabelText('Phone number'), '08031234567')
    await user.type(screen.getByLabelText('Plate number'), 'ENU 482 KK')
    await user.selectOptions(await screen.findByLabelText('Area you work in'), 'zone-1')
    await fillSecurity(user)
    await user.click(screen.getByRole('button', { name: 'Create account' }))
    expect(await screen.findByText('Verify phone screen')).toBeInTheDocument()
  })
})

describe('PartnerSignup area dropdown', () => {
  it('lists the active areas by name and sends the chosen ID, not text', async () => {
    server.areas = [
      { id: 'zone-1', name: 'Zone One' },
      { id: 'zone-2', name: 'Zone Two' },
    ]
    server.signedUp = []
    await submitForm(refused(null))
    expect(screen.getByRole('option', { name: 'Zone Two' })).toBeInTheDocument()
    expect(server.signedUp[0]).toMatchObject({ service_zone_id: 'zone-1' })
  })

  it('asks for an area when none is chosen, without calling the server', async () => {
    server.areas = [{ id: 'zone-1', name: 'Zone One' }]
    server.signedUp = []
    const user = userEvent.setup()
    renderSignup()
    await screen.findByRole('option', { name: 'Zone One' })
    await fillSecurity(user)
    await user.click(screen.getByRole('button', { name: 'Create account' }))
    expect(await screen.findByText('Choose the area you work in.')).toBeInTheDocument()
    expect(server.signedUp).toEqual([])
  })

  it('explains that sign-up is unavailable, with the support number, when no area is set up', async () => {
    server.areas = []
    renderSignup()
    expect(await screen.findByText(/Driver sign-up is not open right now/)).toBeInTheDocument()
    expect(screen.getByRole('link', { name: '0800 000 0000' })).toHaveAttribute('href', 'tel:+2348000000000')
    expect(screen.getByRole('button', { name: 'Create account' })).toBeDisabled()
  })

  it('shows the load failure with a retry, and keeps sign-up off', async () => {
    server.areas = new ApiError({ kind: 'config', status: null, code: 'api_unavailable', message: 'The server is not reachable.' })
    renderSignup()
    expect(await screen.findByRole('button', { name: 'Try again' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Create account' })).toBeDisabled()
    server.areas = [{ id: 'zone-1', name: 'Zone One' }]
    await userEvent.setup().click(screen.getByRole('button', { name: 'Try again' }))
    expect(await screen.findByRole('option', { name: 'Zone One' })).toBeInTheDocument()
  })
})
