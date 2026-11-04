import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { z } from 'zod'
import { AuthLayout } from '../../../components/layout/AuthLayout'
import { Button } from '../../../components/ui/Button'
import { ScreenHeading } from '../../../components/ui/Content'
import { PageTabs } from '../../../components/ui/Controls'
import { TextField } from '../../../components/ui/Field'
import { Notice } from '../../../components/ui/Notice'
import { ApiError } from '../../../lib/api/client'
import { errorMessage } from '../../../lib/api/errorMessage'
import { phoneField, retryAfterSeconds } from '../../../lib/forms'
import { HOME_PATH } from '../../auth/authPaths'
import { useLogin } from '../../auth/useSession'
import { POINTS_ENABLED } from '../../../lib/features'

const schema = z.object({
  phone: phoneField,
  password: z.string().min(1, 'Enter your password.'),
})
type Values = z.infer<typeof schema>

/** Message for a failed sign-in. Wrong phone and wrong password look the same on purpose (auth.md). */
function signInError(error: unknown): string {
  const wait = retryAfterSeconds(error)
  if (wait !== null) return `Too many tries. Wait ${Math.max(1, Math.ceil(wait / 60))} minutes, then try again.`
  if (error instanceof ApiError && error.code === 'invalid_credentials') return 'That phone number or password is not right.'
  return errorMessage(error)
}

/** Customer sign in (`c-signin`). Phone and password only (decision 6). */
export function SignIn() {
  const navigate = useNavigate()
  const location = useLocation()
  const from = (location.state as { from?: string } | null)?.from
  const login = useLogin()
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<Values>({ resolver: zodResolver(schema) })

  const onSubmit = handleSubmit((values) =>
    login.mutate(values, {
      onSuccess: (session) => navigate(from && session.user.role === 'customer' ? from : HOME_PATH[session.user.role], { replace: true }),
    }),
  )

  return (
    <AuthLayout>
      <ScreenHeading
        className="rise-2"
        titleClassName="text-[26px]"
        title="Sign in to MmiriOma"
        sub={POINTS_ENABLED ? 'Sign in to order, track your delivery and earn points.' : 'Sign in to order and track your delivery.'}
      />
      <div className="rise-3">
        <PageTabs
          label="Account"
          tabs={[
            { to: '/signin', label: 'Sign in', current: true },
            { to: '/signup', label: 'Create account', current: false },
          ]}
        />
      </div>
      <form onSubmit={onSubmit} noValidate className="flex flex-col gap-4">
        {login.isError && <Notice tone="error">{signInError(login.error)}</Notice>}
        <TextField
          className="rise-4"
          label="Phone number"
          type="tel"
          inputMode="tel"
          autoComplete="tel"
          placeholder="0803 123 4567"
          error={errors.phone?.message}
          {...register('phone')}
        />
        <div className="rise-5">
          <TextField
            label="Password"
            type="password"
            autoComplete="current-password"
            placeholder="Your password"
            error={errors.password?.message}
            {...register('password')}
          />
          <div className="mt-2 text-right">
            <Link to="/forgot-password" className="text-[13px] font-bold text-primary no-underline hover:text-primary-dark">
              Forgot password?
            </Link>
          </div>
        </div>
        <Button type="submit" className="rise-5" loading={login.isPending}>
          Sign in
        </Button>
      </form>
      <p className="m-0 text-center text-chip text-mute">
        By continuing you agree to our{' '}
        <Link to="/terms" className="text-mute underline hover:text-ink">
          Terms
        </Link>{' '}
        and{' '}
        <Link to="/privacy" className="text-mute underline hover:text-ink">
          Privacy Notice
        </Link>
        .
      </p>
      <p className="m-0 text-center text-[13px] text-slate">
        Register as a driver?{' '}
        <Link to="/partner/signup" className="font-bold text-primary no-underline hover:text-primary-dark">
          Click here
        </Link>
      </p>
    </AuthLayout>
  )
}
