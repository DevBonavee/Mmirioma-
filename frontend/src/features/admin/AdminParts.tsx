import { Suspense, useEffect, useId, useLayoutEffect, useRef, useState, type ReactNode, type RefObject, type SelectHTMLAttributes } from 'react'
import { Link, Outlet, useLocation } from 'react-router-dom'
import { AdminShell } from '../../components/layout/AdminShell'
import { LoadingBlock, LoadingScreen } from '../../components/layout/StateScreens'
import { CloseIcon } from '../../components/icons/icons'
import { Card } from '../../components/ui/Card'
import { Chip, SampleTag } from '../../components/ui/Chip'
import { INPUT } from '../../components/ui/Field'
import { IconButton } from '../../components/ui/IconButton'
import { ADMIN_STATUS_LABEL, type AdminOrderStatus, type AdminPaymentStatus } from '../../domain/admin'
import type { ApprovalStatus } from '../../domain/partner'
import { cx } from '../../lib/cx'
import { RequireRole } from '../auth/RequireRole'
import { APPROVAL_LABEL, APPROVAL_TONE, DETAIL_PANEL_ID, PAYMENT_LABEL, PAYMENT_TONE, REVEAL_DETAIL_EVENT, STATUS_TONE } from './adminFormat'
import { useShellData } from './queries'

/** `/admin/*` layout route: staff only (RequireRole), each page loads on demand. */
export function AdminArea() {
  return (
    <RequireRole role="admin">
      <Suspense fallback={<LoadingScreen />}>
        <Outlet />
      </Suspense>
    </RequireRole>
  )
}

/**
 * Every admin page's frame: the shell (logo, search, bell, profile, full
 * sidebar on every page, decision 17) with live badge counts.
 */
export function AdminFrame({
  searchPlaceholder,
  onSearch,
  children,
}: {
  /** Header search placeholder; each page searches its own records. */
  searchPlaceholder: string
  onSearch?: (query: string) => void
  children: ReactNode
}) {
  const shell = useShellData()
  return (
    <AdminShell
      searchPlaceholder={searchPlaceholder}
      onSearch={onSearch}
      user={shell.data?.user ?? { name: ' ', role: 'Staff' }}
      counts={shell.data?.counts}
      unread={shell.data?.unread}
    >
      {children}
    </AdminShell>
  )
}

