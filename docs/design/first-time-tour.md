# First-time customer and partner tour

Status: implementation authorized by the owner on 4 November 2026. The owner
explicitly answered "Implement now under my owner authorization" to the G2
override question. No team-reviewer approval is asserted by this document.

## Purpose and references

A short, optional welcome tour explains the existing customer and partner
workflows after successful registration. It does not place an order, change
availability, approve a partner, submit evidence or request permissions.

Sources: `docs/design/design-system.md`, `docs/features/customer-app.md`,
`docs/features/partner-app.md`, `docs/design/phone-verification.md`,
`docs/design/partner-phone-verification.md`, and the actual signup pages:
`frontend/src/features/customer/pages/SignUp.tsx` and
`frontend/src/features/partner/pages/PartnerSignup.tsx`.

Requirements explained: FR-003 (phone verification), FR-010 (coverage),
FR-020 through FR-025 (order details, quantities, quote and window), FR-030
through FR-035 (assignment, pickup and delivery proof), FR-037 (status rather
than live vehicle tracking), NFR-020 and NFR-021 (accessible, responsive UI).
Normative business rules remain in `MmiriOma_MVP_SRS.md`.

## Entry, dismissal and replay

1. Only a successful customer or partner registration marks this browser's
   account as eligible. An ordinary login must not treat an existing account
   as newly registered. Failed registration sets no marker.
2. Keep the existing phone-verification destination and behavior. Offer the
   tour on the next customer home (`/home`) or the appropriate partner home
   (`/partner/rider` or `/partner/driver`), after verification or its existing
   "Do this later" action. An unverified account keeps its verification notice.
3. Defer the automatic tour while an active or assigned delivery needs an
   action. Do not hide delivery alerts, show it during an order or trip, or
   compete with an existing modal. Existing accounts get replay only.
4. Show a welcome choice: "A quick look around" / "See how MmiriOma works in
   a few simple steps." Buttons: "Show me around" and "Maybe later".
5. Each step has Back, Next and "Skip tour". The final button is
   "Finish tour". Escape behaves like Skip; no countdown or forced animation.
   Finishing or dismissing closes the guide and leaves the current page intact.
6. Replay from "Take a quick tour" in the customer menu and partner profile.
   Replay starts at the welcome step without changing a saved completion. If
   the account still has a pending automatic welcome, completing or dismissing
   this replay consumes it, preventing an immediate repeat on the home screen.

## Customer steps

| Step | Heading | Explanation |
| --- | --- | --- |
| 1 | Start with your address | Save your delivery address and instructions. Orders are available only in active service areas. Verify your phone before your first order. |
| 2 | Choose your delivery | Choose Keke or Tanker, then container or tank size and quantity. Larger requests may need assistance. |
| 3 | Check before you order | Review the total price and delivery details. Pay cash after unloading; the office calls to agree the time. With no price yet, send a request for assistance. |
| 4 | Follow your delivery | Open My orders for progress updates. After unloading, give the rider or driver your delivery code. Never share it before unloading is complete. |

## Partner steps

The heading says "rider" for Keke and "driver" for tanker. Guidance uses the
account's actual vehicle type, without invented capacities or earnings.

| Step | Heading | Explanation |
| --- | --- | --- |
| 1 | Get ready for review | Verify your phone and provide your vehicle details and papers. You can take orders after the team approves your account and vehicle. |
| 2 | Go online when ready | Once approved, use the online switch to become available. Review the quantity and route shown for a job before accepting. |
| 3 | Collect the full order | Follow the job to its refill station and record pickup using the existing checklist. Follow the vehicle's verified load limit. |
| 4 | Finish with the delivery code | Record arrival and complete unloading first. Then send and verify the customer's delivery code to complete the job. |
| 5 | Find your trip records | Check delivery history and My cash. Use Support when you need help with a job. Earnings are mentioned only if the existing partner-pay flag is enabled. |

## Visual and interaction specification

- Reuse approved Noto Sans, blue primary, navy ink, pale-blue surfaces, spacing,
  corner radii and inline icons. No stock photos or generated mock interfaces
  inside the tour. Use a small diagram of the current step and plain text.
- Welcome: a restrained blue panel with the brand name, role label,
  clear heading and the two actions. Steps: numbered progress, one heading,
  one short explanation and a small role-specific diagram. No confetti.
- Mobile: a dialog within 16 px viewport margins, full-width actions, safe-area
  padding and internally scrolling body when needed. Tablet/desktop: centered
  panel up to 720 px, diagram and copy side by side where space allows.
- Reserve action/footer space. Keep buttons at least 48 px high; body copy
  at least 16 px. No clipped controls at 320 px or 200% text zoom.
- Use dialog semantics, labelled heading, focus entry and restoration, a focus
  trap and background inertness. Escape dismisses; visible progress is also
  announced in words. Focus the step heading on navigation. Respect reduced
  motion; no automatic advance or backdrop-only dismissal.
- Do not anchor tooltips to elements that may be absent or below the fold.
  The tour explains the workflow without navigating through or submitting it.

## Persistence and contracts

Storage: a versioned per-account, per-role browser marker with only
`pending` or `dismissed`/`completed`; no phone, name, address, token or job data.
Handle blocked storage without throwing; the current tab can keep in-memory
state. Never copy a marker to another account. Completion is browser-local,
not synchronized across devices. Do not infer registration from missing data.

No new endpoint, database field or API contract is required. Reuse the existing
agreed session/registration contracts in `docs/api/auth.md` and
`docs/api/partners.md`. Do not modify their request or response bodies.

## Acceptance checks

- New customer and each partner vehicle type see the correct tour after their
  existing verification flow, including "Do this later".
- Existing login and failed signup never trigger it. Reload, completion,
  dismissal, replay, logout/account switch and blocked storage behave as above.
- Active delivery and assigned-order dialogs take priority.
- Back/Next/Skip/Finish, keyboard trap, Escape, focus restoration, reduced
  motion, 200% zoom and mobile/tablet/desktop layouts are verified.
- No real customer information in captures; no extra API writes, network
  analytics, permissions or changed order/job transitions.

## Implementation gate

`CLAUDE.md` explicitly requires G2 and G3 before a new frontend UI component.
The owner explicitly authorized proceeding with this design and overriding
the design gate on 4 November 2026. The approved API contracts above are reused,
with no new backend behavior. The implementation follows the current pilot
screens: pay on delivery, delivery time agreed by phone, and partner pay hidden.
