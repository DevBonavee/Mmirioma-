import { ButtonLink } from '../../../components/ui/Button'
import { Notice } from '../../../components/ui/Notice'
import { useSession } from '../../auth/useSession'

/**
 * "Verify your phone number so admin can approve you." with a "Verify phone"
 * button, shown on the rider and driver home while the signed-in partner's
 * phone is not verified (`GET /auth/me` `user.phone_verified`). An admin can
 * approve a partner only after that (partners.md, decision 9), so the notice
 * has no close button, like the customer's banner. Design:
 * docs/design/partner-phone-verification.md.
 *
 * @param from - The partner screen to come back to after verifying.
 */
export function VerifyPhoneNotice({ from, className }: { from: string; className?: string }) {
  const session = useSession()
  if (!session.data || session.data.user.phone_verified) return null
  return (
    <Notice className={className}>
      Verify your phone number so admin can approve you.
      <span className="mt-2 block">
        <ButtonLink to="/partner/verify-phone" state={{ from }} size="sm" block={false}>
          Verify phone
        </ButtonLink>
      </span>
    </Notice>
  )
}
