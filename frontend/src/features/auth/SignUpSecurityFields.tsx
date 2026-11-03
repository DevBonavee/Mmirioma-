import { Link } from 'react-router-dom'
import { CheckboxRow } from '../../components/ui/Choice'
import { TextField } from '../../components/ui/Field'
import { PasswordChecklist } from '../../components/ui/PasswordChecklist'
import { isPasswordTooLong } from '../../lib/format/password'
import type { UseFormRegisterReturn } from 'react-hook-form'

/** A link to a legal page in a new tab, so what the person typed stays on the form. */
function LegalLink({ to, children }: { to: string; children: string }) {
  return (
    <Link to={to} target="_blank" rel="noreferrer" className="font-bold text-primary underline hover:text-primary-dark">
      {children}
      <span className="sr-only"> (opens in a new tab)</span>
    </Link>
  )
}

interface SignUpSecurityFieldsProps {
  /** The password as typed, which drives the checklist. */
  password: string
  /** `register('password')` from the form. */
  passwordField: UseFormRegisterReturn
  /** `register('confirm_password', ...)` from the form. */
  confirmField: UseFormRegisterReturn
  /** `register('accepted_terms')` from the form. */
  termsField: UseFormRegisterReturn
  errors: { password?: string; confirm?: string; terms?: string }
}

/**
 * The password, its confirmation, the rule checklist and the 18+ and Terms box,
 * shared so the customer and partner sign-up forms behave the same
 * (docs/design/sign-up-password-and-terms.md).
 *
 * The box is the person's own act: `accepted_terms` goes to the server only from
 * this tick (docs/api/auth.md, "Recorded acceptance").
 */
export function SignUpSecurityFields({ password, passwordField, confirmField, termsField, errors }: SignUpSecurityFieldsProps) {
  return (
    <>
      <div className="rise-4">
        <TextField
          label="Password"
          type="password"
          autoComplete="new-password"
          error={errors.password ?? (isPasswordTooLong(password) ? 'Use 128 characters or fewer.' : undefined)}
          {...passwordField}
        />
        <PasswordChecklist password={password} />
      </div>
      <TextField className="rise-4" label="Confirm password" type="password" autoComplete="new-password" error={errors.confirm} {...confirmField} />
      <CheckboxRow className="rise-4" error={errors.terms} {...termsField}>
        I am 18 or older and agree to the <LegalLink to="/terms">Terms of Service</LegalLink> and <LegalLink to="/privacy">Privacy Notice</LegalLink>.
      </CheckboxRow>
    </>
  )
}
