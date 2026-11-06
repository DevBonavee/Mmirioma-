import { useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { BackLink, Footer, MobileShell, ScrollArea, TopBar, TopBarTitle } from '../../../components/layout/MobileShell'
import { LoadingBlock } from '../../../components/layout/StateScreens'
import { Button } from '../../../components/ui/Button'
import { ApiError } from '../../../lib/api/client'
import { formatPhone } from '../../../lib/format/phone'
import { CodeStep, PhoneDisplay, ProblemNotice, SuccessStep } from '../../auth/PhoneCodeParts'
import { sentNow, type SentCode } from '../../auth/phoneCode'
import { SESSION_KEY, useRequestPhoneVerification, useSession, useVerifyPhone } from '../../auth/useSession'

/** The partner home, where "Do this later" and "Continue" go unless the caller names a screen. */
const PARTNER_HOME = '/partner'

/** Where to go afterwards: the screen that sent the partner here, if it is inside the partner app. */
function returnPath(state: unknown): string {
  const from = (state as { from?: unknown } | null)?.from
  return typeof from === 'string' && from.startsWith('/partner') ? from : PARTNER_HOME
}

/**
 * Verify a rider's or driver's phone by SMS code (send a code, enter the
 * code, verified; FR-003). An admin can approve a partner only once the phone
 * is verified (partners.md, decision 9), so the partner home and profile link
 * here while it is not. It is the customer's V1 to V3 flow with partner
 * wording; the code steps are shared. Design:
 * docs/design/partner-phone-verification.md.
 *
 * `location.state.from` names the screen to return to and
 * `location.state.afterSignup` adds "Do this later" (right after sign-up).
 */
export function PartnerVerifyPhone() {
  const navigate = useNavigate()
  const location = useLocation()
  const qc = useQueryClient()
  const back = returnPath(location.state)
  const afterSignup = (location.state as { afterSignup?: boolean } | null)?.afterSignup === true
  const session = useSession()
  const send = useRequestPhoneVerification()
  const check = useVerifyPhone()
  const [sent, setSent] = useState<SentCode | null>(null)
  const [resent, setResent] = useState(false)
  const [alreadyVerified, setAlreadyVerified] = useState(false)

  const user = session.data?.user
  const done = check.isSuccess || alreadyVerified || (user?.phone_verified && !sent)

  function requestCode(isResend: boolean) {
    send.mutate(undefined, {
      onSuccess: (s) => {
        setSent(sentNow(s))
        setResent(isResend)
        check.reset()
      },
      onError: (error) => {
        // "Already verified" is a success; refresh the session so the notice goes away.
        if (error instanceof ApiError && error.code === 'phone_already_verified') {
          setAlreadyVerified(true)
          void qc.invalidateQueries({ queryKey: SESSION_KEY })
        }
      },
    })
  }

  const title = done ? 'Phone verified' : sent ? 'Enter the code' : 'Verify your phone'
  return (
    <MobileShell background="white">
      <TopBar left={<BackLink to={back} />} center={<TopBarTitle>{title}</TopBarTitle>} />
      {!user ? (
        <ScrollArea>
          <LoadingBlock label="Loading your account" />
        </ScrollArea>
      ) : done ? (
        <SuccessStep title="Phone verified" action="Continue" onAction={() => navigate(back, { replace: true })}>
          Admin can now approve you.
        </SuccessStep>
      ) : sent ? (
        <CodeStep
          purpose="account_phone"
          sent={sent}
          intro={
            <p className="m-0 text-sub text-slate">
              We sent it by SMS to <b>{formatPhone(sent.phone)}</b>. It works for 5 minutes.
            </p>
          }
          verify={(code) => check.mutate(code)}
          verifying={check.isPending}
          verifyError={check.error}
          verifySubmittedAt={check.submittedAt}
          resend={() => requestCode(true)}
          resending={send.isPending}
          resendError={send.error}
          resent={resent}
        />
      ) : (
        <>
          <ScrollArea className="gap-3.5">
            <h1 className="m-0 text-[22px] font-extrabold tracking-[-0.4px]">Verify your phone number</h1>
            <p className="m-0 text-sub text-slate">We will send a 6-digit code by SMS to:</p>
            <PhoneDisplay phone={user.phone} />
            <p className="m-0 text-caption text-mute">
              Admin can approve you once your phone is verified. Standard SMS rates may apply.
            </p>
            {send.isError && !alreadyVerified && <ProblemNotice error={send.error} smsNote="Nothing was sent. Try again in a moment." />}
          </ScrollArea>
          <Footer>
            {send.error instanceof ApiError && send.error.code === 'csrf_failed' ? (
              <Button onClick={() => window.location.reload()}>Reload</Button>
            ) : send.error instanceof ApiError && send.error.status === 401 ? (
              <Button onClick={() => navigate('/partner/login', { replace: true })}>Sign in</Button>
            ) : (
              <Button onClick={() => requestCode(false)} loading={send.isPending}>
                {send.isError ? 'Try again' : 'Send code'}
              </Button>
            )}
            {afterSignup && (
              <Button variant="line" onClick={() => navigate(PARTNER_HOME, { replace: true })}>
                Do this later
              </Button>
            )}
          </Footer>
        </>
      )}
    </MobileShell>
  )
}
