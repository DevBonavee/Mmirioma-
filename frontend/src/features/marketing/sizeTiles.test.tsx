// @vitest-environment jsdom
import { fireEvent, render, screen, within } from '@testing-library/react'
import { RouterProvider, createMemoryRouter } from 'react-router-dom'
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest'
import { AppProviders } from '../../app/providers'
import { routes } from '../../app/router'
import { resetMockDb } from '../../mocks/db'
import { tileFill } from './content'

// The size tiles that fill with water (#330, "Pick the size that fits").
// The stylesheets are read as text, since jsdom applies no layout and Vitest empties a CSS `?raw` import. The
// frontend has no Node type package, so the file system is loaded by name and typed here, and the tests run from
// `frontend/` (npm test).
async function readSource(path: string): Promise<string> {
  const fsModule = 'node:fs/promises'
  const { readFile } = (await import(/* @vite-ignore */ fsModule)) as { readFile: (file: string, encoding: string) => Promise<string> }
  const { cwd } = (globalThis as unknown as { process: { cwd: () => string } }).process
  // A Windows checkout has CRLF line endings; the rules below are matched with LF.
  return (await readFile(`${cwd()}/${path}`, 'utf-8')).replaceAll(String.fromCharCode(13, 10), String.fromCharCode(10))
}
const marketingCss = await readSource('src/features/marketing/marketing.css')
const themeCss = await readSource('src/styles/theme.css')

beforeAll(() => {
  window.scrollTo = vi.fn() as unknown as typeof window.scrollTo
  Element.prototype.scrollIntoView = vi.fn()
})

afterEach(() => vi.useRealTimers())

const KEKE = ['12', '24', '30', '60']
const TANKER = ['500', '750', '1,000', 'Custom']

describe('tileFill: how high the water rises, by size within the group', () => {
  it('makes 12 the lowest and 60 the highest of the Keke sizes', () => {
    expect(KEKE.map((n) => tileFill(n, KEKE))).toEqual([0.2, 0.4, 0.5, 1])
  })

  it('reads the thousands comma, and fills Custom completely', () => {
    expect(TANKER.map((n) => tileFill(n, TANKER))).toEqual([0.5, 0.75, 1, 1])
  })

  it('does not depend on the order of the group', () => {
    expect(tileFill('24', ['60', '12', '30', '24'])).toBe(0.4)
  })

  it('never goes above full or to nothing', () => {
    expect(tileFill('90', ['30'])).toBe(1)
    expect(tileFill('0', KEKE)).toBe(1)
    expect(tileFill('Custom', ['Custom'])).toBe(1)
  })
})

async function renderLanding() {
  resetMockDb()
  render(
    <AppProviders>
      <RouterProvider router={createMemoryRouter(routes, { initialEntries: ['/'] })} />
    </AppProviders>,
  )
  return screen.findByRole('group', { name: '12 Gallons' }, { timeout: 10_000 })
}

describe('the size tiles on the landing page', () => {
  it('gives each tile an accessible name and a fill in proportion to its size', async () => {
    await renderLanding()
    const fills: Record<string, string> = {
      '12 Gallons': '0.2',
      '24 Gallons': '0.4',
      '30 Gallons': '0.5',
      '60 Gallons': '1',
      '500 Gallons': '0.5',
      '750 Gallons': '0.75',
      '1,000 Gallons': '1',
      'Custom Size': '1',
    }
    for (const [name, fill] of Object.entries(fills)) {
      const tile = screen.getByRole('group', { name })
      expect(tile.style.getPropertyValue('--mk-fill')).toBe(fill)
      expect(tile).toHaveAttribute('tabindex', '0')
    }
  }, 20_000)

  it('still shows the size and the unit as text, with no price or claim added', async () => {
    const tile = await renderLanding()
    expect(within(tile).getByText('12')).toBeInTheDocument()
    expect(within(tile).getByText('Gallons')).toBeInTheDocument()
    const section = tile.closest('section')!
    expect(section.textContent).not.toMatch(/₦|price|cheap|free/i)
  }, 20_000)

  it('fills on a tap and empties on a second tap or when focus leaves, with no timers', async () => {
    const tile = await renderLanding()
    vi.useFakeTimers()
    expect(tile).not.toHaveAttribute('data-filled')
    fireEvent.pointerUp(tile, { pointerType: 'touch' })
    expect(tile).toHaveAttribute('data-filled', 'true')
    fireEvent.pointerUp(tile, { pointerType: 'touch' })
    expect(tile).not.toHaveAttribute('data-filled')
    fireEvent.pointerUp(tile, { pointerType: 'pen' })
    expect(tile).toHaveAttribute('data-filled', 'true')
    fireEvent.blur(tile)
    expect(tile).not.toHaveAttribute('data-filled')
    expect(vi.getTimerCount()).toBe(0)
  }, 20_000)

  it('leaves a mouse click to hover: it does not set the tap state', async () => {
    const tile = await renderLanding()
    fireEvent.pointerUp(tile, { pointerType: 'mouse' })
    expect(tile).not.toHaveAttribute('data-filled')
  }, 20_000)

  it('keeps one tile’s fill to that tile', async () => {
    const first = await renderLanding()
    const other = screen.getByRole('group', { name: '24 Gallons' })
    fireEvent.pointerUp(first, { pointerType: 'touch' })
    expect(first).toHaveAttribute('data-filled', 'true')
    expect(other).not.toHaveAttribute('data-filled')
  }, 20_000)
})

