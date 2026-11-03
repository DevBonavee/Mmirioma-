// @vitest-environment jsdom
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { RouterProvider, createMemoryRouter } from 'react-router-dom'
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import activitySample from '../../../../docs/api/examples/admin-activity.json'
import dashboardSample from '../../../../docs/api/examples/admin-dashboard.json'
import liveMapSample from '../../../../docs/api/examples/admin-live-map.json'
import ordersPageSample from '../../../../docs/api/examples/admin-orders-page.json'
import reportSample from '../../../../docs/api/examples/admin-report.json'
import settingsSample from '../../../../docs/api/examples/admin-settings.json'
import shellSample from '../../../../docs/api/examples/admin-shell.json'
import { lagosToday } from './reportDates'

// The real-API branches of the admin screens (#217): the adapters and the shared client run for real,
// and only `fetch` is replaced, answering with the contract's example responses.
vi.mock('../../lib/api/mode', () => ({ USE_MOCKS: false }))

const WAIT = 10_000
const SLOW = 20_000

const ME = { user: { id: 'u1', name: 'Sample Admin', phone: '+2348000000099', role: 'admin', phone_verified: true }, csrf_token: 'csrf', expires_at: '2099-01-01T00:00:00Z' }

let bodies: Record<string, unknown> = {}

/**
 * The shared API client binds `fetch` and the base URL when it is first
 * imported, so the stub and the env are set up before the app is loaded (in
 * `beforeAll`). It answers each backend path with a body from `bodies`;
 * anything else is a 404, as the real server would send.
 */
const fetchStub = vi.fn(async (input: RequestInfo | URL) => {
  const path = new URL(String(input), 'http://localhost').pathname.replace('/api/v1', '')
  const body = bodies[path] ?? { error: { code: 'not_found', message: 'No', details: null } }
  return new Response(JSON.stringify(body), { status: path in bodies ? 200 : 404, headers: { 'Content-Type': 'application/json' } })
})

function serve(overrides: Record<string, unknown> = {}) {
  bodies = {
    '/auth/me': ME,
    '/admin/shell': shellSample,
    '/admin/dashboard': dashboardSample,
    '/admin/live-map': liveMapSample,
    '/admin/activity': activitySample,
    '/admin/settings': settingsSample,
    '/admin/orders': ordersPageSample,
    '/admin/reports': reportSample,
    ...overrides,
  }
}

let App: typeof import('../../app/providers').AppProviders
let appRoutes: typeof import('../../app/router').routes

beforeAll(async () => {
  vi.stubGlobal('fetch', fetchStub)
  vi.stubEnv('VITE_API_BASE_URL', 'http://api.test')
  App = (await import('../../app/providers')).AppProviders
  appRoutes = (await import('../../app/router')).routes
})

afterAll(() => {
  vi.unstubAllGlobals()
  vi.unstubAllEnvs()
})

function renderAt(path: string) {
  render(
    <App>
      <RouterProvider router={createMemoryRouter(appRoutes, { initialEntries: [path] })} />
    </App>,
  )
}

beforeEach(() => serve())

