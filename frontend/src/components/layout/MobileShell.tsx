import type { CSSProperties, ReactNode } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { cx } from '../../lib/cx'
import { Logo } from '../brand/Logo'
import { HomeLogo } from '../brand/HomeLogo'
import { BellIcon, ChevronLeftIcon, MenuIcon } from '../icons/icons'
import { Avatar } from '../ui/Avatar'
import { IconButton, IconLink } from '../ui/IconButton'
import { useShellScope, usePane, type ShellWidth } from './shellContext'

/**
 * Workspaces fill the viewport, including widths between phones and tablets.
 * Public account pages are fluid too; legacy phone previews stay independent.
 */
const FRAME: Record<ShellWidth, string> = {
  phone: 'max-w-phone',
  customer: 'w-full min-w-0',
  partner: 'w-full min-w-0',
  card: 'w-full min-w-0',
}

/**
 * Shared customer/partner page frame. Phones keep one internal scrolling
 * region and reachable actions. Partner pages use window scrolling from 768 px;
 * customer list/detail panes retain independent scroll regions. Map scenes can
 * request a viewport frame so absolute-positioned content has a stable height.
 * AuthLayout uses document scrolling at every size. Inside a Pane this fills
 * the pane rather than nesting another page frame.
 */
export function MobileShell({
  children,
  background = 'canvas',
  viewport = false,
  className,
}: {
  children: ReactNode
  /** Screen background: canvas (default), white (sign-in) or ink (drawer menus). */
  background?: 'canvas' | 'white' | 'ink'
  /** Keep viewport height for full-screen maps instead of partner window scrolling. */
  viewport?: boolean
  className?: string
}) {
  const { width } = useShellScope()
  const pane = usePane()
  const fill = background === 'white' ? 'bg-white' : background === 'ink' ? 'bg-ink' : 'bg-canvas'
  const windowScroll = (width === 'phone' || width === 'partner') && background !== 'ink' && !viewport
  if (pane) {
    return <div className={cx('relative flex min-h-0 flex-1 flex-col overflow-hidden text-body text-ink', fill, className)}>{children}</div>
  }
  return (
    <div className="min-h-dvh bg-canvas">
      <div
        data-scroll={windowScroll ? 'window' : undefined}
        data-shell={width}
        className={cx(
          'relative mx-auto flex h-dvh flex-col overflow-hidden text-body text-ink',
          FRAME[width],
          width === 'phone' && 'sm:border-x sm:border-line sm:shadow-card',
          fill,
          className,
        )}
      >
        {children}
      </div>
    </div>
  )
}

/** Top bar (`.top`): white, hairline bottom border, left / centre / right slots. */
export function TopBar({
  left,
  center,
  right,
  className,
}: {
  left?: ReactNode
  /** Defaults to the logo, which most screens show in the middle. */
  center?: ReactNode
  /** Defaults to a 44 px spacer so the centre stays centred. */
  right?: ReactNode
  className?: string
}) {
  const { nav } = useShellScope()
  const pane = usePane()
  // The list pane of a two-pane layout has no bar of its own: the page header above both panes serves it.
  if (pane === 'list') return null
  return (
    <div className="mo-header shrink-0">
      <header
        className={cx(
          'mo-top',
          className,
        )}
      >
        {left ?? <TopBarSpacer />}
        {center ?? (
          <HomeLogo>
            <Logo height={30} alt="" />
          </HomeLogo>
        )}
        {right ?? <TopBarSpacer />}
      </header>
      {/* Desktop: the same destinations carried by the mobile tab bar. */}
      {nav && pane === null && <div className="hidden shrink-0 xl:block">{nav}</div>}
    </div>
  )
}

/** Empty 44 px slot that balances the top bar. */
export function TopBarSpacer() {
  return <span aria-hidden="true" className="w-11 shrink-0" />
}

/** Bold 17 px page title used in the top bar of list screens ("Notifications"). */
export function TopBarTitle({ children }: { children: ReactNode }) {
  return <h1 className="m-0 text-[17px] font-extrabold">{children}</h1>
}

/**
 * Back arrow (22 px, stroke 2.4). `to={-1}` goes back in history, for pages
 * opened from several places (Terms, Privacy); with no history it goes home.
 */
export function BackLink({ to, label = 'Back' }: { to: string | -1; label?: string }) {
  const navigate = useNavigate()
  const icon = <ChevronLeftIcon size={22} strokeWidth={2.4} roundJoin={false} />
  if (to === -1) {
    return (
      <IconButton label={label} onClick={() => (window.history.length > 1 ? navigate(-1) : navigate('/app'))}>
        {icon}
      </IconButton>
    )
  }
  return (
    <IconLink to={to} label={label}>
      {icon}
    </IconLink>
  )
}

/** Hamburger that opens the drawer menu. */
export function MenuLink({ to }: { to: string }) {
  return (
    <IconLink to={to} label="Open menu">
      <MenuIcon size={24} roundJoin={false} />
    </IconLink>
  )
}

/** Bell with the gentle sway and a red dot when there is something new. */
export function NotificationsLink({ to, unread }: { to: string; unread: number }) {
  return (
    <IconLink to={to} label={unread > 0 ? `Notifications, ${unread} new` : 'Notifications'} dot={unread > 0}>
      <BellIcon size={22} className={unread > 0 ? 'animate-sway origin-top' : undefined} />
    </IconLink>
  )
}

/** Avatar in the top bar that opens the profile menu. */
export function ProfileLink({ to, name, tone }: { to: string; name: string; tone?: 'brand' | 'green' }) {
  return (
    <Link to={to} aria-label="Profile menu" className="hit-44 rounded-full no-underline">
      <Avatar name={name} tone={tone} />
    </Link>
  )
}

/** The one scrolling region of a phone screen (`.scroll`). */
export function ScrollArea({
  children,
  className,
  style,
  wide = false,
}: {
  children: ReactNode
  /** Override padding or gap where a screen differs (e.g. `gap-3`). */
  className?: string
  style?: CSSProperties
  /** Identifies overview content; all workspace pages now use the available width. */
  wide?: boolean
}) {
  return (
    <main
      data-content={wide ? 'wide' : undefined}
      className={cx('mo-scroll min-w-0', className)}
      style={style}
    >
      {children}
    </main>
  )
}

/** Fixed footer for the main action (`.foot`), padded above the phone's home bar. */
export function Footer({ children, row = false, className }: { children: ReactNode; row?: boolean; className?: string }) {
  return (
    <div
      className={cx(
        'mo-foot',
        row && 'flex-row gap-2.5',
        className,
      )}
    >
      {children}
    </div>
  )
}
