# 2026-11-02: Rider app has no way to verify the phone, so approval is blocked

- **Area:** frontend
- **Author:** nnamdi-security + agent
- **Symptom:** A new rider signs up, shows "Waiting for approval", and the admin's
  "Approve rider" fails with "The partner must verify their phone before you
  can approve them." (`partner_phone_not_verified`, 409). The rider app offers
  no button or link to verify the phone.
- **Cause:** Decision 9 of `docs/api/partners.md` requires a verified phone
  before approval and lets drivers use the SMS code endpoints, but only the
  customer app has the screens (`/verify-phone`). The partner app never got
  them. `docs/features/phone-verification.md` still said driver phones are not
  verified by SMS.
- **Fix / workaround:** Design proposal in
  `docs/design/partner-phone-verification.md` (approved, G2, 2026-11-02; the screens are not built yet).
  Until it is built, the technical lead can set `users.phone_verified_at` by
  hand for a partner they have confirmed in person (`UPDATE users SET
  phone_verified_at = now() WHERE phone = '<phone>' AND role = 'driver';`).
  This leaves no audit row.
- **Status:** resolved (screen built in `feat/partner-phone-verification`; the SQL workaround is no longer needed once that is deployed)
- **Refs:** `backend/app/modules/partners/directory.py` (approval check),
  `frontend/src/features/customer/routes.tsx` (only `/verify-phone`).
