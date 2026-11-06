import type { ReactNode } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { BottomTabBar, type TabItem } from '../../../components/layout/BottomTabBar'
import { MenuLink, NotificationsLink, ProfileLink, TopBar } from '../../../components/layout/MobileShell'
import { DocumentFoldIcon, DocumentLinesIcon, HomeSolidIcon, PersonIcon, WalletIcon } from '../../../components/icons/icons'
import { Chip } from '../../../components/ui/Chip'
import { PARTNER_PAY_ENABLED } from '../../../lib/features'
import { usePartnerApp } from '../partnerContext'
import { usePartnerNotifications, usePartnerProfile } from '../queries'
import { cx } from '../../../lib/cx'

/** One destination list for the partner's mobile tabs and desktop navigation. */
function usePartnerTabs() {
  const { base, role } = usePartnerApp()
  const OrdersIcon = role === 'rider' ? DocumentLinesIcon : DocumentFoldIcon
  const items: TabItem[] = [
    { to: base, label: 'Home', icon: (on: boolean) => <HomeSolidIcon size={22} filled={on} /> },
    { to: `${base}/orders`, label: 'Orders', icon: () => <OrdersIcon size={22} /> },
    // Partner pay is out of the MVP (#157): no Earnings tab.
    ...(PARTNER_PAY_ENABLED ? [{ to: `${base}/earnings`, label: 'Earnings', icon: () => <WalletIcon size={22} /> }] : []),
    { to: `${base}/menu`, label: 'Profile', icon: () => <PersonIcon size={22} roundJoin={false} /> },
  ]
  return { base, role, items }
}

/** Mobile/tablet tabs; the same destinations move to the header on desktop. */
export function PartnerTabs({ current }: { current: 'home' | 'orders' | 'earnings' }) {
  const { base, role, items } = usePartnerTabs()
  const currentPath = current === 'home' ? base : current === 'orders' ? `${base}/orders` : `${base}/earnings`
  return <BottomTabBar label={role === 'rider' ? 'Rider' : 'Driver'} items={items} current={currentPath} className="xl:hidden" />
}

/** Desktop partner navigation, with active state preserved on nested routes. */
export function PartnerDesktopNav() {
  const { base, role, items } = usePartnerTabs()
  const { pathname } = useLocation()
  const current = pathname === base || pathname.startsWith(`${base}/assigned/`) ? base
    : /\/(orders|jobs|history)(\/|$)/.test(pathname) ? `${base}/orders`
      : pathname.startsWith(`${base}/earnings`) ? `${base}/earnings` : `${base}/menu`
  return (
    <nav aria-label={role === 'rider' ? 'Rider' : 'Driver'} className="flex justify-center gap-2 border-b border-line bg-white px-[18px]">
      {items.map((item) => {
        const on = item.to === current
        return (
          <Link key={item.to} to={item.to} aria-current={on ? 'page' : undefined} className={cx(
            'flex min-h-12 items-center gap-2 border-b-[3px] px-4 text-[15px] font-bold no-underline',
            on ? 'border-primary text-primary hover:text-primary' : 'border-transparent text-mute hover:text-ink',
          )}>
            {item.icon(on)}{item.label}
          </Link>
        )
      })}
    </nav>
  )
}

/** Home top bar for partners: menu, logo, notifications, avatar. */
export function PartnerHomeTopBar() {
  const { base } = usePartnerApp()
  const profile = usePartnerProfile()
  const notes = usePartnerNotifications()
  const unread = notes.data?.unread_count ?? 0
  return (
    <TopBar
      left={<MenuLink to={`${base}/menu`} />}
      right={
        <div className="flex items-center gap-1">
          <NotificationsLink to={`${base}/notifications`} unread={unread} />
          <ProfileLink to={`${base}/menu`} name={profile.data?.name ?? '·'} />
        </div>
      }
    />
  )
}

/** Small blue chip in the top bar's right slot ("Step 1 of 2", "At station"). */
export function StepChip({ children }: { children: ReactNode }) {
  return <Chip>{children}</Chip>
}