describe('the tile styles (marketing.css)', () => {
  const rule = (selector: string) => {
    const start = marketingCss.indexOf(selector)
    expect(start, `${selector} is in marketing.css`).toBeGreaterThanOrEqual(0)
    return marketingCss.slice(start, marketingCss.indexOf('}', start) + 1)
  }

  it('rises with transform only, from the bottom, and never animates height', () => {
    const water = rule('.mk-tile-water {')
    expect(water).toContain('transform: scaleY(0)')
    expect(water).toContain('transform-origin: bottom')
    expect(water).toMatch(/transition: transform /)
    expect(water).not.toMatch(/transition:[^;]*height/)
    expect(water).not.toMatch(/animation:/)
  })

  it('clips the water in its own wrapper and never clips the tile, so a wide label is not cut off', () => {
    expect(rule('.mk-tile {')).not.toMatch(/overflow:\s*hidden/)
    expect(rule('.mk-tile-clip {')).toMatch(/overflow:\s*hidden/)
    expect(rule('.mk-tile-clip {')).toContain('border-radius: inherit')
  })

  it('fills on hover (only where a device has it), keyboard focus and the tap attribute', () => {
    expect(marketingCss).toMatch(/\.mk-tile:focus-visible \.mk-tile-water,\s*\.mk-tile\[data-filled\] \.mk-tile-water \{\s*transform: scaleY\(var\(--mk-fill\)\)/)
    expect(marketingCss).toMatch(/@media \(hover: hover\) \{\s*\.mk-tile:hover \.mk-tile-water \{\s*transform: scaleY\(var\(--mk-fill\)\)/)
  })

  it('plays no transition under reduced motion, so the water appears at once', () => {
    const start = marketingCss.indexOf('@media (prefers-reduced-motion: reduce) {\n    .mk-tile-water')
    expect(start).toBeGreaterThanOrEqual(0)
    expect(marketingCss.slice(start, start + 200)).toMatch(/transition: none/)
  })
})

/** WCAG relative luminance and contrast ratio of two #rrggbb colours. */
function contrast(a: string, b: string): number {
  const luminance = (hex: string) => {
    const [r, g, bl] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255).map((v) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4))
    return 0.2126 * r + 0.7152 * g + 0.0722 * bl
  }
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x)
  return (hi + 0.05) / (lo + 0.05)
}

describe('text over the water stays readable', () => {
  const token = (name: string) => new RegExp(`--color-${name}:\\s*(#[0-9a-fA-F]{6})`).exec(themeCss)![1]
  const water = /--mk-water:\s*(#[0-9a-fA-F]{6})/.exec(marketingCss)![1]

  it('keeps the size, in ink, at 4.5:1 or better over the water', () => {
    expect(contrast(token('ink'), water)).toBeGreaterThanOrEqual(4.5)
  })

  it('sets the unit text colour in the stylesheet, so a utility class cannot keep it grey over the water', () => {
    expect(marketingCss).toMatch(/\.mk-tile-unit \{\s*color: var\(--color-mute\)/)
  })

  it('turns the muted unit text to ink once the water is up, since the grey alone is under 4.5:1 on it', () => {
    expect(contrast(token('mute'), water)).toBeLessThan(4.5)
    expect(marketingCss).toMatch(/\.mk-tile\[data-filled\] \.mk-tile-unit \{\s*color: var\(--color-ink\)/)
    expect(marketingCss).toMatch(/\.mk-tile:hover \.mk-tile-unit \{\s*color: var\(--color-ink\)/)
  })
})
