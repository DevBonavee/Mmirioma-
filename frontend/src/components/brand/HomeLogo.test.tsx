// @vitest-environment jsdom
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it } from 'vitest'
import { HomeLogo } from './HomeLogo'
import { HOME_LOGO_NAME, homeFor } from './logoTarget'

describe('homeFor', () => {
  it('always returns the public homepage', () => {
    expect(homeFor()).toBe('/')
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

  it('goes to the public homepage from inside the partner app', () => {
    expect(renderAt('/partner/login')).toHaveAttribute('href', '/')
  })

  it.each(['/home', '/order/review', '/admin', '/signin', '/partner', '/partner/rider', '/partner/driver'])('returns to the public homepage from %s', (path) => {
    expect(renderAt(path)).toHaveAttribute('href', '/')
  })

  it('is big enough to tap', () => {
    expect(renderAt('/home').className).toContain('min-h-11')
  })
})
