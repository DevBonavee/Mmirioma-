import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
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
        <aside className="mo-auth-hero" data-audience={audience} aria-label={partner ? 'Deliver with MmiriOma' : 'Water delivery with MmiriOma'}>
          <div className="mo-auth-story">
            <Illustration name="drop-hero" className="mo-auth-water" />
            <div className="mo-auth-shade" />
            {partner && <Illustration name="keke" className="mo-auth-vehicle" />}
            <div className="mo-auth-copy">
              <p className="mo-auth-eyebrow">{partner ? 'Rider and driver app' : 'MmiriOma water delivery'}</p>
              <h2>{partner ? <>Deliver water,<br />earn every day.</> : <>Water at your gate,<br />without the stress.</>}</h2>
              <p>{partner ? 'Ride a keke or drive a tanker, and earn on every delivery.' : 'Order water and track your delivery, all in one place.'}</p>
            </div>
          </div>
        </aside>
        <main className="mo-auth-main">
          <div className="mo-auth-form">{children}</div>
        </main>
      </div>
    </MobileShell>
  )
}
