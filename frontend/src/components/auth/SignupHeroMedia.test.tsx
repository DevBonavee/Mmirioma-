// @vitest-environment jsdom
import { render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import SignupHeroMedia from './SignupHeroMedia'

afterEach(() => vi.unstubAllGlobals())

describe('SignupHeroMedia', () => {
  it('shows a muted, looping, inline video that starts by itself, with a poster', () => {
    const { container } = render(<SignupHeroMedia />)
    const video = container.querySelector('video')
    expect(video).not.toBeNull()
    expect(video?.muted).toBe(true)
    expect(video).toHaveAttribute('loop')
    expect(video).toHaveAttribute('playsinline')
    expect(video?.autoplay).toBe(true)
    expect(video?.getAttribute('poster')).toMatch(/^\/media\/.*-poster\.jpg$/)
    // The footage is decoration: hidden from assistive technology and out of the tab order.
    expect(video).toHaveAttribute('aria-hidden', 'true')
    expect(video).toHaveAttribute('tabindex', '-1')
  })

  it('offers webm and mp4 sources that exist in public/media', () => {
    const { container } = render(<SignupHeroMedia />)
    const types = Array.from(container.querySelectorAll('source')).map((s) => s.getAttribute('type'))
    expect(types).toEqual(['video/webm', 'video/mp4'])
  })

  it('reads its headline as one sentence, and lists the four stages with the first current', () => {
    render(<SignupHeroMedia />)
    expect(screen.getByRole('heading', { name: 'Water at your gate, without the stress.' })).toBeInTheDocument()
    const stages = screen.getAllByRole('listitem').map((li) => li.textContent)
    expect(stages).toEqual(['Collect', 'Clean', 'Store', 'Deliver'])
    expect(screen.getByRole('listitem', { current: 'step' })).toHaveTextContent('Collect')
  })

  it('takes its copy and its height from the page', () => {
    const { container } = render(
      <SignupHeroMedia className="h-[42vh]" eyebrow="Hello" headline={['One', 'two']} accentWord="two" subline="Sub" />,
    )
    expect(container.firstElementChild).toHaveClass('h-[42vh]')
    expect(screen.getByText('Hello')).toBeInTheDocument()
    expect(screen.getByText('Sub')).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'One two' })).toBeInTheDocument()
  })

  it('holds still with every stage done when the person prefers reduced motion', () => {
    vi.stubGlobal('matchMedia', (query: string) => ({
      matches: query.includes('prefers-reduced-motion'),
      addEventListener: () => undefined,
      removeEventListener: () => undefined,
    }))
    const { container } = render(<SignupHeroMedia />)
    expect(container.querySelector('video')?.autoplay).toBe(false)
    expect(screen.getByRole('listitem', { current: 'step' })).toHaveTextContent('Deliver')
  })
})
