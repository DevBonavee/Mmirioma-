import { lazy, Suspense } from 'react'
import { ArrowRightIcon, PinIcon } from './icons'
import { formatPhone } from '../../lib/format/phone'
import { whatsappLink } from '../../lib/whatsapp'
import type { MapLibre } from './loadMapLibre'
import { useServiceAreas, useSupportContact } from './queries'

// The map and its library are a separate chunk: the landing page's first load does not include them.
const ServiceAreaMap = lazy(() => import('./ServiceAreaMap').then((m) => ({ default: m.ServiceAreaMap })))

const TEXT_LINK = 'inline-flex min-h-11 items-center gap-1.5 text-[15px] font-bold text-primary no-underline hover:text-primary-dark'

/**
 * "Check your area" with WhatsApp when it is on, else a call link (FR-055).
 * The same link serves the "Not on the list?" card and the empty and error states.
 */
export function CheckAreaLink({ message = 'Hello MmiriOma, do you deliver to my area?' }: { message?: string }) {
  const { phone, whatsapp } = useSupportContact()
  return whatsapp ? (
    <a href={whatsappLink(whatsapp, message)} target="_blank" rel="noopener noreferrer" className={TEXT_LINK}>
      Check your area on WhatsApp
      <ArrowRightIcon size={15} />
    </a>
  ) : (
    <a href={`tel:${phone}`} className={TEXT_LINK}>
      Call {formatPhone(phone)} to check your area
    </a>
  )
}

const CHIP = 'inline-flex min-h-[46px] items-center gap-2 rounded-xl bg-mk-chip px-4 text-[15px] font-semibold text-ink'

/** Props of {@link ServiceAreas}. */
export interface ServiceAreasProps {
  /** Loads the map library; tests pass a fake. */
  loadMap?: () => Promise<MapLibre>
}

/**
 * The landing page's "Our service areas" body: the real active zones as a map
 * and a list of names (#346, docs/design/landing-service-areas.md).
 *
 * States: loading (grey map box and three grey chips), zones (map and list;
 * the list never depends on the map), no active zone (no map, a note and the
 * call or WhatsApp link) and could not load (a note, the link and "Try
 * again"). Nothing here promises coverage beyond the zones the administrator
 * has switched on, or any delivery time (FR-027).
 */
export function ServiceAreas({ loadMap }: ServiceAreasProps) {
  const areas = useServiceAreas()

  if (areas.isPending) {
    return (
      <div aria-busy="true" aria-label="Loading service areas" role="status" className="flex flex-col gap-4">
        <div className="h-[280px] animate-pulse rounded-[18px] bg-mk-chip sm:h-[360px]" />
        <div className="flex flex-wrap gap-2.5">
          {[0, 1, 2].map((n) => (
            <span key={n} className="inline-block h-[46px] w-32 animate-pulse rounded-xl bg-mk-chip" />
          ))}
        </div>
      </div>
    )
  }

  if (areas.isError) {
    return (
      <div role="alert" className="flex flex-col items-start gap-2 rounded-[18px] bg-mk-chip px-6 py-[22px]">
        <p className="m-0 text-[16px] font-bold text-ink">We could not load the areas.</p>
        <p className="m-0 text-[15px] text-slate">Call or WhatsApp us to check your area.</p>
        <div className="flex flex-wrap items-center gap-4">
          <CheckAreaLink />
          <button type="button" onClick={() => void areas.refetch()} className={`${TEXT_LINK} cursor-pointer border-0 bg-transparent p-0`}>
            Try again
          </button>
        </div>
      </div>
    )
  }

  if (areas.data.length === 0) {
    return (
      <div className="flex flex-col items-start gap-2 rounded-[18px] bg-mk-chip px-6 py-[22px]">
        <p className="m-0 text-[16px] font-bold text-ink">We have not opened a delivery area yet.</p>
        <p className="m-0 text-[15px] text-slate">Call or WhatsApp us and we will tell you when we start.</p>
        <CheckAreaLink message="Hello MmiriOma, when will you start delivering?" />
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-4">
      <Suspense fallback={<div aria-hidden="true" className="h-[280px] animate-pulse rounded-[18px] bg-mk-chip sm:h-[360px]" />}>
        <ServiceAreaMap areas={areas.data} loadMap={loadMap} />
      </Suspense>
      <ul aria-label="Service areas" className="m-0 flex list-none flex-wrap gap-2.5 p-0">
        {areas.data.map((area) => (
          <li key={area.id} className={CHIP}>
            <PinIcon className="text-ink" />
            {area.name}
          </li>
        ))}
      </ul>
    </div>
  )
}
