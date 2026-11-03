import { zodResolver } from '@hookform/resolvers/zod'
import { useEffect, useId, useRef, useState, type ReactNode } from 'react'
import { useForm, useWatch } from 'react-hook-form'
import { Link } from 'react-router-dom'
import { z } from 'zod'
import { AlertCircleIcon } from '../../components/icons/icons'
import { Notice } from '../../components/ui/Notice'
import { PROBLEM_LABEL, type ProblemType } from '../../domain/orders'
import { ApiError } from '../../lib/api/client'
import type { ContactMessageReceipt } from '../../lib/api/publicSite'
import { cx } from '../../lib/cx'
import { formatPhone } from '../../lib/format/phone'
import { applyServerFieldErrors, phoneField, retryAfterSeconds } from '../../lib/forms'
import { WHATSAPP_GREETING, whatsappLink } from '../../lib/whatsapp'
import { CARD_BUTTON, OUTLINE_BUTTON, PRIMARY_BUTTON } from './buttonStyles'
import { CheckCircleIcon, PhoneIcon, WhatsAppIcon } from './icons'
import { useSendContactMessage, useSupportContact } from './queries'

/** Longest message the contract accepts (public-site.md, "POST /public/contact"). */
const MESSAGE_MAX = 1000

/** The visible fields, in the order they appear, so focus goes to the first one with an error. */
const FIELDS = ['name', 'phone', 'topic', 'message'] as const
type FieldName = (typeof FIELDS)[number]

const isTopic = (value: string): value is ProblemType => Object.hasOwn(PROBLEM_LABEL, value)

/** The contract's rules with the wording in docs/design/contact.md, "The form". */
const schema = z.object({
  name: z.string().trim().min(1, 'Enter your name.').max(100, 'Use 100 characters or fewer.'),
  phone: phoneField,
  // "" is "Choose a topic": nothing is sent and the server stores `other`.
  topic: z.string().refine((v) => v === '' || Object.hasOwn(PROBLEM_LABEL, v)),
  message: z
    .string()
    .trim()
    .min(1, 'Write your message.')
    .min(3, 'Write at least 3 characters.')
    .max(MESSAGE_MAX, 'Use 1,000 characters or fewer.'),
})
type Values = z.infer<typeof schema>

const EMPTY: Values = { name: '', phone: '', topic: '', message: '' }

/** The look of the FAQ page's search field (docs/design/contact.md, "Changes to the design system"). */
const CONTROL = 'box-border min-h-[58px] w-full rounded-[14px] border-[1.5px] border-solid px-[18px] font-marketing text-[16px] text-ink placeholder:text-mute'

/**
 * A control's classes, with the colours of its state. Only one state's colours
 * are ever on the element: two border or background utilities on one element
 * are applied in stylesheet order, not class order, so adding the error
 * colours next to the normal ones left invalid fields grey.
 */
function controlClass(invalid: boolean, extra?: string): string {
  return cx(CONTROL, invalid ? 'border-[#DC2626] bg-[#FEF2F2]' : 'border-input-line bg-white', extra)
}

/** The visible fields a 422 `validation_error` names (its `details[].loc` ends with the field). */
function serverFieldNames(error: unknown): FieldName[] {
  if (!(error instanceof ApiError) || error.code !== 'validation_error' || !Array.isArray(error.details)) return []
  const named = new Set((error.details as { loc?: unknown[] }[]).map((d) => d.loc?.at(-1)))
  return FIELDS.filter((f) => named.has(f))
}

/** "about 1 minute", "about 20 minutes": the wait from `retry_after_seconds`, rounded up, at least 1. */
function minutesText(seconds: number): string {
  const minutes = Math.max(1, Math.ceil(seconds / 60))
  return `${minutes} ${minutes === 1 ? 'minute' : 'minutes'}`
}

/** A `tel:` link inside a banner or panel, in the surrounding text's colour. */
function CallLink({ phone }: { phone: string }) {
  return (
    <a href={`tel:${phone}`} className="font-bold whitespace-nowrap text-inherit underline">
      {formatPhone(phone)}
    </a>
  )
}

