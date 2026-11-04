// @vitest-environment jsdom
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import type { User } from '../../lib/api/auth'
import { AutomaticTour, TourDialog, TourReplay } from './WelcomeTour'
import { saveTourStatus, tourStatus } from './tourStorage'

const session = vi.hoisted(() => ({ user: undefined as User | undefined }))
vi.mock('../auth/useSession', () => ({ useSession: () => ({ data: session.user ? { user: session.user } : null }) }))

beforeAll(() => {
  // jsdom has no native top layer. Keyboard trapping/inertness are checked in Chrome.
  HTMLDialogElement.prototype.showModal = function () { this.setAttribute('open', '') }
  HTMLDialogElement.prototype.close = function () { this.removeAttribute('open') }
})

let number = 0
beforeEach(() => {
  vi.restoreAllMocks()
  localStorage.clear()
  session.user = { id: `tour-test-${++number}`, role: 'customer', name: 'Sample Customer', phone: '+2348000000900', phone_verified: false }
})

describe('first-time tour', () => {
  it('does not infer a new registration from an existing login or signed-out state', () => {
    const { rerender } = render(<AutomaticTour audience="customer" />)
    expect(screen.queryByRole('dialog')).toBeNull()
    session.user = undefined
    rerender(<AutomaticTour audience="customer" />)
    expect(screen.queryByRole('dialog')).toBeNull()
  })

  it('walks a new customer forward and back, then remembers completion', async () => {
    saveTourStatus(session.user!, 'pending')
    const user = userEvent.setup()
    const { unmount } = render(<AutomaticTour audience="customer" />)
    expect(screen.getByRole('heading', { name: 'A quick look around' })).toHaveFocus()
    await user.click(screen.getByRole('button', { name: 'Show me around' }))
    expect(screen.getByRole('heading', { name: 'Start with your address' })).toHaveFocus()
    expect(screen.getByText('Step 1 of 4')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Next' }))
    expect(screen.getByRole('heading', { name: 'Choose your delivery' })).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Back' }))
    expect(screen.getByRole('heading', { name: 'Start with your address' })).toBeInTheDocument()
    for (let i = 0; i < 3; i++) await user.click(screen.getByRole('button', { name: 'Next' }))
    expect(screen.getByText(/only after unloading is complete/)).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Finish tour' }))
    expect(screen.queryByRole('dialog')).toBeNull()
    expect(tourStatus(session.user)).toBe('completed')
    unmount()
    render(<AutomaticTour audience="customer" />)
    expect(screen.queryByRole('dialog')).toBeNull()
  })

  it.each(['Maybe later', 'Skip tour'])('remembers %s without changing the page', async (label) => {
    saveTourStatus(session.user!, 'pending')
    render(<AutomaticTour audience="customer" />)
    await userEvent.click(screen.getByRole('button', { name: label }))
    expect(tourStatus(session.user)).toBe('dismissed')
    expect(screen.queryByRole('dialog')).toBeNull()
  })

  it('lets Escape dismiss and restores the previous scroll setting', async () => {
    saveTourStatus(session.user!, 'pending')
    document.body.style.overflow = 'auto'
    render(<AutomaticTour audience="customer" />)
    expect(document.body.style.overflow).toBe('hidden')
    fireEvent(screen.getByRole('dialog'), new Event('cancel', { bubbles: false, cancelable: true }))
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())
    expect(document.body.style.overflow).toBe('auto')
    expect(tourStatus(session.user)).toBe('dismissed')
  })

  it('defers for active work/loading and closes if a priority job arrives', () => {
    saveTourStatus(session.user!, 'pending')
    const { rerender } = render(<AutomaticTour audience="customer" blocked />)
    expect(screen.queryByRole('dialog')).toBeNull()
    rerender(<AutomaticTour audience="customer" blocked={false} />)
    expect(screen.getByRole('dialog')).toBeInTheDocument()
    rerender(<AutomaticTour audience="customer" blocked />)
    expect(screen.queryByRole('dialog')).toBeNull()
    expect(tourStatus(session.user)).toBe('pending')
  })

  it('waits for an existing modal to close before opening the welcome', async () => {
    saveTourStatus(session.user!, 'pending')
    const { rerender } = render(<><div role="dialog" aria-modal="true" aria-label="Install the app" /><AutomaticTour audience="customer" /></>)
    expect(screen.queryByRole('heading', { name: 'A quick look around' })).toBeNull()
    rerender(<AutomaticTour audience="customer" />)
    expect(await screen.findByRole('heading', { name: 'A quick look around' })).toBeInTheDocument()
  })

  it('does not carry pending guidance into another account or an admin session', () => {
    saveTourStatus(session.user!, 'pending')
    const { rerender } = render(<AutomaticTour audience="customer" />)
    session.user = { ...session.user!, id: 'another-customer' }
    rerender(<AutomaticTour audience="customer" />)
    expect(screen.queryByRole('dialog')).toBeNull()
    session.user = { ...session.user, role: 'admin' }
    saveTourStatus(session.user, 'pending')
    expect(tourStatus(session.user)).toBeNull()
  })

  it.each(['keke', 'tanker'] as const)('explains the %s workflow and hides unavailable earnings features', async (audience) => {
    render(<TourDialog audience={audience} onDismiss={vi.fn()} />)
    await userEvent.click(screen.getByRole('button', { name: 'Show me around' }))
    expect(screen.getByText(new RegExp(`provide your ${audience} details`))).toBeInTheDocument()
    for (let i = 0; i < 4; i++) await userEvent.click(screen.getByRole('button', { name: 'Next' }))
    expect(screen.getByText(/history and My cash/)).toBeInTheDocument()
    expect(screen.queryByText(/earnings/i)).toBeNull()
  })

  it('replays on demand without altering a completed marker', async () => {
    saveTourStatus(session.user!, 'completed')
    render(<TourReplay audience="customer" placement="card" />)
    const opener = screen.getByRole('button', { name: 'Take a quick tour' })
    await userEvent.click(opener)
    await userEvent.click(screen.getByRole('button', { name: 'Skip tour' }))
    expect(opener).toHaveFocus()
    expect(tourStatus(session.user)).toBe('completed')
  })

  it('works when browser storage is blocked and saves no personal details', async () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => { throw new DOMException('Storage disabled', 'SecurityError') })
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new DOMException('Storage disabled', 'SecurityError') })
    saveTourStatus(session.user!, 'pending')
    render(<AutomaticTour audience="customer" />)
    await userEvent.click(screen.getByRole('button', { name: 'Skip tour' }))
    expect(tourStatus(session.user)).toBe('dismissed')
  })

  it('ignores malformed storage rather than opening a tour on login', () => {
    localStorage.setItem(`mmirioma:tour:v1:customer:${session.user!.id}`, 'not-a-status')
    expect(tourStatus(session.user)).toBeNull()
  })

  it('can dismiss a persisted welcome when storage becomes read-only', async () => {
    saveTourStatus(session.user!, 'pending')
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new DOMException('Storage quota exceeded', 'QuotaExceededError') })
    render(<AutomaticTour audience="customer" />)
    await userEvent.click(screen.getByRole('button', { name: 'Skip tour' }))
    expect(screen.queryByRole('dialog')).toBeNull()
    expect(tourStatus(session.user)).toBe('dismissed')
  })

  it('adopts a newer preference from another tab after a local write failure', () => {
    saveTourStatus(session.user!, 'pending')
    const write = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new DOMException('Storage full', 'QuotaExceededError') })
    saveTourStatus(session.user!, 'dismissed')
    expect(tourStatus(session.user)).toBe('dismissed')
    write.mockRestore()
    const key = `mmirioma:tour:v1:customer:${session.user!.id}`
    render(<AutomaticTour audience="customer" />)
    localStorage.setItem(key, 'completed')
    fireEvent(window, new StorageEvent('storage', { key, newValue: 'completed' }))
    expect(tourStatus(session.user)).toBe('completed')
  })

  it('consumes a pending welcome when it is replayed manually first', async () => {
    saveTourStatus(session.user!, 'pending')
    const { unmount } = render(<TourReplay audience="customer" placement="card" />)
    await userEvent.click(screen.getByRole('button', { name: 'Take a quick tour' }))
    await userEvent.click(screen.getByRole('button', { name: 'Skip tour' }))
    unmount()
    render(<AutomaticTour audience="customer" />)
    expect(screen.queryByRole('dialog')).toBeNull()
    expect(tourStatus(session.user)).toBe('dismissed')
  })

  it('includes the navigation destination in the accessible step description', async () => {
    render(<TourDialog audience="customer" onDismiss={vi.fn()} />)
    await userEvent.click(screen.getByRole('button', { name: 'Show me around' }))
    expect(screen.getByRole('dialog')).toHaveAccessibleDescription(/Saved addresses/)
  })
})
