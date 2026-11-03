/** The name every screen logo link has, for screen readers and tests. */
export const HOME_LOGO_NAME = 'MmiriOma, home'

/**
 * Where a logo goes from a path (docs/design/landing-v1.md, "Logo links").
 *
 * The installed partner app has the scope `/partner/` (`partner.webmanifest`),
 * so a link to `/` from inside it would open outside the app. Its logo goes to
 * the partner home, which sends a signed-in partner to their screen and
 * everyone else to sign-in. Every other screen goes to the public homepage.
 *
 * @param pathname - The current location's path.
 * @returns `/partner/` inside the partner app, otherwise `/`.
 */
export function homeFor(pathname: string): '/' | '/partner/' {
  return pathname === '/partner' || pathname.startsWith('/partner/') ? '/partner/' : '/'
}
