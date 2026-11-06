import { Link } from 'react-router-dom'
import { cx } from '../../lib/cx'
import { CONTACT_FORM_ENABLED } from '../../lib/features'
import { formatPhone } from '../../lib/format/phone'
import { WHATSAPP_GREETING, whatsappLink } from '../../lib/whatsapp'
import { CARD_BUTTON } from './buttonStyles'
import { ContactForm } from './ContactForm'
import { CONTACT, CONTACT_DESCRIPTION, CONTACT_TITLE, contactLead } from './content'
import { ArrowRightIcon, MailIcon, PhoneIcon, PinIcon, WhatsAppIcon } from './icons'
import { Kicker, MarketingFooter, MarketingHeader } from './MarketingParts'
import { useSupportContact } from './queries'
import { FloatingActions } from './SiteExtras'
import { useMarketingPage } from './useMarketingPage'

const TEXT_LINK = 'inline-flex min-h-11 items-center gap-1.5 text-[15px] font-bold text-primary no-underline hover:text-primary-dark'
const WHITE_BUTTON = 'bg-white text-ink hover:bg-mk-panel hover:text-ink'

/**
 * Contact us (`/contact`, docs/design/contact.md, #344): the support phone,
 * WhatsApp and email, and a form that sends a message to the team.
 *
 * - The phone and the WhatsApp number come from `useSupportContact`, which
 *   reads `GET /public/contact`, not from a number written into the page
 *   (FR-055). While it loads or fails, the built-in official number shows, so
 *   help is always reachable. The email and the place are the contact block's.
 * - The form (`ContactForm`) shows only while `CONTACT_FORM_ENABLED` is on. Off,
 *   the page is the intro and the contact card, with no placeholder.
 * - One column on a phone, contact card first (a call is the fastest help);
 *   from 960 px the card takes a third and the form the rest.
 * - Nothing on the page says when the team will answer (FR-027).
 */
export function ContactPage() {
  useMarketingPage(CONTACT_TITLE, CONTACT_FORM_ENABLED ? CONTACT_DESCRIPTION.withForm : CONTACT_DESCRIPTION.withoutForm)
  const { phone, whatsapp } = useSupportContact()

  return (
    <div className="mk-page min-w-0 overflow-x-clip bg-white font-marketing text-[16px] leading-normal text-ink">
      <MarketingHeader current="contact" />
      <main>
        <section className="bg-mk-panel">
          <div className="mk-wrap flex flex-col gap-4 py-16">
            <nav aria-label="Breadcrumb" className="text-[14px] text-mute">
              <Link to="/" className="no-underline hover:underline">
                Home
              </Link>{' '}
              <span aria-hidden="true">/</span> Contact
            </nav>
            <Kicker>Contact us</Kicker>
            <h1 className="m-0 font-display text-[clamp(38px,5vw,64px)] leading-[1.02] font-extrabold tracking-[-1.5px] text-ink">
              Contact <span className="text-mk-teal-button">MmiriOma</span>
            </h1>
            <p className="m-0 max-w-[620px] text-[19px] leading-[1.55] text-mk-lead">{contactLead(CONTACT_FORM_ENABLED, whatsapp !== null)}</p>
          </div>
        </section>

        <div className="mk-wrap flex flex-col items-start gap-6 pt-14 pb-[88px]">
          <div
            className={cx(
              'grid w-full grid-cols-1 items-start gap-6',
              CONTACT_FORM_ENABLED ? 'min-[960px]:grid-cols-[minmax(0,1fr)_minmax(0,2fr)]' : 'max-w-[560px]',
            )}
          >
            <section aria-labelledby="contact-talk" className="flex flex-col gap-4 rounded-[20px] bg-ink p-7 text-white">
              <h2 id="contact-talk" className="m-0 font-display text-[22px] font-bold">
                Talk to us
              </h2>
              <div className="flex flex-col gap-2.5">
                <a href={`tel:${phone}`} className={cx(CARD_BUTTON, WHITE_BUTTON)}>
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
                <a href={`mailto:${CONTACT.email}`} className={cx(CARD_BUTTON, WHITE_BUTTON)}>
                  <MailIcon />
                  Email support
                </a>
              </div>
              <p className="m-0 flex items-center gap-2 text-[15px] text-mk-on-navy">
                <PinIcon size={16} className="shrink-0" />
                {CONTACT.place}
              </p>
            </section>
            {CONTACT_FORM_ENABLED && <ContactForm />}
          </div>
          <Link to="/faq" className={TEXT_LINK}>
            Read all answers
            <ArrowRightIcon size={15} />
          </Link>
        </div>
      </main>
      <MarketingFooter variant="short" />
      <FloatingActions />
    </div>
  )
}
