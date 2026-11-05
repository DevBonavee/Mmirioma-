import type { User } from '../../lib/api/auth'

type Account = Pick<User, 'id' | 'role'>
type TourStatus = 'pending' | 'dismissed' | 'completed'
const EVENT = 'mmirioma-tour-changed'
const PREFIX = 'mmirioma:tour:v1:'
const memory = new Map<string, TourStatus>()
const keyFor = (user: Account) => `${PREFIX}${user.role}:${user.id}`

/** Read only this account's versioned marker; blocked storage falls back to this tab. */
export function tourStatus(user: Account | undefined): TourStatus | null {
  if (!user || user.role === 'admin') return null
  const key = keyFor(user)
  // A failed write leaves the old persisted value intact. This tab's latest
  // action must win, or an old `pending` value can make dismissal impossible.
  const fallback = memory.get(key)
  if (fallback) return fallback
  try {
    const value = localStorage.getItem(key)
    return value === 'pending' || value === 'dismissed' || value === 'completed' ? value : null
  } catch {
    return null
  }
}

/** Store a non-sensitive marker only. No account profile, credentials or job data is saved. */
export function saveTourStatus(user: Account, status: TourStatus) {
  if (user.role === 'admin') return
  const key = keyFor(user)
  try {
    localStorage.setItem(key, status)
    memory.delete(key)
  } catch {
    // A disabled/full store must not block signup or the guide.
    memory.set(key, status)
  }
  window.dispatchEvent(new Event(EVENT))
}

/** Subscribe to changes in this tab and other tabs without polling or network requests. */
export function subscribeTour(listener: () => void) {
  function onStorage(event: StorageEvent) {
    if (event.key !== null && !event.key.startsWith(PREFIX)) return
    // A later preference from another tab supersedes any local write fallback.
    if (event.key === null) memory.clear()
    else memory.delete(event.key)
    listener()
  }
  window.addEventListener(EVENT, listener)
  window.addEventListener('storage', onStorage)
  return () => {
    window.removeEventListener(EVENT, listener)
    window.removeEventListener('storage', onStorage)
  }
}