/**
 * The banner above the button for a failure that is not about one field
 * (docs/design/contact.md, "States"). The visitor's text always stays.
 */
function FailureNotice({ error, phone }: { error: unknown; phone: string }) {
  let text: ReactNode
  if (error instanceof ApiError && error.code === 'validation_error') {
    text = "We couldn't send this message. Check it and try again."
  } else if (error instanceof ApiError && error.code === 'too_many_attempts') {
    const wait = retryAfterSeconds(error)
    text = (
      <>
        You've sent several messages in a short time.{' '}
        {wait !== null ? `You can send another in about ${minutesText(wait)}.` : 'Please try again later.'} If it's urgent, call us on{' '}
        <CallLink phone={phone} />.
      </>
    )
  } else if (error instanceof ApiError && error.code === 'network_error') {
    text = "You're offline. Your message is still here: send it when you're back online."
  } else {
    text = (
      <>
        We couldn't send your message just now. Try again, or call us on <CallLink phone={phone} />.
      </>
    )
  }
  return (
    <Notice tone="error" className="text-[15px] leading-[1.5]">
      {text}
    </Notice>
  )
}

interface FieldProps {
  id: string
  label: string
  /** Shows "(optional)" after the label. */
  optional?: boolean
  /** Helper text under the control, hidden while an error shows. */
  hint?: string
  /** Text on the right under the control (the message counter); stays with an error. */
  aside?: ReactNode
  error?: string
  children: ReactNode
}

/**
 * A label, its control and the messages under it. The control itself sets
 * `aria-describedby` to {@link describedBy}, so a screen reader reads the
 * error, the hint or the counter with the field.
 */
function Field({ id, label, optional, hint, aside, error, children }: FieldProps) {
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-[15px] font-bold text-ink">
        {label}
        {optional && <span className="font-normal text-mute"> (optional)</span>}
      </label>
      {children}
      {(error || hint || aside) && (
        <div className="flex items-start justify-between gap-3 text-[14px] leading-[1.5]">
          {error ? (
            <p id={`${id}-error`} className="m-0 flex items-center gap-1.5 font-bold text-red">
              <AlertCircleIcon size={16} className="shrink-0" />
              {error}
            </p>
          ) : hint ? (
            <p id={`${id}-hint`} className="m-0 text-mute">
              {hint}
            </p>
          ) : (
            <span />
          )}
          {aside}
        </div>
      )}
    </div>
  )
}

/** The ids a control is described by: its error, else its hint, then its counter. */
function describedBy(id: string, { error, hint, counter }: { error?: string; hint?: boolean; counter?: boolean }): string | undefined {
  const ids = [error ? `${id}-error` : hint ? `${id}-hint` : null, counter ? `${id}-count` : null].filter(Boolean)
  return ids.length ? ids.join(' ') : undefined
}

/**
 * The "Message received" panel that replaces the form after a 201
 * (docs/design/contact.md, "Sent panel"). It says only that the message
 * arrived: no reply time and no booking (FR-027). The heading takes focus so a
 * screen reader announces the result.
 */
function SentPanel({ reference, onAnother }: { reference: string; onAnother: () => void }) {
  const { phone, whatsapp } = useSupportContact()
  const heading = useRef<HTMLHeadingElement>(null)

  // Runs once when the panel appears: the form the visitor was in is gone, so
  // focus moves to the result instead of falling back to the page.
  useEffect(() => heading.current?.focus(), [])

  return (
    <div className="flex flex-col items-start gap-4">
      <CheckCircleIcon size={40} className="text-[#15803D]" />
      <h2 ref={heading} tabIndex={-1} className="m-0 font-display text-[26px] font-bold text-ink outline-none">
        Message received
      </h2>
      <p className="m-0 text-[16px] leading-[1.6] text-slate">Thank you. Our team answers website messages by phone, on the number you gave.</p>
      <p className="m-0 text-[16px] leading-[1.6] text-slate">
        Your reference: <strong className="text-ink">{reference}</strong>. Quote it if you call us.
      </p>
      <p className="m-0 text-[16px] leading-[1.6] text-slate">
        If it's urgent, call us on <CallLink phone={phone} />.
      </p>
      <div className="flex flex-wrap gap-2.5">
        <a href={`tel:${phone}`} className={cx(OUTLINE_BUTTON, 'min-h-12 px-5 text-[15px]')}>
          <PhoneIcon />
          Call {formatPhone(phone)}
        </a>
        {whatsapp && (
          <a
            href={whatsappLink(whatsapp, WHATSAPP_GREETING)}
            target="_blank"
            rel="noopener noreferrer"
            className={cx(CARD_BUTTON, 'bg-[#1DA851] text-white hover:bg-[#178A43] hover:text-white')}
          >
            <WhatsAppIcon size={18} />
            Chat on WhatsApp
          </a>
        )}
      </div>
      <button
        type="button"
        onClick={onAnother}
        className="inline-flex min-h-11 cursor-pointer items-center border-0 bg-transparent p-0 text-[15px] font-bold text-primary hover:text-primary-dark"
      >
        Send another message
      </button>
    </div>
  )
}

