import { useEffect, useId, useRef, useState, useSyncExternalStore } from 'react'
import { createPortal } from 'react-dom'
import { CheckIcon, ChevronRightIcon, DocumentLinesIcon, HelpCircleIcon, MapPinIcon, ShieldIcon, TruckIcon } from '../../components/icons/icons'
import { Button } from '../../components/ui/Button'
import { MenuItem } from '../../components/ui/Content'
import { useSession } from '../auth/useSession'
import { tourSteps, type TourAudience } from './tourContent'
import { saveTourStatus, subscribeTour, tourStatus } from './tourStorage'
import './welcome-tour.css'

interface TourDialogProps {
  /** Selects the copy and diagram for this account's actual app. */
  audience: TourAudience
  /** Dismissal never navigates or performs an order/job action. */
  onDismiss: (completed: boolean) => void
}

function anotherDialogIsOpen(): boolean {
  return [...document.querySelectorAll('dialog[open], [role="dialog"][aria-modal="true"], [role="alertdialog"][aria-modal="true"]')]
    .some((element) => !element.classList.contains('mo-tour'))
}

/** Defer the automatic welcome to an existing confirmation/install modal too. */
function subscribeOtherDialogs(listener: () => void) {
  let active = true
  let queued = false
  const observer = new MutationObserver(() => {
    if (queued) return
    queued = true
    queueMicrotask(() => {
      queued = false
      if (active) listener()
    })
  })
  observer.observe(document.body, { subtree: true, childList: true, attributes: true, attributeFilter: ['open', 'aria-modal', 'role'] })
  return () => { active = false; observer.disconnect() }
}

/** Inspect committed DOM only, including a modal mounted beside the home screen. */
function createDialogStore() {
  let blocked: boolean | null = null
  return {
    getSnapshot: () => blocked,
    subscribe(listener: () => void) {
      const update = () => { blocked = anotherDialogIsOpen(); listener() }
      const unsubscribe = subscribeOtherDialogs(update)
      update()
      return unsubscribe
    },
  }
}

