import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { z } from 'zod'
import { AlertCircleIcon } from '../../../components/icons/icons'
import { AuthLayout } from '../../../components/layout/AuthLayout'
import { Button } from '../../../components/ui/Button'
import { InstallCard } from '../../pwa/InstallParts'
import { ScreenHeading } from '../../../components/ui/Content'
import { TextField } from '../../../components/ui/Field'
import { Notice } from '../../../components/ui/Notice'
import { ApiError } from '../../../lib/api/client'
import { errorMessage } from '../../../lib/api/errorMessage'
import { phoneField, retryAfterSeconds } from '../../../lib/forms'
import { HOME_PATH } from '../../auth/authPaths'
import { useLogin } from '../../auth/useSession'

const schema = z.object({ phone: phoneField, password: z.string().min(1, 'Enter your password.') })
type Values = z.infer<typeof schema>

/**
 * Sign in for Keke riders and tanker drivers (`r-login`). One login for both;
 * the account's vehicle type decides which app opens (decision 9).
 */
export function PartnerLogin() {
  const navigate = useNavigate()
  const location = useLocation()
  const from = (location.state as { from?: string } | null)?.from
  const login = useLogin()
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<Values>({ resolver: zodResolver(schema) })

  const onSubmit = handleSubmit((v) =>
    login.mutate(v, {
      onSuccess: (s) => navigate(from && s.user.role === 'driver' ? from : HOME_PATH[s.user.role], { replace: true }),
    }),
  )

  const wait = retryAfterSeconds(login.error)
  const message =
    wait !== null
      ? `Too many tries. Wait ${Math.max(1, Math.ceil(wait / 60))} minutes, then try again.`
      : login.error instanceof ApiError && login.error.code === 'invalid_credentials'
        ? 'That phone number or password is not right.'
        : errorMessage(login.error)

  return (
    <AuthLayout audience="partner">
      <ScreenHeading className="rise-3" title="Welcome back" sub="Sign in to your rider or driver account." />
      <form onSubmit={onSubmit} noValidate className="flex flex-col gap-3.5">
        {login.isError && <Notice tone="error">{message}</Notice>}
        <TextField
          className="rise-3"
          label="Phone number"
          type="tel"
          inputMode="tel"
          autoComplete="tel"
          placeholder="0803 000 0000"
          error={errors.phone?.message}
          {...register('phone')}
        />
        <div className="rise-4">
          <TextField
            label="Password"
            type="password"
            autoComplete="current-password"
            placeholder="Your password"
            error={errors.password?.message}
            {...register('password')}
          />
          <div className="mt-2 text-right">
            <Link to="/partner/forgot-password" className="text-[13px] font-bold text-primary no-underline hover:text-primary-dark">
              Forgot password?
            </Link>
          </div>
        </div>
        <Button type="submit" className="rise-4" loading={login.isPending}>
          Log in
        </Button>
      </form>
      <div className="rise-5 flex items-start gap-2.5 rounded-icon bg-sky p-3 text-caption text-[#0B3A75]">
        <AlertCircleIcon size={18} color="#1570D8" roundJoin={false} className="shrink-0" />
        <span>
          MmiriOma checks every vehicle before it gets orders. New here?{' '}
          <Link to="/partner/signup" className="font-bold text-primary no-underline hover:text-primary-dark">
            Create a rider or driver account
          </Link>
        </span>
      </div>
      <InstallCard app="partner" className="rise-5" />
    </AuthLayout>
  )
}
