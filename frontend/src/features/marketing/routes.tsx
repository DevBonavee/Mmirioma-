import type { RouteObject } from 'react-router-dom'
import { AboutPage } from './AboutPage'
import { ContactPage } from './ContactPage'
import { FaqPage } from './FaqPage'
import { Landing } from './Landing'
import { PrivacyPage, TermsPage } from './LegalPages'

/**
 * Public pages from design/MmiriOma-landing-handoff. No shell and no sign-in
 * guard: anyone can open them, signed in or not.
 */
export const marketingRoutes: RouteObject[] = [
  { path: '/', element: <Landing /> },
  { path: '/about', element: <AboutPage /> },
  { path: '/faq', element: <FaqPage /> },
  { path: '/contact', element: <ContactPage /> },
  { path: '/terms', element: <TermsPage /> },
  { path: '/privacy', element: <PrivacyPage /> },
]
