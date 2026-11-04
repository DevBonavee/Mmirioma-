import { zodResolver } from '@hookform/resolvers/zod'
import { useForm, useWatch } from 'react-hook-form'
import { Link, useNavigate } from 'react-router-dom'
import { z } from 'zod'
import { Logo } from '../../../components/brand/Logo'
import { BackLink, MobileShell, ScrollArea, TopBar } from '../../../components/layout/MobileShell'
import { Button } from '../../../components/ui/Button'
import { ScreenHeading } from '../../../components/ui/Content'
import { PageTabs } from '../../../components/ui/Controls'
import { TextField } from '../../../components/ui/Field'
import { Notice } from '../../../components/ui/Notice'
import { ApiError } from '../../../lib/api/client'
import { errorMessage } from '../../../lib/api/errorMessage'
import { passwordProblem } from '../../../lib/format/password'
import { applyServerFieldErrors, passwordsMatch, phoneField, retryAfterSeconds, signUpSecurityFields } from '../../../lib/forms'
import { SignUpSecurityFields } from '../../auth/SignUpSecurityFields'
import { useRegister } from '../../auth/useSession'

const schema = z
  .object({
    name: z.string().trim().min(1, 'Enter your full name.').max(100, 'Use 100 characters or fewer.'),
    phone: phoneField,
    ...signUpSecurityFields,
  })
  .refine(passwordsMatch.check, passwordsMatch.options)
type Values = z.infer<typeof schema>

/**
 * Create a customer account (`c-signup`): name, phone, password, its confirmation
 * and the 18+ and Terms box (docs/design/sign-up-password-and-terms.md).
 * Google sign-up and the email field are removed (decision 6). A new account
 * goes straight to verifying its phone by SMS code, with "Do this later"
 * (FR-003; docs/design/phone-verification.md, which supersedes decision 7).
 */
export function SignUp() {
  const navigate = useNavigate()
  const registerMutation = useRegister()
  const {
    register,
    handleSubmit,
    setError,
    setValue,
    trigger,
    control,
    formState: { errors },
  } = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: { password: '', confirm_password: '', accepted_terms: false },
  })
  const password = useWatch({ control, name: 'password' })

  // The confirmation stays on the screen; only the person's own tick is sent.
  const onSubmit = handleSubmit(({ name, phone, password, accepted_terms }) =>
    registerMutation.mutate(
      { name, phone, password, accepted_terms },
      {
        onSuccess: () => navigate('/verify-phone', { replace: true, state: { afterSignup: true, from: '/home' } }),
        onError: (error) => {
          // NFR-012: the name, phone and tick stay; the passwords do not.
          setValue('password', '')
          setValue('confirm_password', '')
          if (error instanceof ApiError && error.code === 'phone_already_registered') {
            setError('phone', { message: 'This number already has an account. Sign in instead.' })
          } else {
            applyServerFieldErrors(error, setError, { name: 'name', phone: 'phone', password: 'password', accepted_terms: 'accepted_terms' })
          }
        },
      },
    ),
  )

  const err = registerMutation.error
  const fieldLevel = err instanceof ApiError && (err.code === 'phone_already_registered' || err.code === 'validation_error')
  const wait = retryAfterSeconds(err)

  return (
    <MobileShell background="white">
      <TopBar className="border-b-0" left={<BackLink to="/signin" />} />
      <ScrollArea className="gap-3.5 px-[22px] pt-2 pb-[22px]">
        <div className="rise-1 flex items-center gap-3.5">
          <Logo variant="mark" height={75} alt="" className="animate-float" />
          <ScreenHeading title="Create your account" sub="It takes less than a minute." />
        </div>
        <div className="rise-2">
          <PageTabs
            variant="blue"
            label="Account"
            tabs={[
              { to: '/signin', label: 'Sign in', current: false },
              { to: '/signup', label: 'Create account', current: true },
            ]}
          />
        </div>
        <form onSubmit={onSubmit} noValidate className="flex flex-col gap-3.5">
          {registerMutation.isError && !fieldLevel && (
            <Notice tone="error">
              {wait !== null ? `Too many tries. Wait ${Math.max(1, Math.ceil(wait / 60))} minutes, then try again.` : errorMessage(err)}
            </Notice>
          )}
          <TextField
            className="rise-3"
            label="Full name"
            autoComplete="name"
            placeholder="e.g. Adaeze Nwosu"
            error={errors.name?.message}
            {...register('name')}
          />
          <TextField
            className="rise-3"
            label="Phone number"
            type="tel"
            inputMode="tel"
            autoComplete="tel"
            placeholder="0803 123 4567"
            hint="We send delivery codes to this number."
            error={errors.phone?.message}
            {...register('phone', {
              onBlur: (event) => {
                if (event.target.value) void trigger('phone')
              },
            })}
          />
          <SignUpSecurityFields
            password={password}
            passwordField={register('password')}
            confirmField={register('confirm_password', {
              onBlur: (event) => {
                if (event.target.value) void trigger('confirm_password')
              },
            })}
            termsField={register('accepted_terms')}
            errors={{ password: errors.password?.message, confirm: errors.confirm_password?.message, terms: errors.accepted_terms?.message }}
          />
          <Button type="submit" className="rise-5" loading={registerMutation.isPending} disabled={passwordProblem(password) !== null}>
            Create account
          </Button>
        </form>
        <p className="m-0 text-center text-[13px] text-slate">
          Register as a driver?{' '}
          <Link to="/partner/signup" className="font-bold text-primary no-underline hover:text-primary-dark">
            Click here
          </Link>
        </p>
      </ScrollArea>
    </MobileShell>
  )
}
