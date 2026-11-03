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
 * Frame classes by width. Below 768 px every width is the same phone screen.
 * From 768 px: phone stays 430, customer is 720 and then up to 1120 from
 * 1280 px, card is 480.
 */
const FRAME: Record<ShellWidth, string> = {
  phone: 'max-w-phone',
  customer: 'max-w-phone md:max-w-customer xl:max-w-customer-wide',
  card: 'max-w-phone md:max-w-card',
}

/** Side padding that centres content in a 720 px column inside the 1120 px customer area (xl only). */
const XL_COLUMN = 'xl:px-[max(18px,calc((100%_-_720px)/2))]'

/**
 * Frame for every phone screen (`.ph` in the design, drawn at 390 × 844).
 *
 * It fills the viewport height (`100dvh`, so the browser toolbar does not
 * hide the footer) with a fixed header, one scrolling area and a fixed footer
 * or tab bar. From 360 px up it stretches to the screen width; on tablets and
 * desktops it is a centred column on the page background, so the phone layout
 * keeps its proportions. The column is 430 px unless a `ShellScope` says
 * otherwise (customer: 720 px, then up to 1120 px from 1280 px; see
 * `docs/design/responsive.md`).
 *
 * Inside a `Pane` it does not draw the page at all: it fills the pane.
 *
 * The `phone` width (the rider and driver app and the screens outside the
 * customer area) lets the browser window scroll from 768 px, with the header and
 * the footer or tab bar sticky, so a desktop browser shows one scrollbar, not a
 * second one inside the column (`data-scroll="window"`, styled in
 * `styles/components.css`). Below 768 px the frame is the viewport and the
 * scrolling area scrolls, as it always did. A `background="ink"` screen (a drawer
 * menu) keeps the viewport-high frame because its panel fills the screen.
 */
export function MobileShell({
  children,
  background = 'canvas',
  className,
}: {
  children: ReactNode
  /** Screen background: canvas (default), white (sign-in) or ink (drawer menus). */
  background?: 'canvas' | 'white' | 'ink'
  className?: string
}) {
  const { width } = useShellScope()
  const pane = usePane()
  const fill = background === 'white' ? 'bg-white' : background === 'ink' ? 'bg-ink' : 'bg-canvas'
  const windowScroll = width === 'phone' && background !== 'ink'
  if (pane) {
    return <div className={cx('relative flex min-h-0 flex-1 flex-col overflow-hidden text-body text-ink', fill, className)}>{children}</div>
  }
  return (
    <div className="min-h-dvh bg-canvas">
      <div
        data-scroll={windowScroll ? 'window' : undefined}
        className={cx(
          'relative mx-auto flex h-dvh flex-col overflow-hidden text-body text-ink',
          FRAME[width],
          'sm:border-x sm:border-line sm:shadow-card',
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
    <>
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
      {/* Customer desktop (1280 px and up): the links that the tab bar carries on a phone. */}
      {nav && pane === null && <div className="hidden shrink-0 xl:block">{nav}</div>}
    </>
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
  /**
   * Customer area from 1280 px: use the whole 1120 px instead of a centred
   * 720 px column (the home screen). Forms and detail screens leave it off.
   */
  wide?: boolean
}) {
  const { width } = useShellScope()
  const pane = usePane()
  return (
    <main
      className={cx('mo-scroll', width === 'customer' && pane === null && !wide && XL_COLUMN, className)}
      style={style}
    >
      {children}
    </main>
  )
}

/** Fixed footer for the main action (`.foot`), padded above the phone's home bar. */
export function Footer({ children, row = false, className }: { children: ReactNode; row?: boolean; className?: string }) {
  const { width } = useShellScope()
  const pane = usePane()
  return (
    <div
      className={cx(
        'mo-foot',
        width === 'customer' && pane === null && XL_COLUMN,
        row && 'flex-row gap-2.5',
        className,
      )}
    >
      {children}
    </div>
  )
}
