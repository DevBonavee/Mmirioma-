import type { HTMLAttributes, ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { cx } from '../../lib/cx'

/** Base classes of the design's `.card`: white, 20 px radius, soft shadow, hairline border. */
export const CARD = 'mo-card'

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  /** Adds the design's `.pad` (16 px padding). */
  pad?: boolean
  children: ReactNode
}

/** The design's `.card` container. */
export function Card({ pad = false, className, children, ...rest }: CardProps) {
  return (
    <div className={cx(CARD, pad && 'p-4', className)} {...rest}>
      {children}
    </div>
  )
}

/** A whole card that is a link (recent orders, notifications, address card). */
export function CardLink({
  to,
  className,
  children,
  'aria-current': ariaCurrent,
}: {
  to: string
  className?: string
  children: ReactNode
  'aria-current'?: 'page'
}) {
  return (
    <Link to={to} aria-current={ariaCurrent} className={cx(CARD, 'text-ink no-underline hover:text-ink', className)}>
      {children}
    </Link>
  )
}
