# Component inventory: reuse and preservation

All paths below are real project paths retained under `references/` where included. Abbreviated `layout/`, `ui/`, `brand/` and `art/` paths are below `frontend/src/components/`; abbreviated `customer/`, `partner/` and `auth/` paths are below `frontend/src/features/`. Styling uses Tailwind utilities and global `frontend/src/styles/*`; there is no separate customer/driver CSS framework. Do not introduce an AI-provider-specific design system.

## Shells, routing and state

| Existing component / file | Current responsibility | Preserve in later work |
| --- | --- | --- |
| `components/layout/MobileShell.tsx` | MobileShell, TopBar, ScrollArea, Footer, back/menu/profile/notification links; scope-controlled width | Header/actions, safe-area padding, reading order; separate shell width from content width |
| `layout/ShellScope.tsx`, `shellContext.ts` | Width/nav context and Pane context | One source of width policy; pane-aware bars/footers |
| `features/customer/CustomerArea.tsx` | Customer role guard, width, draft provider and leave-order guard | Same protected routes and draft ownership |
| `features/partner/PartnerArea.tsx`, `partnerContext.ts` | Driver role, vehicle gate, rider/tanker wording and trip-step routing | Same vehicle/assignment boundaries and step guards |
| `features/customer/pages/Splits.tsx` | Existing desktop order/address list-detail composition | Same child screens and queries, not cloned desktop business logic |
| `features/auth/RequireRole.tsx`, `SessionRedirects.tsx` | Session loading/error, signed-in/out redirects | No sign-in flash, wrong-role leakage or new authentication mechanism |
| `features/customer/order/OrderDraftProvider.tsx`, `draft.ts` | Draft storage, address/quantity choices, idempotency key | Retry safety and field retention; no prices stored as authoritative client data |
| `customer/queries.ts`, `partner/queries.ts` | TanStack Query keys, refresh, polling and mutations | Existing loading/error handling and mutation invalidation |

## Navigation

| Pattern | Actual implementation | Responsive context |
| --- | --- | --- |
| Customer tabs/header links | `customer/components/CustomerChrome.tsx`, `customerNav.ts` | Bottom tabs below xl; header navigation from 1280 px |
| Driver/rider bottom tabs | `partner/components/PartnerChrome.tsx` using `BottomTabBar.tsx` | Three enabled destinations in a hardcoded four-track grid; bottom navigation remains on larger screens |
| Full-route drawer | `layout/DrawerMenu.tsx`; customer Menu and partner PartnerMenu supply content | 310 px panel, max 85% of shell; Escape/backdrop/close routing |
| Trip navigation | `partnerContext.ts`, `JobStep.tsx` | Guarded by stage/arrival/unloading state, not arbitrary navigation tabs |
| Public/role-aware logo | `brand/Logo.tsx`, `HomeLogo.tsx`, `logoTarget.ts` | Keep official assets and appropriate destination, never redraw |

## Reusable UI primitives

| Source | Existing exports / patterns | What must survive |
| --- | --- | --- |
| `components/ui/Button.tsx`, `buttonClasses.ts` | Button, ButtonLink, ExternalButton; primary/alt/line/danger/small states | Disabled/loading labels, link vs action semantics, visible focus |
| `ui/IconButton.tsx` | IconButton, IconLink, badge/dot states | Accessible names, adequate hit area, current destinations |
| `ui/Field.tsx` | TextField, TextAreaField, password show/hide, hints and errors | Visible labels, error associations, phone/number input behavior |
| `ui/Choice.tsx` | OptionTile, RadioDot, RadioRow | Selection and keyboard semantics, explicit labels |
| `ui/Controls.tsx` | Segmented, PageTabs, Pills, Toggle/ToggleKnob | Active/disabled states, intentional horizontal filtering and touch area |
| `ui/Card.tsx` | Card, CardLink, CARD class constant | Card/link semantics and current token values |
| `ui/Content.tsx` | ScreenHeading, SectionTitle/Header, KeyValue, IconBadge, ActionTile, MenuItem, StepBar | Current wording, data formatting and hierarchy |
| `ui/Chip.tsx`, `Avatar.tsx` | Status chips, SampleTag, initials/tones | Status words + icon, simulation disclosure, official blue/green role cues |
| `ui/Notice.tsx` | Information/warning/error/success notices | Error text, action/retry affordance, status distinctions |
| `ui/CodeEntry.tsx` | CodeBoxes and Keypad | Physical keyboard support, six-digit limit, invalid/locked states; not a new proof method |
| `ui/PasswordChecklist.tsx`, `auth/SignUpSecurityFields.tsx` | Shared signup checklist, confirm-password, age/terms checkbox | Current approved password and consent rules |
| `layout/StateScreens.tsx` | LoadingBlock, WaterLoader, LoadingScreen, ErrorBlock/ErrorScreen, EmptyBlock | In-flight vs empty vs failed distinction, retry and accessible status |
| `ui/ConfirmDialog.tsx` | Portal alertdialog, 420 px max width, safe initial focus, trap/restore focus, Escape/backdrop, scroll lock | Preserve protections; no automatic confirmation or destructive-action shortcut |
| `ui/Admin.tsx` | MiniButton/MiniLink and DataTable reused by shared screens | Use only where currently needed; admin redesign is outside this pack |

## Domain-specific components

| Source family | Reusable existing pieces | Preserve |
| --- | --- | --- |
| Customer `components/OrderBits.tsx`, `OrderParts.tsx` | Order list/recent cards, price/quantity/summary rows | Real vs sample amounts and honest unknowns |
| Customer `components/AreaPicker.tsx`, `LocationCard.tsx`, `PinMap.tsx` | Service-area choice, optional location explanation/finding/error/map states | Manual address fallback; no automatic permission request |
| `auth/PhoneCodeParts.tsx` | Shared request/code/success/notice presentation | Verification and phone-change purposes remain distinct |
| Partner `components/JobParts.tsx` | Job cards, quantity/source/customer details and role chips | Data minimization, stage-specific actions |
| Partner `components/JobStep.tsx`, `StepError.tsx` | Stage guarding and failure/retry states | Do not show wrong step after refresh/reassignment |
| Partner `components/AssignedSheet.tsx` | Assigned-order overlay on real dashboard | Explicit accept or reasoned decline, assignment and loading/error states |
| Partner `components/AttemptList.tsx`, `ArriveButton.tsx` | Arrival confirmation and contact-attempt records | Server-allowed steps and attempt conditions |
| Partner `cash/CashParts.tsx`, `CashPages.tsx` | Cash card, record cash, My cash, handover | Integer-kobo amounts, custody states and explicit actions |
| `components/art/Art.tsx` and `brand/Illustration.tsx` | Existing map artwork, gauges, brand vehicle/water illustrations | Distinguish illustrative art from actual navigation/telemetry |

## Drawers and dialogs are not all the same

`DrawerMenu` is a routed menu, `AssignedSheet` is an assignment modal over the dashboard, and `ConfirmDialog` is a destructive/sensitive-action alertdialog. `AreaPicker` and `LocationCard` are inline form components in the current implementation; do not infer an existing modal just from the word picker. Preserve these differing interaction and workflow rules.

## Duplication assessment

No new device-specific screen copies are recommended by this audit. Customer panes reuse existing components. Partner shared history/account/cash/code components serve both vehicles through context. The separate Keke pickup and tanker loading compositions support different operational inputs, so they are functional variants rather than proven unnecessary duplication. A future refactor should address repeated presentation only after preserving data ownership, validation and mutation behavior.