/** Optional, keyboard-accessible guide. Native modal semantics make the background inert. */
export function TourDialog({ audience, onDismiss }: TourDialogProps) {
  const [index, setIndex] = useState(-1)
  const dialog = useRef<HTMLDialogElement>(null)
  const heading = useRef<HTMLHeadingElement>(null)
  const id = useId()
  const steps = tourSteps(audience)
  const step = steps[index]
  const role = audience === 'customer' ? 'Customer guide' : audience === 'keke' ? 'Rider guide' : 'Driver guide'

  // The native top layer traps focus and inerts the page. Restore the opener and
  // previous scroll state when finishing, dismissing, changing account or route.
  useEffect(() => {
    const element = dialog.current!
    const opener = document.activeElement instanceof HTMLElement ? document.activeElement : null
    const overflow = document.body.style.overflow
    element.showModal()
    document.body.style.overflow = 'hidden'
    heading.current?.focus()
    return () => {
      element.close()
      document.body.style.overflow = overflow
      if (opener?.isConnected) opener.focus()
    }
  }, [])

  useEffect(() => { heading.current?.focus() }, [index])

  const DiagramIcon = !step ? TruckIcon : step.icon === 'address' ? MapPinIcon : step.icon === 'approval' || step.icon === 'code' ? ShieldIcon : step.icon === 'history' || step.icon === 'review' ? DocumentLinesIcon : TruckIcon

  return createPortal(
    <dialog
      ref={dialog}
      className="mo-tour"
      aria-labelledby={`${id}-title`}
      aria-describedby={`${id}-description${step ? ` ${id}-destination` : ''}`}
      onCancel={(event) => { event.preventDefault(); onDismiss(false) }}
      onKeyDown={(event) => {
        if (event.key === 'Escape') event.stopPropagation()
        if (event.key !== 'Tab') return
        const controls = [...event.currentTarget.querySelectorAll<HTMLButtonElement>('button:not([disabled])')]
        const first = controls[0]
        const last = controls.at(-1)
        // Native modals can Tab to browser chrome at either end. Keep the guide's
        // keyboard sequence within its actions, including Shift+Tab from the heading.
        if (event.shiftKey && (document.activeElement === first || document.activeElement === heading.current)) {
          event.preventDefault()
          last?.focus()
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault()
          first?.focus()
        }
      }}
    >
      <div className="mo-tour-top">
        <span className="mo-tour-label">MMIRIOMA · {role}</span>
        <button type="button" className="mo-tour-skip" onClick={() => onDismiss(false)}>Skip tour</button>
      </div>
      <div className="mo-tour-body">
        <div className="mo-tour-art" aria-hidden="true">
          <span className="mo-tour-orbit" />
          <div className="mo-tour-symbol"><DiagramIcon size={48} /></div>
          <div className="mo-tour-mini">
            <span className="mo-tour-check"><CheckIcon size={17} /></span>
            <span>{step?.where ?? 'A little guidance. A confident start.'}</span>
          </div>
          <p>{step?.cue ?? 'From your first step to your next delivery.'}</p>
        </div>
        <div className="mo-tour-copy">
          <p className="mo-tour-progress" aria-live="polite" aria-atomic="true">{step ? `Step ${index + 1} of ${steps.length}` : 'WELCOME TO MMIRIOMA'}</p>
          <h2 ref={heading} tabIndex={-1} id={`${id}-title`}>{step?.title ?? 'A quick look around'}</h2>
          <p id={`${id}-description`}>{step?.text ?? 'See how MmiriOma works in a few simple steps. You can skip anytime and find this guide in your account menu.'}</p>
          {step && <span id={`${id}-destination`} className="sr-only">Find it in: {step.where}.</span>}
          <div className="mo-tour-dots" aria-hidden="true">
            {steps.map((item, i) => <span key={item.title} data-current={i === index || (index === -1 && i === 0)} data-done={i < index} />)}
          </div>
        </div>
      </div>
      <div className="mo-tour-actions">
        <Button variant="line" onClick={() => index === -1 ? onDismiss(false) : setIndex(index - 1)}>{index === -1 ? 'Maybe later' : 'Back'}</Button>
        <Button onClick={() => index === steps.length - 1 ? onDismiss(true) : setIndex(index + 1)}>
          {index === -1 ? 'Show me around' : index === steps.length - 1 ? 'Finish tour' : 'Next'}
          <ChevronRightIcon size={18} />
        </Button>
      </div>
    </dialog>, document.body,
  )
}

/** Only a successful signup sets pending. Do not obscure loading, errors or active jobs. */
export function AutomaticTour({ audience, blocked = false }: { audience: TourAudience; blocked?: boolean }) {
  const [dialogs] = useState(createDialogStore)
  const user = useSession().data?.user
  const status = useSyncExternalStore(subscribeTour, () => tourStatus(user), () => null)
  const anotherDialog = useSyncExternalStore(dialogs.subscribe, dialogs.getSnapshot, () => null)
  if (!user || blocked || anotherDialog !== false || status !== 'pending') return null
  return <TourDialog key={user.id} audience={audience} onDismiss={(completed) => saveTourStatus(user, completed ? 'completed' : 'dismissed')} />
}

/** A replay action for existing accounts as well as people who skipped the welcome. */
export function TourReplay({ audience, placement = 'menu' }: { audience: TourAudience; placement?: 'menu' | 'card' }) {
  const user = useSession().data?.user
  const [open, setOpen] = useState(false)
  function dismiss(completed: boolean) {
    // A new account can reach replay before its eligible home visit. Treat that
    // manual visit as its welcome too, without rewriting an existing completion.
    if (user && tourStatus(user) === 'pending') saveTourStatus(user, completed ? 'completed' : 'dismissed')
    setOpen(false)
  }
  return <>
    {placement === 'menu' ? (
      <MenuItem icon={<HelpCircleIcon size={20} />} onClick={() => setOpen(true)}>Take a quick tour</MenuItem>
    ) : (
      <Button variant="line" onClick={() => setOpen(true)}><HelpCircleIcon size={20} />Take a quick tour</Button>
    )}
    {open && <TourDialog audience={audience} onDismiss={dismiss} />}
  </>
}
