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
  it('keeps the legacy preview column separate from application workspaces', () => {
    const { container } = render(<MemoryRouter>{screenContents()}</MemoryRouter>)
    const cls = frame(container).className
    expect(cls).toContain('max-w-phone')
    expect(cls).not.toContain('md:max-w-customer')
    expect(cls).not.toContain('xl:max-w-customer-wide')
  })

  it.each(['customer', 'partner', 'card'] as const)('uses the fluid %s workspace without the phone cap', (width) => {
    const { container } = render(<MemoryRouter><ShellScope width={width}>{screenContents()}</ShellScope></MemoryRouter>)
    expect(frame(container)).toHaveAttribute('data-shell', width)
    expect(frame(container)).toHaveClass('w-full', 'min-w-0')
    expect(frame(container).className).not.toContain('max-w-')
  })

  it('does not reintroduce the old customer column through main or footer padding', () => {
    const column = 'xl:px-[max(18px,calc((100%_-_720px)/2))]'
    const { rerender } = render(<MemoryRouter><ShellScope width="customer">{screenContents()}</ShellScope></MemoryRouter>)
    expect(screen.getByRole('main')).not.toHaveClass(column)
    expect(screen.getByText('Footer')).not.toHaveClass(column)
    rerender(<MemoryRouter>{screenContents()}</MemoryRouter>)
    expect(screen.getByRole('main')).not.toHaveClass(column)
    expect(screen.getByText('Footer')).not.toHaveClass(column)
  })

  it('continues to accept the overview content marker', () => {
    render(
      <MemoryRouter>
        <ShellScope width="customer">
          <MobileShell>
            <ScrollArea wide>Body</ScrollArea>
          </MobileShell>
        </ShellScope>
      </MemoryRouter>,
    )
    expect(screen.getByRole('main')).toHaveAttribute('data-content', 'wide')
  })
})

describe('MobileShell window scroll (#342, docs/design/responsive.md)', () => {
  function render_(width?: 'customer' | 'partner' | 'card', background?: 'ink') {
    const screen_ = (
      <MobileShell background={background}>
        <TopBar />
        <ScrollArea>Body</ScrollArea>
      </MobileShell>
    )
    return render(<MemoryRouter>{width ? <ShellScope width={width}>{screen_}</ShellScope> : screen_}</MemoryRouter>)
  }

  it.each([undefined, 'partner'] as const)('allows window scroll for the %s scope from 768 px', (width) => {
    const { container } = render_(width)
    expect(frame(container)).toHaveAttribute('data-scroll', 'window')
  })

  it('keeps the viewport-high frame and inner scroll classes, so a phone is as it was', () => {
    const { container } = render_()
    // Below 768 px the CSS for data-scroll="window" does not apply: these classes decide.
    expect(frame(container)).toHaveClass('h-dvh', 'overflow-hidden', 'max-w-phone')
  })

  it.each(['customer', 'card'] as const)('does not touch the %s width', (width) => {
    const { container } = render_(width)
    expect(frame(container)).not.toHaveAttribute('data-scroll')
  })

  it('keeps a drawer menu (ink background) in the viewport-high frame', () => {
    const { container } = render_(undefined, 'ink')
    expect(frame(container)).not.toHaveAttribute('data-scroll')
  })

  it('keeps an absolute map scene viewport-high even inside the fluid partner area', () => {
    const { container } = render(<MemoryRouter><ShellScope width="partner"><MobileShell viewport>Map</MobileShell></ShellScope></MemoryRouter>)
    expect(frame(container)).toHaveAttribute('data-shell', 'partner')
    expect(frame(container)).not.toHaveAttribute('data-scroll')
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