/** Page title block (a-* pages): 26 px title, muted line, actions on the right. */
export function PageHead({ title, sub, actions, back, className }: { title: ReactNode; sub?: ReactNode; actions?: ReactNode; back?: ReactNode; className?: string }) {
  return (
    <div className={cx('rise-1 flex flex-wrap items-end justify-between gap-3', className)}>
      <div className="min-w-0">
        {back}
        <h1 className="m-0 text-admin-title leading-[1.2] font-extrabold tracking-[-0.4px]">{title}</h1>
        {sub && <p className="mt-1 mb-0 text-mute">{sub}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2.5">{actions}</div>}
    </div>
  )
}

/** A white admin card with an optional title row. */
export function Panel({ title, action, sample, className, children }: { title?: ReactNode; action?: ReactNode; sample?: string; className?: string; children: ReactNode }) {
  return (
    <Card className={cx('flex min-w-0 flex-col gap-3 p-4', className)}>
      {(title || action || sample) && (
        <div className="flex flex-wrap items-center justify-between gap-2">
          {title && <h2 className="m-0 text-[17px] font-extrabold">{title}</h2>}
          <div className="flex items-center gap-2">
            {sample && <SampleTag>{sample}</SampleTag>}
            {action}
          </div>
        </div>
      )}
      {children}
    </Card>
  )
}

export function StatusChip({ status }: { status: AdminOrderStatus }) {
  return <Chip tone={STATUS_TONE[status]}>{ADMIN_STATUS_LABEL[status]}</Chip>
}

export function PaymentChip({ status }: { status: AdminPaymentStatus }) {
  return <Chip tone={PAYMENT_TONE[status]}>{PAYMENT_LABEL[status]}</Chip>
}

export function ApprovalChip({ status }: { status: ApprovalStatus }) {
  return <Chip tone={APPROVAL_TONE[status]}>{APPROVAL_LABEL[status]}</Chip>
}

/** Online or offline, as a word with the chip colour (never colour alone). */
export function OnlineChip({ online }: { online: boolean }) {
  return <Chip tone={online ? 'blue' : 'gray'}>{online ? 'Online' : 'Offline'}</Chip>
}

/** A labelled native select in the design's input style. */
export function SelectField({
  label,
  error,
  className,
  children,
  ...rest
}: { label: ReactNode; error?: string; className?: string; children: ReactNode } & Omit<SelectHTMLAttributes<HTMLSelectElement>, 'className'>) {
  const id = useId()
  return (
    <div className={className}>
      <label htmlFor={id} className="mb-1.5 block text-[14px] font-bold">
        {label}
      </label>
      <select id={id} aria-invalid={error ? true : undefined} className={cx(INPUT, 'cursor-pointer', error && 'border-[#DC2626] bg-[#FEF2F2]')} {...rest}>
        {children}
      </select>
      {error && (
        <p role="alert" className="mt-1.5 mb-0 text-caption font-bold text-red">
          {error}
        </p>
      )}
    </div>
  )
}

/** Loading state sized for a panel. */
export function PanelLoading({ label }: { label: string }) {
  return (
    <Card className="p-4">
      <LoadingBlock label={label} />
    </Card>
  )
}

/** Side padding of the admin page content on a tablet and up (`md:p-6`), both sides. */
const PAGE_PADDING_PX = 48

/**
 * The width of the page content area, in px, from which a side panel sits
 * beside the table: 1400 px, as docs/design/responsive.md says. `SplitLayout`
 * measures inside the page padding, so the constant is the width it sees:
 * 1400 less the padding. (The content area is capped at 1440 px, so with the
 * padding left in the measurement the panel could never sit beside the table.)
 * Narrower than this the panel is a side sheet: a table plus a 380 px panel
 * would squeeze the table into a scroll box.
 */
export const PANEL_BESIDE_MIN_PX = 1400 - PAGE_PADDING_PX

/**
 * The width of `ref`'s element in px, kept up to date, or `null` while it is
 * not known (before the first measurement, and where nothing is laid out, as
 * in the unit tests).
 */
function useElementWidth(ref: RefObject<HTMLElement | null>): number | null {
  const [width, setWidth] = useState<number | null>(null)
  // Measured before the first paint so a wide screen never flashes the narrow layout.
  useLayoutEffect(() => {
    const element = ref.current
    if (!element) return
    const measure = () => setWidth(element.getBoundingClientRect().width || null)
    measure()
    if (typeof ResizeObserver === 'undefined') return
    const observer = new ResizeObserver(measure)
    observer.observe(element)
    return () => observer.disconnect()
  }, [ref])
  return width
}

/**
 * The design's two-column page: the main content and a detail panel.
 *
 * Where the page content area is at least 1400 px wide ({@link PANEL_BESIDE_MIN_PX}) the panel
 * sits beside the main content, sticky. Narrower (a tablet, or a laptop with
 * the sidebar open) it is a side sheet over the page: closed until the person
 * picks an item (the page calls `revealDetail`), then 420 px from the right on a
 * tablet or the full screen on a phone. The sheet closes with its Close button,
 * a click outside it, or Escape, and focus returns to what opened it.
 *
 * While the width is unknown the panel is shown beside the content, as it was
 * before the sheet existed.
 *
 * @param main - The list or table.
 * @param side - The panel's content; it is not mounted while the sheet is closed.
 * @param sideWidth - Tailwind width class of the panel when it is beside the content.
 */
export function SplitLayout({ main, side, sideWidth = 'w-[360px]' }: { main: ReactNode; side: ReactNode; sideWidth?: string }) {
  const root = useRef<HTMLDivElement>(null)
  const width = useElementWidth(root)
  const beside = width === null || width >= PANEL_BESIDE_MIN_PX
  const [open, setOpen] = useState(false)
  const sheet = useRef<HTMLElement>(null)
  const opener = useRef<Element | null>(null)

  // A page's row buttons call revealDetail(); in sheet mode that opens the sheet.
  // Depends on `beside` only: the listener is replaced when the layout changes mode.
  useEffect(() => {
    if (beside) return
    function onReveal() {
      opener.current = document.activeElement
      setOpen(true)
    }
    window.addEventListener(REVEAL_DETAIL_EVENT, onReveal)
    return () => window.removeEventListener(REVEAL_DETAIL_EVENT, onReveal)
  }, [beside])

  const showSheet = !beside && open
  useEffect(() => {
    if (!showSheet) return
    sheet.current?.focus()
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false)
    }
    window.addEventListener('keydown', onKey)
    return () => {
      window.removeEventListener('keydown', onKey)
      if (opener.current instanceof HTMLElement) opener.current.focus()
    }
  }, [showSheet])

  return (
    <div ref={root} className={cx('flex gap-4', beside ? 'flex-row items-start' : 'flex-col')}>
      <div className="flex min-w-0 flex-1 flex-col gap-3.5">{main}</div>
      {beside && (
        <aside id={DETAIL_PANEL_ID} className={cx('flex shrink-0 scroll-mt-4 flex-col gap-3 sticky top-4', sideWidth)}>
          {side}
        </aside>
      )}
      {showSheet && (
        <>
          <button
            type="button"
            aria-hidden="true"
            data-sheet-backdrop
            tabIndex={-1}
            className="fixed inset-0 z-30 cursor-default border-0 bg-[linear-gradient(160deg,#1570D8,#16A0B8)] opacity-55"
            onClick={() => setOpen(false)}
          />
          <aside
            id={DETAIL_PANEL_ID}
            ref={sheet}
            role="dialog"
            aria-modal="true"
            aria-label="Details"
            tabIndex={-1}
            className="fixed inset-y-0 right-0 z-40 box-border flex w-full flex-col gap-3 overflow-y-auto bg-canvas p-4 shadow-[-16px_0_40px_rgba(0,0,0,0.25)] outline-none md:w-[420px]"
          >
            <div className="flex justify-end">
              <IconButton label="Close details" onClick={() => setOpen(false)}>
                <CloseIcon size={20} strokeWidth={2.4} roundJoin={false} />
              </IconButton>
            </div>
            {side}
          </aside>
        </>
      )}
    </div>
  )
}

