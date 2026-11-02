# Rider and driver phone verification design

<!-- Workflow: docs/process/ui-driven-development.md. Fork gates: CLAUDE.md,
"Team workflow". -->

Issue: to be opened (see [Open questions](#open-questions)) · Requirements:
FR-003, FR-002, NFR-020, NFR-021, NFR-022 · Contract:
[auth.md](../api/auth.md#phone-verification-fr-003-fr-004) (agreed, G3) and
[partners.md](../api/partners.md) (decision 9, `phone_verified`,
`partner_phone_not_verified`)
Designer: @nnamdi-security + Claude Code · Reviewed by: @Cloudcrackamara
(not the author), 2026-11-02 · Status: approved (G2)

**Approved (G2)** by @Cloudcrackamara on 2026-11-02, reviewed against the
agreed contracts ([auth.md](../api/auth.md#phone-verification-fr-003-fr-004),
[partners.md](../api/partners.md) decision 9) and the approved customer design
it reuses. This covers the two new wording lines. Build only after the issue in
[Open questions](#open-questions) exists.

## Problem

A rider or driver who signs up in the partner app is created with
`phone_verified: false`. An admin can approve a partner only when the phone is
verified (`partner_phone_not_verified`, 409, decision 9 of `partners.md`,
@chidimmamogbo, 2026-10-26). The SMS code endpoints already accept drivers, but
the partner app has no screen, banner or link that reaches them: `/verify-phone`
exists only in the customer app. A new partner therefore waits for approval
that an admin cannot give, and nothing tells either of them why. Found in
production on 2026-11-02.

## Proposal

Reuse the approved customer screens V1 to V3
([phone-verification.md](phone-verification.md)) for partners. Nothing about
the code flow changes; only where it is reached from.

| Place | Route | Reuses |
| --- | --- | --- |
| Verify phone (send a code, enter the code, verified) | `/partner/verify-phone` (steps of one screen) | V1, V2, V3, with partner wording ("admin can approve you once your phone is verified") |
| After sign-up | `/partner/signup` goes to `/partner/verify-phone`; "Do this later" goes to the partner home | E1 |
| Not verified notice | Partner home (rider and driver), above the "Waiting for approval" notice | E2, same text and behaviour as the customer banner |
| Not verified row | Partner profile, a "Verify" row while unverified | E4 |

When verified, the notice and the row disappear. "Waiting for approval" keeps
its text. V3's Continue returns to the partner home.

States are exactly those of V1, V2 and V3 in the customer design (default,
sending, too many codes, too many attempts, SMS failed, no connection,
security check failed, session ended, already verified shown as V3, wrong code
with tries left, expired, countdown, new code sent, resend refused). The
"SMS failed" state also covers the delivery check added in #303: a code that
the network reports as not delivered shows "The code did not reach your
phone." with "Send a new code".

New wording for the reviewer to check (not in the customer design):

- Notice: "Verify your phone number so admin can approve you."
- V3 for partners: "Phone verified. Admin can now approve you."

## Screen-to-endpoint table

| Screen | Element / action | Endpoint | Fields used |
| --- | --- | --- | --- |
| Verify phone | Send code, "Send a new code" | `POST /auth/phone-verification` | as V1 in the customer design |
| Verify phone | Verify | `POST /auth/phone-verification/verify` | as V2 |
| Verify phone | Delivery check | `GET /auth/phone-verification/status` | `delivery_status` |
| Partner home, profile | Notice, row | `GET /driver/profile` | `phone_verified` |
| Partner home, profile | After verifying | `GET /auth/me` | `user.phone_verified` |

Every row maps to the agreed contracts; no contract change is needed.

## Decisions

1. **Reuse, do not redesign.** The customer's `CodeStep` and the
   verification hooks already live in `frontend/src/features/auth/`, shared by
   design, so the partner app imports them.
2. **The notice is not dismissible while unverified**, as in E2, because
   approval depends on it.
3. **Admin side unchanged.** The existing "The partner must verify their phone
   before you can approve them." message stays; the admin can tell the partner
   to open the app.

## Open questions

1. **Issue.** The linking-plan lane owner should open the issue (Linking MVP
   milestone) so the branch can be named `feat/<issue>-partner-phone-verification`.
2. **Should an admin be able to mark a partner's phone verified by hand?** Not
   proposed here, because it would skip proof of ownership (FR-003). Until the
   screen exists, the technical lead can set `phone_verified_at` on a partner
   they have confirmed in person.

## Changes to the design system

None.
