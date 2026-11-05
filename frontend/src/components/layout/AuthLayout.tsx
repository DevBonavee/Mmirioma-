import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import SignupHeroMedia from '../auth/SignupHeroMedia'
import { HomeLogo } from '../brand/HomeLogo'
import { Illustration } from '../brand/Illustration'
import { Logo } from '../brand/Logo'
import { BackLink, MobileShell } from './MobileShell'

/**
 * Full-width public account pages. The brand story and form share a desktop row;
 * smaller screens stack them and use document scrolling, including long forms.
 * Only the inputs have a readable line length, never the surrounding page.
 */
export function AuthLayout({ children, audience = 'customer', backTo }: {
  children: ReactNode
  /** Selects the existing customer or rider/driver artwork and account links. */
  audience?: 'customer' | 'partner'
  /** Optional route for the existing back action. */
  backTo?: string | -1
}) {
  const partner = audience === 'partner'
  return (
    <MobileShell background="white" className="mo-auth">
      <header className="mo-auth-header">
        <div className="flex min-w-0 items-center gap-3">
          {backTo && <BackLink to={backTo} />}
          <HomeLogo><Logo height={30} alt="" /></HomeLogo>
        </div>
        <Link className="mo-auth-switch" to={partner ? '/signin' : '/partner/login'}>
          {partner ? 'Customer sign in' : 'Rider / driver sign in'}
        </Link>
      </header>
      <div className="mo-auth-grid">
        {!partner && (
          // Customer pages: the water-supply video with its animated copy. 42vh above the form
          // below 1024 px, the whole left half from 1024 px (the story box sets that height).
          <aside className="mo-auth-hero mo-auth-video" data-audience={audience} aria-label="Water delivery with MmiriOma">
            <div className="mo-auth-story">
              <SignupHeroMedia className="h-[42vh] lg:h-full" />
            </div>
          </aside>
        )}
        {partner && (
        <aside className="mo-auth-hero" data-audience={audience} aria-label="Deliver with MmiriOma">
          <div className="mo-auth-story">
            <img
              src="/marketing/auth-water-hands.jpg"
              className="mo-auth-water"
              width={1600}
              height={1066}
              alt=""
              fetchPriority="high"
              decoding="async"
            />
            <div className="mo-auth-shade" />
            <div className="mo-auth-copy">
              <p className="mo-auth-eyebrow">{partner ? 'Rider and driver app' : 'MmiriOma water delivery'}</p>
              <h2>{partner ? <>Deliver water.<br />Move Enugu forward.</> : <>Water at your gate,<br />without the stress.</>}</h2>
              <p>{partner ? 'For keke riders and tanker drivers in Enugu. Sign in or create an account to manage orders, follow delivery steps and keep track of your cash records.' : 'Order water and track your delivery, all in one place.'}</p>
            </div>
            {partner && <div className="mo-auth-fleet">
              <figure>
                <Illustration name="keke-rider" className="mo-auth-fleet-keke" width={1536} height={1024} />
                <figcaption>Keke riders</figcaption>
              </figure>
              <figure>
                <Illustration name="tanker" className="mo-auth-fleet-tanker" width={751} height={357} />
                <figcaption>Tanker drivers</figcaption>
              </figure>
            </div>}
          </div>
        </aside>
        )}
        <main className="mo-auth-main">
          <div className="mo-auth-form">{children}</div>
        </main>
      </div>
    </MobileShell>
  )
}
