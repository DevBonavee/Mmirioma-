/** The name every screen logo link has, for screen readers and tests. */
export const HOME_LOGO_NAME = 'MmiriOma, home'

/**
 * Every screen logo opens the public homepage (owner request, 4 November 2026).
 *
 * This supersedes the partner-scope exception. The installed partner app may
 * open the public site outside its `/partner/` scope; its Home navigation and
 * launch URL still open the partner dashboard. Unsaved-order protection remains.
 *
 * @returns The public homepage `/`.
 */
export function homeFor(): '/' {
  return '/'
}