/** Pill tabs that are links (a-pricing: Pricing · Loyalty points · Payouts and payments). */
export function LinkTabs({ label, tabs, className }: { label: string; tabs: { to: string; label: string }[]; className?: string }) {
  const { pathname } = useLocation()
  return (
    <nav aria-label={label} className={cx('flex flex-wrap gap-2', className)}>
      {tabs.map((t) => {
        const on = pathname === t.to
        return (
          <Link
            key={t.to}
            to={t.to}
            aria-current={on ? 'page' : undefined}
            className={cx('mo-pill hit-44 no-underline', on ? 'border-0 bg-ink text-white hover:text-white' : 'border-[1.5px] border-solid border-line bg-white text-slate hover:border-primary hover:text-ink')}
          >
            {t.label}
          </Link>
        )
      })}
    </nav>
  )
}

/**
 * A naira amount input that holds integer kobo (SRS §5): the person types
 * whole naira ("25,000"), the value is kobo. Empty is `null`.
 */
export function NairaInput({ label, value, onChange, className }: { label: string; value: number | null; onChange: (kobo: number | null) => void; className?: string }) {
  return (
    <input
      aria-label={label}
      inputMode="numeric"
      className={cx(INPUT, 'w-full max-w-36', className)}
      value={value === null ? '' : (value / 100).toLocaleString('en-NG')}
      onChange={(e) => {
        const digits = e.target.value.replace(/[^\d]/g, '')
        onChange(digits === '' ? null : Number(digits) * 100)
      }}
    />
  )
}
