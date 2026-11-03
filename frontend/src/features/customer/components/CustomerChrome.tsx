import { Link, useLocation } from 'react-router-dom'
import { BottomTabBar } from '../../../components/layout/BottomTabBar'
import { MenuLink, NotificationsLink, ProfileLink, TopBar } from '../../../components/layout/MobileShell'
import { CartIcon, DocumentLinesIcon, DocumentSolidIcon, HomeSolidIcon, PersonIcon } from '../../../components/icons/icons'
import { currentCustomerTab } from '../customerNav'
import { cx } from '../../../lib/cx'
import { useSession } from '../../auth/useSession'
import { useNotifications, useProfile } from '../queries'

const TABS = [
  { to: '/home', label: 'Home', icon: (on: boolean) => <HomeSolidIcon size={22} filled={on} /> },
  { to: '/order', label: 'Order', icon: () => <CartIcon size={22} /> },
  {
    to: '/orders',
    label: 'Orders',
    icon: (on: boolean) => (on ? <DocumentSolidIcon size={22} filled /> : <DocumentLinesIcon size={22} />),
  },
  { to: '/profile', label: 'Profile', icon: () => <PersonIcon size={22} roundJoin={false} /> },
]

/**
 * The customer bottom tab bar (`.tabs` on c-home and c-orders). From 1280 px
 * the header navigation ({@link CustomerDesktopNav}) replaces it.
 */
export function CustomerTabs({ current }: { current: '/home' | '/order' | '/orders' | '/profile' }) {
  return <BottomTabBar label="Main" items={TABS} current={current} className="xl:hidden" />
}

/**
 * Header navigation of the customer app from 1280 px (docs/design/responsive.md):
 * the same four links as the tab bar, drawn under the top bar of every signed-in
 * screen. `MobileShell` shows it only from `xl`.
 */
export function CustomerDesktopNav() {
  const current = currentCustomerTab(useLocation().pathname)
  return (
    <nav aria-label="Main" className="flex justify-center gap-2 border-b border-line bg-white px-[18px]">
      {TABS.map((tab) => {
        const on = tab.to === current
        return (
          <Link
            key={tab.to}
            to={tab.to}
            aria-current={on ? 'page' : undefined}
            className={cx(
              'flex min-h-12 items-center gap-2 border-b-[3px] px-4 text-[15px] font-bold no-underline',
              on ? 'border-primary text-primary hover:text-primary' : 'border-transparent text-mute hover:text-ink',
            )}
          >
            {tab.icon(on)}
            {tab.label}
          </Link>
        )
      })}
    </nav>
  )
}

/**
 * Top bar of the customer home screens: menu, logo, notifications (with the
 * unread dot) and the profile avatar. Set `bell={false}` for screens that
 * show only the avatar on the right (c-orders).
 */
export function CustomerTopBar({ bell = true }: { bell?: boolean }) {
  const profile = useProfile()
  const notifications = useNotifications()
  const unread = notifications.data?.unread_count ?? 0
  const session = useSession()
  const name = profile.data?.name ?? session.data?.user.name ?? ''
  return (
    <TopBar
      left={<MenuLink to="/menu" />}
      right={
        <div className="flex items-center gap-1">
          {bell && <NotificationsLink to="/notifications" unread={unread} />}
          <ProfileLink to="/menu" name={name || '·'} />
        </div>
      }
    />
  )
}
