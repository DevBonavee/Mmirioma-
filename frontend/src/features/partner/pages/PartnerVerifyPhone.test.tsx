// @vitest-environment jsdom
import { QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createQueryClient } from '../../../app/queryClient'
import { mockLogin } from '../../../mocks/authMock'
import { resetMockDb } from '../../../mocks/db'
import { openCodeForTests } from '../../../mocks/phoneVerificationMock'
import { listSignupAreas, partnerSignup } from '../../../mocks/partnerMock'
import { DEMO_PASSWORD } from '../../../mocks/seed'
import { PARTNER_APPS, PartnerAppContext } from '../partnerContext'
import { VerifyPhoneNotice } from '../components/VerifyPhoneNotice'
import { PartnerVerifyPhone } from './PartnerVerifyPhone'

const WAIT = 10_000

function renderAt(path: string, state?: unknown) {
  return render(
    <QueryClientProvider client={createQueryClient()}>
      <PartnerAppContext.Provider value={PARTNER_APPS.keke}>
        <MemoryRouter initialEntries={[{ pathname: path, state }]}>
          <Routes>
            <Route path="/partner/verify-phone" element={<PartnerVerifyPhone />} />
            <Route path="/partner" element={<p>Partner home</p>} />
            <Route path="/partner/rider/profile" element={<p>Partner profile</p>} />
            <Route path="/partner/rider" element={<VerifyPhoneNotice from="/partner/rider" />} />
          </Routes>
        </MemoryRouter>
      </PartnerAppContext.Provider>
    </QueryClientProvider>,
  )
}

beforeEach(async () => {
  resetMockDb()
  vi.spyOn(console, 'info').mockImplementation(() => {})
})

/** A new, unverified rider, signed in. */
async function newRider() {
  const [area] = await listSignupAreas()
  await partnerSignup({
    name: 'Sample Rider',
    phone: '0800 000 0071',
    password: 'sample-password-1',
    vehicle_type: 'keke',
    plate: 'ENU 123 AB',
    tank_gallons: null,
    service_zone_id: area.id,
  })
}

describe('PartnerVerifyPhone (mock mode)', () => {
  it('offers "Do this later" right after sign-up and goes to the partner home', async () => {
    await newRider()
    const user = userEvent.setup()
    renderAt('/partner/verify-phone', { afterSignup: true, from: '/partner' })
    expect(await screen.findByText('Verify your phone number', undefined, { timeout: WAIT })).toBeInTheDocument()
    expect(screen.getByText(/Admin can approve you once your phone is verified/)).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Do this later' }))
    expect(await screen.findByText('Partner home')).toBeInTheDocument()
  })

  it('does not offer "Do this later" when opened from the home notice', async () => {
    await newRider()
    renderAt('/partner/verify-phone', { from: '/partner/rider' })
    await screen.findByRole('button', { name: 'Send code' }, { timeout: WAIT })
    expect(screen.queryByRole('button', { name: 'Do this later' })).not.toBeInTheDocument()
  })

  it('sends a code, verifies it and says admin can now approve', async () => {
    await newRider()
    const user = userEvent.setup()
    renderAt('/partner/verify-phone', { from: '/partner/rider/profile' })
    await user.click(await screen.findByRole('button', { name: 'Send code' }, { timeout: WAIT }))
    const field = await screen.findByLabelText('Code')
    await user.type(field, openCodeForTests()!)
    await user.click(screen.getByRole('button', { name: 'Verify' }))
    expect(await screen.findByText('Admin can now approve you.')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Continue' }))
    expect(await screen.findByText('Partner profile')).toBeInTheDocument()
  })

  it('ignores a return path outside the partner app', async () => {
    await newRider()
    const user = userEvent.setup()
    renderAt('/partner/verify-phone', { from: '/home' })
    await user.click(await screen.findByRole('button', { name: 'Send code' }, { timeout: WAIT }))
    await user.type(await screen.findByLabelText('Code'), openCodeForTests()!)
    await user.click(screen.getByRole('button', { name: 'Verify' }))
    await user.click(await screen.findByRole('button', { name: 'Continue' }))
    expect(await screen.findByText('Partner home')).toBeInTheDocument()
  })

  it('shows an already verified partner the success screen', async () => {
    await mockLogin({ phone: '+2348000000101', password: DEMO_PASSWORD })
    renderAt('/partner/verify-phone')
    expect(await screen.findByText('Admin can now approve you.', undefined, { timeout: WAIT })).toBeInTheDocument()
  })
})

describe('VerifyPhoneNotice', () => {
  it('shows while the phone is not verified, with a link to verify', async () => {
    await newRider()
    renderAt('/partner/rider')
    expect(await screen.findByText(/Verify your phone number so admin can approve you/, undefined, { timeout: WAIT })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Verify phone' })).toHaveAttribute('href', '/partner/verify-phone')
  })

  it('is hidden once the phone is verified', async () => {
    await mockLogin({ phone: '+2348000000101', password: DEMO_PASSWORD })
    renderAt('/partner/rider')
    await waitFor(() => expect(screen.queryByText(/Verify your phone number so admin/)).not.toBeInTheDocument())
  })
})