/**
 * The Contact page's message form (`POST /public/contact`, #339; design
 * docs/design/contact.md). Shown only while `CONTACT_FORM_ENABLED` is on.
 *
 * - **The text survives every failure.** Only a 201 clears the fields; a
 *   field error, a 429, a lost connection or a server error keeps them.
 * - **One request at a time.** The contract has no idempotency key, so the
 *   button is disabled and a ref blocks a second submit while one is in flight.
 * - **The honeypot** `website` is a real input moved off-screen, not
 *   `display: none`, with `autocomplete="off"`, `tabindex="-1"` and
 *   `aria-hidden`, so people and screen readers never meet it. Its value is
 *   read from the input itself, so a bot that sets it without typing is still
 *   caught. A person always sends it empty.
 * - **Personal data (NFR-003).** The name, phone and message are never logged
 *   or stored; `method="post"` keeps them out of the address even if the
 *   script did not handle the submit.
 */
export function ContactForm() {
  const id = useId()
  const send = useSendContactMessage()
  const { phone: supportPhone } = useSupportContact()
  const honeypot = useRef<HTMLInputElement>(null)
  const inFlight = useRef(false)
  const focusNameNext = useRef(false)
  const [receipt, setReceipt] = useState<ContactMessageReceipt | null>(null)
  const {
    register,
    handleSubmit,
    setError,
    setFocus,
    reset,
    control,
    formState: { errors },
  } = useForm<Values>({ resolver: zodResolver(schema), defaultValues: EMPTY })
  const messageLength = useWatch({ control, name: 'message' }).length

  // "Send another message" brings the form back; focus its first field once
  // it is on the page again, so keyboard users start where they left off.
  useEffect(() => {
    if (receipt || !focusNameNext.current) return
    focusNameNext.current = false
    setFocus('name')
  }, [receipt, setFocus])

  // Called by handleSubmit from the form's submit event (below), never while rendering.
  function submit(values: Values) {
    if (inFlight.current) return
    inFlight.current = true
    send.mutate(
      {
        name: values.name,
        phone: values.phone,
        message: values.message,
        ...(isTopic(values.topic) ? { topic: values.topic } : {}),
        website: honeypot.current?.value ?? '',
      },
      {
        onSuccess: (sent) => {
          setReceipt(sent)
          reset(EMPTY)
          if (honeypot.current) honeypot.current.value = ''
          // Drop the finished request, which still holds the text, from the cache.
          send.reset()
        },
        onError: (error) => {
          applyServerFieldErrors(error, setError, { name: 'name', phone: 'phone', topic: 'topic', message: 'message' })
          const first = serverFieldNames(error)[0]
          if (first) setFocus(first)
        },
        onSettled: () => {
          inFlight.current = false
        },
      },
    )
  }

  if (receipt) {
    return (
      <section aria-label="Your message" className="rounded-[20px] border border-solid border-line bg-white p-6 min-[600px]:p-8">
        <SentPanel
          reference={receipt.reference}
          onAnother={() => {
            focusNameNext.current = true
            setReceipt(null)
          }}
        />
      </section>
    )
  }

  const sending = send.isPending
  // A 422 that names a field shows under that field, not in a banner.
  const failure = send.isError && serverFieldNames(send.error).length === 0 ? send.error : null
  const ids = { name: `${id}-name`, phone: `${id}-phone`, topic: `${id}-topic`, message: `${id}-message`, website: `${id}-website` }

  return (
    <section aria-labelledby={`${id}-title`} className="relative rounded-[20px] border border-solid border-line bg-white p-6 min-[600px]:p-8">
      <h2 id={`${id}-title`} className="m-0 mb-6 font-display text-[26px] font-bold text-ink">
        Send us a message
      </h2>
      <form onSubmit={(event) => void handleSubmit(submit)(event)} method="post" noValidate className="flex flex-col gap-5">
        <Field id={ids.name} label="Your name" error={errors.name?.message}>
          <input
            id={ids.name}
            type="text"
            autoComplete="name"
            readOnly={sending}
            aria-invalid={errors.name ? true : undefined}
            aria-describedby={describedBy(ids.name, { error: errors.name?.message })}
            className={controlClass(!!errors.name)}
            {...register('name')}
          />
        </Field>
        <Field id={ids.phone} label="Phone number" hint="We answer by calling this number." error={errors.phone?.message}>
          <input
            id={ids.phone}
            type="tel"
            inputMode="tel"
            autoComplete="tel"
            placeholder="0803 123 4567"
            readOnly={sending}
            aria-invalid={errors.phone ? true : undefined}
            aria-describedby={describedBy(ids.phone, { error: errors.phone?.message, hint: true })}
            className={controlClass(!!errors.phone)}
            {...register('phone')}
          />
        </Field>
        <Field id={ids.topic} label="What is it about?" optional error={errors.topic?.message}>
          <select
            id={ids.topic}
            disabled={sending}
            aria-invalid={errors.topic ? true : undefined}
            aria-describedby={describedBy(ids.topic, { error: errors.topic?.message })}
            className={controlClass(!!errors.topic, 'cursor-pointer')}
            {...register('topic')}
          >
            <option value="">Choose a topic</option>
            {Object.entries(PROBLEM_LABEL).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </Field>
        <Field
          id={ids.message}
          label="Your message"
          error={errors.message?.message}
          aside={
            <span id={`${ids.message}-count`} className={cx('shrink-0 tabular-nums', messageLength > MESSAGE_MAX ? 'font-bold text-red' : 'text-mute')}>
              {messageLength}/{MESSAGE_MAX}
            </span>
          }
        >
          <textarea
            id={ids.message}
            rows={6}
            readOnly={sending}
            aria-invalid={errors.message ? true : undefined}
            aria-describedby={describedBy(ids.message, { error: errors.message?.message, counter: true })}
            className={controlClass(!!errors.message, 'min-h-[160px] resize-y py-3.5 leading-[1.5]')}
            {...register('message')}
          />
        </Field>

        {/* The honeypot (contract decision 3): off-screen, never focused, hidden from screen readers. */}
        <div aria-hidden="true" className="absolute top-auto -left-[10000px] h-px w-px overflow-hidden">
          <label htmlFor={ids.website}>Website</label>
          <input ref={honeypot} id={ids.website} name="website" type="text" tabIndex={-1} autoComplete="off" aria-hidden="true" defaultValue="" />
        </div>

        {failure && <FailureNotice error={failure} phone={supportPhone} />}

        <div className="flex flex-col gap-3">
          <button
            type="submit"
            disabled={sending}
            className={cx(PRIMARY_BUTTON, 'min-h-[54px] cursor-pointer border-0 px-7 text-[16px] disabled:cursor-wait disabled:opacity-75 min-[600px]:self-start')}
          >
            {sending ? 'Sending…' : 'Send message'}
          </button>
          <p className="m-0 text-[14px] leading-[1.6] text-mute">
            We use your name and number only to answer this message, and we don't link it to an account.{' '}
            <Link to="/privacy" className="font-semibold text-primary hover:text-primary-dark">
              Privacy notice
            </Link>
          </p>
        </div>
      </form>
    </section>
  )
}