describe('admin screens against the real API (#217)', () => {
  it('shows the dashboard from the backend: no payouts or payments cards, stations from the live map, drivers by name', async () => {
    renderAt('/admin')
    expect(await screen.findByText('Refill stations open', {}, { timeout: WAIT })).toBeInTheDocument()
    // The backend sends neither: the cards are hidden, not shown as zero.
    expect(screen.queryByText('Rider payouts due')).toBeNull()
    // Real orders are not sample data: the example has is_simulated true, so flip it in the next test; here the tag shows.
    expect(screen.getByText('SAMPLE DATA')).toBeInTheDocument()
    expect(screen.queryByText('Payments to verify')).toBeNull()
    // The panel reads the live map's water sources.
    const panel = (await screen.findByRole('heading', { name: 'Refill stations' }, { timeout: WAIT })).closest('section, div') as HTMLElement
    expect(await within(panel.parentElement as HTMLElement).findByText('Sample Borehole A', {}, { timeout: WAIT })).toBeInTheDocument()
    expect(within(panel.parentElement as HTMLElement).getByText('Sample Borehole B')).toBeInTheDocument()
    expect(within(panel.parentElement as HTMLElement).getByText('Open')).toBeInTheDocument()
    expect(within(panel.parentElement as HTMLElement).getByText('Closed')).toBeInTheDocument()
    // Recent orders name the driver; the others say none yet.
    expect((await screen.findAllByText('Sample Driver One', {}, { timeout: WAIT })).length).toBeGreaterThan(0)
  }, SLOW)

  it('shows no SAMPLE tag when the numbers are real orders (is_simulated false)', async () => {
    serve({ '/admin/dashboard': { ...dashboardSample, is_simulated: false } })
    renderAt('/admin')
    expect(await screen.findByText('Refill stations open', {}, { timeout: WAIT })).toBeInTheDocument()
    expect(screen.queryByText('SAMPLE DATA')).toBeNull()
    expect(screen.queryByText(/SAMPLE/)).toBeNull()
  }, SLOW)

  it('shows Settings read only: the two values the backend sends, no save button, no bracket placeholders', async () => {
    renderAt('/admin/settings')
    expect(await screen.findByText('10 minutes', {}, { timeout: WAIT })).toBeInTheDocument()
    expect(screen.getByText('Support phone')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Save settings' })).toBeNull()
    expect(screen.queryByText(/\[SUPPORT HOURS\]|\[SAFE LOAD\]|\[CODE TIME LIMIT\]/)).toBeNull()
    expect(screen.queryByLabelText(/Support hours/)).toBeNull()
    // Staff: role Admin and the last sign-in, not "last active".
    expect(screen.getByRole('columnheader', { name: 'Last sign-in' })).toBeInTheDocument()
    expect(screen.getAllByText('Sample Admin').length).toBeGreaterThan(0)
  }, SLOW)

  it('says "Never signed in" for a staff member with no sign-in', async () => {
    serve({ '/admin/settings': { ...settingsSample, staff: [{ ...settingsSample.staff[0], last_sign_in_at: null }] } })
    renderAt('/admin/settings')
    expect((await screen.findAllByText('Never signed in', {}, { timeout: WAIT })).length).toBeGreaterThan(0)
  }, SLOW)

  it('draws a delivery with no delivery type, plate or zone without failing, and shows the driver by name', async () => {
    const sparse = {
      ...liveMapSample,
      deliveries: [{ ...liveMapSample.deliveries[0], delivery_type: null, driver: { ...liveMapSample.deliveries[0].driver, plate: null }, source: null, zone: null }],
    }
    serve({ '/admin/live-map': sparse })
    renderAt('/admin')
    // No code: the label falls back to the driver's name, and the marker has neither K nor T.
    expect((await screen.findAllByText('Sample Driver One', {}, { timeout: WAIT })).length).toBeGreaterThan(0)
    expect(screen.queryByText('K')).toBeNull()
    expect(screen.queryByText('T')).toBeNull()
  }, SLOW)

  it('shows Reports from the backend: no Earned column, the zone rows, loads by source, and the SAMPLE tag only for simulated numbers', async () => {
    renderAt('/admin/reports')
    expect((await screen.findAllByText('Area not listed', {}, { timeout: WAIT })).length).toBeGreaterThan(0)
    expect(screen.getAllByText('Sample Zone Independence Layout').length).toBeGreaterThan(0)
    expect(screen.getAllByText('Sample Borehole A').length).toBeGreaterThan(0)
    expect(screen.getAllByText('Sample Driver One · ENU-123-KK').length).toBeGreaterThan(0)
    expect(screen.queryByRole('columnheader', { name: 'Earned' })).toBeNull()
    expect(screen.getByText('SAMPLE DATA')).toBeInTheDocument()
  }, SLOW)

  it('shows no SAMPLE tag on Reports when the numbers are real orders (is_simulated false)', async () => {
    serve({ '/admin/reports': { ...reportSample, is_simulated: false } })
    renderAt('/admin/reports')
    expect((await screen.findAllByText('Area not listed', {}, { timeout: WAIT })).length).toBeGreaterThan(0)
    expect(screen.queryByText(/SAMPLE/)).toBeNull()
    expect(screen.getAllByText('Cash collected').length).toBeGreaterThan(0)
  }, SLOW)
})

describe('Reports: chosen dates, cancelled orders, vehicle table (#333)', () => {
  const reportUrls = () => fetchStub.mock.calls.map(([input]) => new URL(String(input), 'http://localhost')).filter((url) => url.pathname.endsWith('/admin/reports'))
  const daysAgo = (days: number) => {
    const [y, m, d] = lagosToday().split('-').map(Number)
    return new Date(Date.UTC(y, m - 1, d - days)).toISOString().slice(0, 10)
  }

  it('shows Orders by area and Orders by vehicle, with the number beside each bar and Not recorded only when above 0', async () => {
    renderAt('/admin/reports')
    const vehicle = await screen.findByRole('table', { name: 'Orders by vehicle' }, { timeout: WAIT })
    expect(within(vehicle).getByText('Keke')).toBeInTheDocument()
    expect(within(vehicle).getByText('40')).toBeInTheDocument()
    expect(within(vehicle).getByText('Tanker')).toBeInTheDocument()
    expect(within(vehicle).getByText('Not recorded')).toBeInTheDocument()
    expect(within(screen.getByRole('table', { name: 'Orders by area' })).getByText('58')).toBeInTheDocument()
  }, SLOW)

  it('leaves out the Not recorded row when no order lacks a vehicle type', async () => {
    serve({ '/admin/reports': { ...reportSample, by_delivery_type: { keke: 40, tanker: 21, not_recorded: 0 } } })
    renderAt('/admin/reports')
    const vehicle = await screen.findByRole('table', { name: 'Orders by vehicle' }, { timeout: WAIT })
    expect(within(vehicle).queryByText('Not recorded')).toBeNull()
  }, SLOW)

  it('says how many cancelled orders are left out, and counts them when the box is ticked', async () => {
    const user = userEvent.setup()
    renderAt('/admin/reports')
    expect(await screen.findByText(/4 cancelled orders are not counted in the area and vehicle tables/, {}, { timeout: WAIT })).toBeInTheDocument()
    expect(reportUrls().every((url) => !url.searchParams.has('include_cancelled'))).toBe(true)

    fetchStub.mockClear()
    await user.click(screen.getByRole('checkbox', { name: 'Include cancelled orders' }))
    await waitFor(() => expect(reportUrls().some((url) => url.searchParams.get('include_cancelled') === 'true')).toBe(true))
    await waitFor(() => expect(screen.queryByText(/cancelled orders are not counted/)).toBeNull())
  }, SLOW)

  it('shows the empty state in both tables when the period has no orders', async () => {
    serve({
      '/admin/reports': { ...reportSample, orders: { total: 0, by_status: {} }, by_zone: [], by_delivery_type: { keke: 0, tanker: 0, not_recorded: 0 } },
    })
    renderAt('/admin/reports')
    const area = await screen.findByRole('table', { name: 'Orders by area' }, { timeout: WAIT })
    expect(within(area).getByText('No orders in this period.')).toBeInTheDocument()
    expect(within(screen.getByRole('table', { name: 'Orders by vehicle' })).getByText('No orders in this period.')).toBeInTheDocument()
  }, SLOW)

  it('sends the chosen dates and no range when Apply passes the date check', async () => {
    const user = userEvent.setup()
    renderAt('/admin/reports')
    await screen.findByRole('table', { name: 'Orders by area' }, { timeout: WAIT })
    await user.click(screen.getByRole('tab', { name: 'Custom' }))
    fireEvent.change(screen.getByLabelText('From'), { target: { value: daysAgo(10) } })
    fireEvent.change(screen.getByLabelText('To'), { target: { value: daysAgo(3) } })
    fetchStub.mockClear()
    await user.click(screen.getByRole('button', { name: 'Apply' }))
    await waitFor(() => expect(reportUrls().length).toBeGreaterThan(0))
    const params = reportUrls()[0].searchParams
    expect(params.get('from')).toBe(daysAgo(10))
    expect(params.get('to')).toBe(daysAgo(3))
    expect(params.has('range')).toBe(false)
    expect(screen.queryByRole('alert')).toBeNull()
  }, SLOW)

  it.each([
    ['a start after the end', () => daysAgo(2), () => daysAgo(5), 'From must be on or before To.'],
    ['an end in the future', () => daysAgo(2), () => '9999-01-01', 'The end date cannot be in the future.'],
    ['more than 90 days', () => daysAgo(95), () => daysAgo(1), 'Choose 90 days or fewer.'],
    ['a missing end date', () => daysAgo(2), () => '', 'Choose a start and an end date.'],
  ])('shows the message and sends nothing for %s', async (_name, from, to, message) => {
    const user = userEvent.setup()
    renderAt('/admin/reports')
    await screen.findByRole('table', { name: 'Orders by area' }, { timeout: WAIT })
    await user.click(screen.getByRole('tab', { name: 'Custom' }))
    fireEvent.change(screen.getByLabelText('From'), { target: { value: from() } })
    fireEvent.change(screen.getByLabelText('To'), { target: { value: to() } })
    fetchStub.mockClear()
    await user.click(screen.getByRole('button', { name: 'Apply' }))
    expect(await screen.findByRole('alert')).toHaveTextContent(message)
    expect(reportUrls()).toHaveLength(0)
    // The last valid report stays on screen.
    expect(screen.getByRole('table', { name: 'Orders by area' })).toBeInTheDocument()
  }, SLOW)

  it('shows the server error with a retry when the report fails', async () => {
    renderAt('/admin/reports')
    await screen.findByRole('table', { name: 'Orders by area' }, { timeout: WAIT })
    bodies = { ...bodies }
    delete bodies['/admin/reports']
    const user = userEvent.setup()
    await user.click(screen.getByRole('tab', { name: 'Last 30 days' }))
    expect(await screen.findByRole('button', { name: /try again|retry/i }, { timeout: WAIT })).toBeInTheDocument()
  }, SLOW)
})
