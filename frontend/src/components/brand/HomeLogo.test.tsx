// @vitest-environment jsdom
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it } from 'vitest'
import { HomeLogo } from './HomeLogo'
import { HOME_LOGO_NAME, homeFor } from './logoTarget'

describe('homeFor: where a logo goes (docs/design/landing-v1.md, "Logo links")', () => {
  it.each([
    ['/', '/'],
    ['/home', '/'],
    ['/order/review', '/'],
    ['/admin', '/'],
    ['/admin/login', '/'],
    ['/signin', '/'],
    ['/partner', '/partner/'],
    ['/partner/', '/partner/'],
    ['/partner/login', '/partner/'],
    ['/partner/rider/orders', '/partner/'],
  ])('sends %s to %s', (pathname, target) => {
    expect(homeFor(pathname)).toBe(target)
  })

  it('does not treat a path that only starts with the same letters as the partner app', () => {
    expect(homeFor('/partnership')).toBe('/')
    expect(homeFor('/partners-wanted')).toBe('/')
  })
})

describe('HomeLogo', () => {
  function renderAt(path: string) {
    render(
      <MemoryRouter initialEntries={[path]}>
        <HomeLogo>
          <img src="/brand/logo-horizontal@2x.png" alt="" />
        </HomeLogo>
      </MemoryRouter>,
    )
    return screen.getByRole('link', { name: HOME_LOGO_NAME })
  }

  it('is a link named "MmiriOma, home"', () => {
    expect(HOME_LOGO_NAME).toBe('MmiriOma, home')
    expect(renderAt('/home')).toHaveAttribute('href', '/')
  })

  it('goes to the partner home from inside the partner app, which keeps the installed app in its scope', () => {
    expect(renderAt('/partner/login')).toHaveAttribute('href', '/partner/')
  })

  it('is big enough to tap', () => {
    expect(renderAt('/home').className).toContain('min-h-11')
  })
})
