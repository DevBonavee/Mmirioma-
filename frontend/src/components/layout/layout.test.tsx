// @vitest-environment jsdom
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it } from 'vitest'
import { AdminShell } from './AdminShell'
import { MONEY_TABS } from '../../features/admin/adminFormat'
import { PARTNER_PAY_ENABLED, POINTS_ENABLED } from '../../lib/features'
import { ADMIN_NAV, currentNavPath } from './adminNav'

describe('currentNavPath', () => {
  it('matches the dashboard only exactly and other sections by prefix', () => {
    expect(currentNavPath('/admin')).toBe('/admin')
    expect(currentNavPath('/admin/orders')).toBe('/admin/orders')
    expect(currentNavPath('/admin/orders/new')).toBe('/admin/orders')
    expect(currentNavPath('/admin/unknown')).toBeUndefined()
  })
})

function renderShell(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <AdminShell searchPlaceholder="Search orders" user={{ name: 'Chidimma M.', role: 'Super admin' }} counts={{ orders: 12, support: 3 }}>
        <p>Page content</p>
      </AdminShell>
    </MemoryRouter>,
  )
}

describe('AdminShell', () => {
  it('shows every admin section with the current page marked', () => {
    renderShell('/admin/orders')
    const nav = screen.getAllByRole('navigation', { name: 'Admin' })[0]
    const links = within(nav).getAllByRole('link')
    expect(links.map((l) => l.textContent?.replace(/\d+$/, ''))).toEqual(ADMIN_NAV.map((n) => n.label))
    expect(within(nav).getByRole('link', { name: /Orders/ })).toHaveAttribute('aria-current', 'page')
    expect(within(nav).getByRole('link', { name: /Orders/ })).toHaveTextContent('12')
  })

  // Out of the MVP, hidden rather than deleted (#156); flipping the switches in lib/features.ts brings them back.
  it('does not offer Loyalty points or Rider earnings while they are out of the MVP', () => {
    expect(POINTS_ENABLED).toBe(false)
    expect(PARTNER_PAY_ENABLED).toBe(false)
    renderShell('/admin')
    const nav = screen.getAllByRole('navigation', { name: 'Admin' })[0]
    expect(within(nav).queryByRole('link', { name: /Loyalty points/ })).not.toBeInTheDocument()
    expect(within(nav).queryByRole('link', { name: /Rider earnings/ })).not.toBeInTheDocument()
    expect(MONEY_TABS.map((t) => t.label)).not.toContain('Loyalty points')
  })

  // docs/design/responsive.md (#343): the sidebar is a desktop (1280 px, Tailwind xl) layout; below that it is a drawer.
  it('shows the sidebar from 1280 px, not 1024 px, and caps the page content at 1440 px', () => {
    renderShell('/admin')
    const sidebar = screen.getAllByRole('navigation', { name: 'Admin' })[0].parentElement
    expect(sidebar).toHaveClass('hidden', 'xl:flex')
    expect(screen.getByRole('button', { name: 'Open menu' })).toHaveClass('xl:hidden')
    const content = screen.getByText('Page content').closest('main')
    expect(content).toHaveClass('mx-auto', 'max-w-admin-content')
  })

  it('opens the menu drawer on small screens and closes it with Escape', async () => {
    const user = userEvent.setup()
    renderShell('/admin')
    expect(screen.queryByRole('dialog', { name: 'Admin menu' })).not.toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Open menu' }))
    expect(screen.getByRole('dialog', { name: 'Admin menu' })).toBeInTheDocument()
    await user.keyboard('{Escape}')
    expect(screen.queryByRole('dialog', { name: 'Admin menu' })).not.toBeInTheDocument()
  })
})
