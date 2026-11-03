// @vitest-environment jsdom
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it } from 'vitest'
import { currentCustomerTab } from '../../features/customer/customerNav'
import { Footer, MobileShell, ScrollArea, TopBar } from './MobileShell'
import { Pane, ShellScope } from './ShellScope'

/** The frame element `MobileShell` draws (the one with the height and width classes). */
function frame(container: HTMLElement): HTMLElement {
  const el = container.querySelector<HTMLElement>('.h-dvh')
  if (!el) throw new Error('no shell frame')
  return el
}

function screenContents() {
  return (
    <MobileShell>
      <TopBar />
      <ScrollArea>Body</ScrollArea>
      <Footer>Footer</Footer>
    </MobileShell>
  )
}

describe('MobileShell width', () => {
  it('is the 430 px phone column without a scope (the rider and driver app)', () => {
    const { container } = render(<MemoryRouter>{screenContents()}</MemoryRouter>)
    const cls = frame(container).className
    expect(cls).toContain('max-w-phone')
    expect(cls).not.toContain('md:max-w-customer')
    expect(cls).not.toContain('xl:max-w-customer-wide')
  })

  it('widens to 720 px, then 1120 px, for the customer, and stays full width on a phone', () => {
    const { container } = render(<MemoryRouter><ShellScope width="customer">{screenContents()}</ShellScope></MemoryRouter>)
    const cls = frame(container).className.split(' ')
    // `max-w-phone` is the phone rule; the others apply from 768 and 1280 px.
    expect(cls).toEqual(expect.arrayContaining(['max-w-phone', 'md:max-w-customer', 'xl:max-w-customer-wide']))
  })

  it('is a 480 px card for the signed-out customer screens', () => {
    const { container } = render(<MemoryRouter><ShellScope width="card">{screenContents()}</ShellScope></MemoryRouter>)
    expect(frame(container).className.split(' ')).toEqual(expect.arrayContaining(['max-w-phone', 'md:max-w-card']))
  })

  it('centres the scroll area and footer in a 720 px column on the customer desktop only', () => {
    const column = 'xl:px-[max(18px,calc((100%_-_720px)/2))]'
    const { rerender } = render(<MemoryRouter><ShellScope width="customer">{screenContents()}</ShellScope></MemoryRouter>)
    expect(screen.getByRole('main')).toHaveClass(column)
    expect(screen.getByText('Footer')).toHaveClass(column)
    rerender(<MemoryRouter>{screenContents()}</MemoryRouter>)
    expect(screen.getByRole('main')).not.toHaveClass(column)
    expect(screen.getByText('Footer')).not.toHaveClass(column)
  })

  it('lets a wide screen (the home screen) use the whole customer area', () => {
    render(
      <MemoryRouter>
        <ShellScope width="customer">
          <MobileShell>
            <ScrollArea wide>Body</ScrollArea>
          </MobileShell>
        </ShellScope>
      </MemoryRouter>,
    )
    expect(screen.getByRole('main').className).not.toContain('xl:px-[max(')
  })
})

describe('header navigation', () => {
  const nav = <nav aria-label="Main">links</nav>

  it('is shown (from 1280 px) only where a scope supplies it', () => {
    const { rerender } = render(<MemoryRouter><ShellScope width="customer" nav={nav}>{screenContents()}</ShellScope></MemoryRouter>)
    const wrapper = screen.getByRole('navigation', { name: 'Main', hidden: true }).parentElement
    expect(wrapper).toHaveClass('hidden', 'xl:block')
    rerender(<MemoryRouter>{screenContents()}</MemoryRouter>)
    expect(screen.queryByRole('navigation', { name: 'Main', hidden: true })).toBeNull()
  })
})

describe('MobileShell in a pane', () => {
  it('fills the pane instead of drawing the page frame', () => {
    const { container } = render(
      <MemoryRouter>
        <ShellScope width="customer">
          <Pane kind="detail">{screenContents()}</Pane>
        </ShellScope>
      </MemoryRouter>,
    )
    expect(container.querySelector('.h-dvh')).toBeNull()
    expect(container.querySelector('.min-h-dvh')).toBeNull()
    expect(screen.getByRole('main')).not.toHaveClass('xl:px-[max(18px,calc((100%_-_720px)/2))]')
  })

  it('draws no top bar in the list pane, and the detail pane keeps its own without the header links', () => {
    const nav = <nav aria-label="Main">links</nav>
    const { container, rerender } = render(
      <MemoryRouter>
        <ShellScope width="customer" nav={nav}>
          <Pane kind="list">{screenContents()}</Pane>
        </ShellScope>
      </MemoryRouter>,
    )
    expect(container.querySelector('header')).toBeNull()
    rerender(
      <MemoryRouter>
        <ShellScope width="customer" nav={nav}>
          <Pane kind="detail">{screenContents()}</Pane>
        </ShellScope>
      </MemoryRouter>,
    )
    expect(container.querySelector('header')).not.toBeNull()
    expect(screen.queryByRole('navigation', { name: 'Main', hidden: true })).toBeNull()
  })
})

describe('currentCustomerTab', () => {
  it('maps every customer path to one of the four header links, or none', () => {
    expect(currentCustomerTab('/home')).toBe('/home')
    expect(currentCustomerTab('/order/review')).toBe('/order')
    expect(currentCustomerTab('/orders')).toBe('/orders')
    expect(currentCustomerTab('/orders/MO-1/track')).toBe('/orders')
    expect(currentCustomerTab('/addresses/new')).toBe('/profile')
    expect(currentCustomerTab('/settings')).toBe('/profile')
    expect(currentCustomerTab('/notifications')).toBeUndefined()
  })
})
