import { useEffect, useId, useState } from 'react'
import { PASSWORD_RULES } from '../../lib/format/password'
import { CheckIcon } from '../icons/icons'

/** How long typing must pause before the count is announced. */
const ANNOUNCE_AFTER_MS = 800

/**
 * The live list of password rules under a new-password field
 * (docs/design/sign-up-password-and-terms.md).
 *
 * A met rule turns green and gains a check icon, so it does not rely on colour
 * alone. Each item says "met" or "not met" to screen readers.
 *
 * @param password The password as typed so far.
 */
export function PasswordChecklist({ password }: { password: string }) {
  const headingId = useId()
  const met = PASSWORD_RULES.filter((rule) => rule.met(password)).length
  const [announcement, setAnnouncement] = useState('')

  // A live region that changed on each keystroke would interrupt the person
  // while they type, so the summary waits for a pause. Nothing is said for an
  // empty field. Each new keystroke cancels the pending announcement.
  useEffect(() => {
    const timer = setTimeout(() => setAnnouncement(password ? `${met} of ${PASSWORD_RULES.length} password rules met` : ''), ANNOUNCE_AFTER_MS)
    return () => clearTimeout(timer)
  }, [password, met])

  return (
    <div className="mt-2">
      <p id={headingId} className="m-0 mb-1 text-caption text-mute">
        Your password needs:
      </p>
      <ul aria-labelledby={headingId} className="m-0 flex list-none flex-col gap-1 p-0">
        {PASSWORD_RULES.map((rule) => {
          const on = rule.met(password)
          return (
            <li key={rule.id} className={`flex items-start gap-2 text-caption ${on ? 'font-bold text-[#14602F]' : 'text-mute'}`}>
              <span className="mt-px flex size-4 shrink-0 items-center justify-center" aria-hidden="true">
                {on ? <CheckIcon size={16} strokeWidth={3} color="#1B7A43" roundJoin={false} /> : <span className="size-3 rounded-full border-2 border-[#6A7983]" />}
              </span>
              <span>
                {rule.label}
                <span className="sr-only">{on ? ': met' : ': not met'}</span>
              </span>
            </li>
          )
        })}
      </ul>
      <p role="status" className="sr-only">
        {announcement}
      </p>
    </div>
  )
}
