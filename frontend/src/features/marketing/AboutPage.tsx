import { Link } from 'react-router-dom'
import { cx } from '../../lib/cx'
import { formatPhone } from '../../lib/format/phone'
import { WHATSAPP_GREETING, whatsappLink } from '../../lib/whatsapp'
import { OUTLINE_BUTTON, PRIMARY_BUTTON } from './buttonStyles'
import { ABOUT_DESCRIPTION, ABOUT_TITLE, BRAND_LINE, CONTACT, HOW_STEPS, ORDER_CTA } from './content'
import { ArrowRightIcon, DropFilledIcon, MailIcon, PhoneIcon, PinIcon, WhatsAppIcon } from './icons'
import { Kicker, MarketingFooter, MarketingHeader } from './MarketingParts'
import { useSupportContact } from './queries'
import { FloatingActions } from './SiteExtras'
import { useMarketingPage } from './useMarketingPage'

const TEXT_LINK = 'inline-flex min-h-11 items-center gap-1.5 text-[15px] font-bold text-primary no-underline hover:text-primary-dark'
const CONTACT_LINK = 'inline-flex min-h-11 items-center gap-2.5 text-[16px] text-ink no-underline hover:text-primary'

/**
 * About Us (`/about`, docs/design/about.md, #338). A static page: every sentence
 * is one the site already shows, taken from `content.ts`, so nothing here is
 * written new and nothing is invented. The two sections that need the product
 * owner's copy, "Who we are" and a statement of the areas, are left out until
 * that copy is linked on #338. The areas are only linked (`/#areas`), because the
 * landing page's list is the one place to keep up to date (#346).
 *
 * The phone and the WhatsApp number come from `useSupportContact`, which reads
 * `GET /public/contact`, not from a number written into the page (FR-055).
 */
export function AboutPage() {
  useMarketingPage(ABOUT_TITLE, ABOUT_DESCRIPTION)
  const { phone, whatsapp } = useSupportContact()

  return (
    <div className="mk-page min-w-0 overflow-x-clip bg-white font-marketing text-[16px] leading-normal text-ink">
      <MarketingHeader current="about" />
      <main>
        <section className="bg-mk-panel">
          <div className="mk-wrap flex flex-col gap-4 py-16">
            <div className="mx-auto flex w-full max-w-[720px] flex-col gap-4">
              <nav aria-label="Breadcrumb" className="text-[14px] text-mute">
                <Link to="/" className="no-underline hover:underline">
                  Home
                </Link>{' '}
                <span aria-hidden="true">/</span> About us
              </nav>
              <Kicker>About us</Kicker>
              <h1 className="m-0 font-display text-[clamp(38px,5vw,64px)] leading-[1.02] font-extrabold tracking-[-1.5px] text-ink">
                About <span className="text-mk-teal-button">MmiriOma</span>
              </h1>
              <p className="m-0 text-[19px] leading-[1.55] text-mk-lead">{BRAND_LINE}</p>
            </div>
          </div>
        </section>

        <section aria-labelledby="about-how">
          <div className="mk-wrap py-16">
            <div className="mx-auto flex w-full max-w-[720px] flex-col gap-8">
              <div className="flex flex-col gap-2.5">
                <Kicker>How it works</Kicker>
                <h2 id="about-how" className="m-0 font-display text-[26px] font-bold text-ink">
                  How delivery works
                </h2>
              </div>
              <ol className="m-0 grid list-none grid-cols-1 gap-4 p-0 min-[640px]:grid-cols-2">
                {HOW_STEPS.map((step, i) => (
                  <li key={step.title} className="flex flex-col gap-2.5 rounded-[20px] border border-solid border-line bg-white p-6">
                    <span aria-hidden="true" className="inline-flex size-[30px] items-center justify-center rounded-full bg-primary text-[14px] font-bold text-white">
                      {i + 1}
                    </span>
                    <h3 className="m-0 font-display text-[20px] font-bold text-ink">{step.title}</h3>
                    <p className="m-0 text-[15px] leading-[1.6] text-slate">{step.text}</p>
                  </li>
                ))}
              </ol>
            </div>
          </div>
        </section>

        <section aria-labelledby="about-where" className="bg-mk-panel">
          <div className="mk-wrap py-12">
            <div className="mx-auto flex w-full max-w-[720px] flex-col items-start gap-1">
              <h2 id="about-where" className="m-0 font-display text-[26px] font-bold text-ink">
                Where we deliver
              </h2>
              <Link to="/#areas" className={TEXT_LINK}>
                See the areas we serve
                <ArrowRightIcon size={15} />
              </Link>
            </div>
          </div>
        </section>

        <section aria-labelledby="about-contact">
          <div className="mk-wrap py-16">
            <div className="mx-auto flex w-full max-w-[720px] flex-col gap-5">
              <h2 id="about-contact" className="m-0 font-display text-[26px] font-bold text-ink">
                Who to contact
              </h2>
              <div className="flex flex-col gap-1 rounded-[20px] border border-solid border-line bg-white p-6">
                <span className="inline-flex min-h-11 items-center gap-2.5 text-[16px] text-ink">
                  <PinIcon size={18} className="shrink-0 text-primary" />
                  {CONTACT.place}
                </span>
                <a href={`mailto:${CONTACT.email}`} className={CONTACT_LINK}>
                  <MailIcon className="shrink-0 text-primary" />
                  {CONTACT.email}
                </a>
                <a href={`tel:${phone}`} className={CONTACT_LINK}>
                  <PhoneIcon className="shrink-0 text-primary" />
                  {formatPhone(phone)}
                </a>
                {whatsapp && (
                  <a
                    href={whatsappLink(whatsapp, WHATSAPP_GREETING)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={cx(CONTACT_LINK, 'font-bold text-[#178A43] hover:text-[#126E35]')}
                  >
                    <WhatsAppIcon size={18} className="shrink-0" />
                    Chat on WhatsApp
                  </a>
                )}
              </div>
              <Link to="/faq" className={TEXT_LINK}>
                Read all answers
                <ArrowRightIcon size={15} />
              </Link>
            </div>
          </div>
        </section>

        <section>
          <div className="mk-wrap flex flex-wrap items-center justify-center gap-3.5 pb-20">
            <Link to="/order" className={cx(PRIMARY_BUTTON, 'min-h-[54px] px-[28px] text-[16px]')}>
              <DropFilledIcon />
              {ORDER_CTA}
              <ArrowRightIcon />
            </Link>
            {whatsapp && (
              <a
                href={whatsappLink(whatsapp, 'Hello MmiriOma, I have a question before I order.')}
                target="_blank"
                rel="noopener noreferrer"
                className={cx(OUTLINE_BUTTON, 'min-h-[54px] px-[26px] text-[16px]')}
              >
                <WhatsAppIcon size={20} />
                Ask us on WhatsApp
              </a>
            )}
          </div>
        </section>
      </main>
      <MarketingFooter variant="short" />
      <FloatingActions />
    </div>
  )
}
