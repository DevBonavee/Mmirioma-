// @vitest-environment jsdom
import { act, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { PANEL_BESIDE_MIN_PX, SplitLayout } from './AdminParts'
import { revealDetail } from './adminFormat'

/**
 * jsdom lays nothing out, so a test sets the width SplitLayout measures by
 * stubbing `getBoundingClientRect` for the page's content box.
 */
function pageWidth(px: number) {
  vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockReturnValue({ width: px } as DOMRect)
}

function Page() {
  return (
    <SplitLayout
      main={
        <button type="button" onClick={() => revealDetail()}>
          Open order
        </button>
      }
      side={<p>Order details</p>}
    />
  )
}

afterEach(() => vi.restoreAllMocks())

describe('SplitLayout (#343, docs/design/responsive.md)', () => {
  it('puts the panel beside the table when the content area is at least 1400 px wide (1352 px inside its padding)', () => {
    pageWidth(PANEL_BESIDE_MIN_PX)
    render(<Page />)
    expect(screen.getByText('Order details')).toBeInTheDocument()
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('shows the panel beside the table while the width is unknown, as before the sheet existed', () => {
    render(<Page />)
    expect(screen.getByText('Order details')).toBeInTheDocument()
  })

  it('keeps the panel closed under that width until an item is picked, then opens it as a dialog', async () => {
    pageWidth(PANEL_BESIDE_MIN_PX - 1)
    render(<Page />)
    expect(screen.queryByText('Order details')).not.toBeInTheDocument()

    await userEvent.click(screen.getByRole('button', { name: 'Open order' }))

    const sheet = screen.getByRole('dialog', { name: 'Details' })
    expect(sheet).toHaveAttribute('aria-modal', 'true')
    expect(sheet).toHaveTextContent('Order details')
    expect(sheet).toHaveFocus()
  })

  it.each([
    ['its Close button', async () => userEvent.click(screen.getByRole('button', { name: 'Close details' }))],
    ['Escape', async () => userEvent.keyboard('{Escape}')],
  ])('closes the sheet with %s and gives focus back to the item that opened it', async (_how, close) => {
    pageWidth(800)
    render(<Page />)
    const opener = screen.getByRole('button', { name: 'Open order' })
    await userEvent.click(opener)
    expect(screen.getByRole('dialog')).toBeInTheDocument()

    await close()

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(opener).toHaveFocus()
  })

  it('closes the sheet when the dimmed page behind it is clicked', async () => {
    pageWidth(800)
    render(<Page />)
    await userEvent.click(screen.getByRole('button', { name: 'Open order' }))

    // The dimmed page behind the sheet is hidden from assistive technology; the sheet has its own Close button.
    await userEvent.click(document.querySelector('[data-sheet-backdrop]')!)

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('is a full-width sheet on a phone and 420 px from tablet width up', async () => {
    pageWidth(300)
    render(<Page />)
    await userEvent.click(screen.getByRole('button', { name: 'Open order' }))
    expect(screen.getByRole('dialog')).toHaveClass('w-full', 'md:w-[420px]')
  })

  it('moves to the sheet when the page narrows, and back beside the table when it widens', () => {
    let notify: () => void = () => undefined
    vi.stubGlobal(
      'ResizeObserver',
      class {
        constructor(callback: () => void) {
          notify = callback
        }
        observe() {}
        disconnect() {}
      },
    )
    const measured = vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect')
    measured.mockReturnValue({ width: 1600 } as DOMRect)
    render(<Page />)
    expect(screen.getByText('Order details')).toBeInTheDocument()

    measured.mockReturnValue({ width: 1000 } as DOMRect)
    act(() => notify())
    expect(screen.queryByText('Order details')).not.toBeInTheDocument()

    measured.mockReturnValue({ width: 1600 } as DOMRect)
    act(() => notify())
    expect(screen.getByText('Order details')).toBeInTheDocument()
    vi.unstubAllGlobals()
  })
})
