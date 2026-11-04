import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { cx } from '../../lib/cx'
import { HOME_LOGO_NAME, homeFor } from './logoTarget'

/**
 * A MmiriOma logo that is a link home, with the name "MmiriOma, home" (#337).
 * Wrap the logo picture in it, with an empty `alt` on the picture so the name is
 * not read twice. One component draws every screen logo, so a new screen cannot
 * forget the link; a test scans the source for a logo outside it.
 *
 * It leaves the current area on purpose, as the design decided: the admin logo
 * goes to the public site, and an unfinished order asks "Leave this order?"
 * first (`LeaveOrderGuard`).
 *
 * @param children - The logo picture (`Logo` or `BrandLogo`).
 * @param className - Extra classes for the link, for example its alignment.
 */
export function HomeLogo({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <Link to={homeFor()} aria-label={HOME_LOGO_NAME} className={cx('flex min-h-11 items-center no-underline', className)}>
      {children}
    </Link>
  )
}
