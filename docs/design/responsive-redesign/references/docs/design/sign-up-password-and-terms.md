# Sign-up: phone check, confirm password, password checklist, 18+ and Terms box

<!-- Workflow: docs/process/ui-driven-development.md. Fork gates: CLAUDE.md,
"Team workflow". -->

Issue: [#336](https://github.com/mmiri-oma/mmirioma/issues/336) · Requirements:
NFR-001, NFR-012, NFR-020, NFR-021, NFR-022 · Contract:
[auth.md](../api/auth.md#password-rule-and-recorded-acceptance-332) (agreed, G3,
#332) and [partners.md](../api/partners.md#post-authpartner-register) · Amends:
[authentication.md](authentication.md), screen C2, and the rider and driver sign-up
form (`PartnerSignup.tsx`)
Designer: @chidimmamogbo + Claude Code · Reviewed by: @nnamdi-security
(2026-11-03) · Status: approved

**Approved (G2) on 2026-11-03 by @nnamdi-security, who is not the author**, with
the decisions under "Review decisions".

This changes the customer sign-up form (`/signup`) and the rider and driver sign-up
form (`/partner/signup`), which behave the same. Everything not listed here stays as
it is: the fields already on each form, the heading, the links and the phone-number
hint.

## Design link

No clickable preview. The layout below is a text sketch, built only from components
already in the [design system](design-system.md), so the review is of the states and
wording. Ask for a preview if the reviewer wants one before approving.

## Screens and states

Phone width, showing the part of the form that changes. Fields above **Password** on
each form stay in place.

```text
 Phone number
 [ 0803 123 4567                 ]
 We send delivery codes to this number.

 Password
 [ ••••••••                      ]
 Your password needs:
   ✓ At least 8 characters
   ✓ An uppercase letter
   ○ A number
   ○ A symbol, such as ! @ _ or ₦

 Confirm password
 [ ••••••••                      ]

 [ ] I am 18 or older and agree to the Terms of Service and
     Privacy Notice.

 [ Create account                ]   disabled until the four rules are met
```

"Terms of Service" and "Privacy Notice" are links that open `/terms` and `/privacy` in a
new tab, so what the person typed stays on the form.

### Checklist

| State | What shows |
| --- | --- |
| Rule not met | Empty circle icon, normal text colour, the rule's text |
| Rule met | Check icon, green text (`success` token) with the same text. The icon means it does not rely on colour alone |
| Nothing typed | All four not met. No error is shown yet |
| Over 128 characters | The four items can all be met, so the field also shows the error "Use 128 characters or fewer." and the button stays off |

For screen readers, each item reads as "met" or "not met" after its text, using
visually hidden words. One polite live region announces the summary after typing
pauses, for example "2 of 4 password rules met", so each keystroke does not interrupt.

### Form states

| State | What happens | Text |
| --- | --- | --- |
| Default | Empty form, box not ticked, button off | |
| Phone not valid | Error under the field when the person leaves it, and on submit. Same check as today (`phoneField`) | "Enter a Nigerian mobile number, for example 0803 123 4567." |
| Password rules not all met | Button off. The checklist explains why, so no separate error | |
| Rules met, passwords differ | Button on. Error under Confirm password on submit, and when the person leaves that field | "The passwords do not match." |
| Rules met, box not ticked | Button on. Error under the box on submit; the box gets the error border | "Tick the box to confirm you are 18 or older and agree." |
| Submitting | As today: spinner, "Creating account", fields locked | |
| 422 on `password` | Server message under Password. Both password fields clear | The server's message |
| 422 on `accepted_terms` | Server message under the box | The server's message |
| 422 on another field | Under that field; on the partner form, anything with no field goes in the top notice, as today | The server's message |
| 409 `phone_already_registered` | Under Phone number, as today. Both password fields clear | "This number already has an account. Sign in instead." |
| 429 `too_many_attempts` | Top notice with the wait, as today. Both password fields clear | As today |
| No connection | Top notice, as today. Both password fields clear | As today |
| Success | As today: `/verify-phone` for customers, `/partner/verify-phone` for partners | |

After any failed attempt the phone number and name stay (NFR-012) and the box stays
ticked: the person already ticked it for this same form.

### What goes away

- The customer form's line "By signing up you agree to our Terms and Privacy Notice."
  The box replaces it, and a line saying agreement is implied would contradict it.
- The password placeholder "At least 8 characters", because the checklist says it.

### Sizes

The form keeps its single column at 360, 768, 1280 and 1920 px, inside the existing
`MobileShell`. The whole box row is the tap target, at least 48 px tall. A long
checklist line wraps under its text, not under its icon.

## Screen-to-endpoint table

| Screen | Element / action | Endpoint | Fields used |
| --- | --- | --- | --- |
| `/signup` | Create account | `POST /auth/register` | `name`, `phone`, `password`, `accepted_terms`; errors `validation_error`, `phone_already_registered`, `too_many_attempts` |
| `/partner/signup` | Create account | `POST /auth/partner-register` | The fields above plus the partner fields; same errors |

`accepted_terms` is sent as `true` only because the person ticked the box. Confirm
password goes no further than the screen. No row needs a contract change.

## Decisions

1. **The button is off only until the four rules are met.** The issue asks for it to
   stay off "until all pass" and also for a mismatch and a missing tick to show
   messages. A button that stays off for every reason cannot show those messages, so
   those two are caught when the person taps it.
2. **One box for the three statements**, with the wording from #336. It matches what
   the contract records.
3. **Same rule text in both places.** The checklist is driven by the same check the
   mocks use (`lib/format/password.ts`), which matches the server's rule.
4. **Change password is not in this design.** That screen keeps its error message
   from `newPasswordField`, with no checklist, as #336's scope covers only the
   sign-up forms.

5. **The box uses the pages' own names.** #336 says "Terms of Use" and "Privacy
   Policy", but the pages call themselves "Terms of Service" and "Privacy Notice".
   Decided by @chidimmamogbo on 2026-11-03, so a person ticks a box for the document
   they then open. The server's message changes the same way in the #332 build PR.

## Open questions

None.

## Review decisions

Recommendations by @nnamdi-security, 2026-11-03, approved with the design:

1. **Button off until the four rules are met; mismatch and missing tick caught on
   tap:** agreed. An always-disabled button cannot explain itself, and the
   checklist already says why it is off.
2. **One box for the three statements:** agreed. The tick is the person's own
   act; the form never sends `accepted_terms: true` without it, including after
   a failed attempt (the person ticked it for this same form).
3. **Same rule text in both places:** agreed, and `lib/format/password.ts` must
   keep matching the server's check (`password_problem`, #332). A test compares
   them on the same examples.
4. **Change password is not in this design:** agreed, as the issue's scope
   covers only the sign-up forms.
5. **Page names in the box, "Terms of Service" and "Privacy Notice":** agreed.
   They are what the pages call themselves, and #332's build changes the
   contract's refusal message to match (recorded in `auth.md`).
6. **Condition:** this design merges before the build, but the build merges back
   to back with #332 (the agreed rollout), because sign-up is refused until the
   box exists. No deploy or promotion to `main` happens between the two.

## Changes to the design system

- **New component: a checkbox row.** The design system already specifies it (48 px
  row, 24 px native control, `accent-color: primary`, error border), but
  `frontend/src/components/ui/` has no such component yet. It is built to that
  specification, with nothing new.
- **New pattern: the checklist**, built from existing tokens and `lucide-react` icons.
