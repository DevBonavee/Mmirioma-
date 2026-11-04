# Design references and authority

## Resolve the two design generations before designing

1. The current PRD and **SRS v0.3 (19 October 2026)** define product requirements and business rules; the SRS is normative. Source copies: [PRD](references/MmiriOma_MVP_PRD.md), [SRS](references/MmiriOma_MVP_SRS.md). Later agreed API contracts/amendments describe the current linked MVP behavior; apparent gaps are not permission to add new business rules during a layout redesign.
2. [CLAUDE.md](references/CLAUDE.md) describes the present organization repository, contribution and adapter architecture. No Git mutation or implementation is performed in this audit.
3. [handoff-v1.md](references/docs/design/handoff-v1.md), approved for this frontend on **16 October 2026**, explicitly replaces the older Noto Sans design system and authentication visual design for this codebase. Its underlying `design/MmiriOma-design-handoff/` PNG/HTML/token files are git-ignored and **absent from this checkout**.
4. Subsequent approved feature designs (phone verification, signup terms/password, live pricing, delivery windows, optional location, cash, arrival/unreachable) amend the handoff where recorded. The 3 November [responsive specification](references/docs/design/responsive.md) controls the current width/layout policy. It explicitly keeps partners at phone width.
5. Actual current visual values are recorded in `frontend/src/styles/theme.css` and existing components. They match the later handoff interpretation described in frontend architecture. Do not silently switch branding back to the older canvas because its file is named `design-system.md`.
6. The 4 November user brief asks for proper customer and driver desktop use. That reopens the current driver-width policy. This pack is evidence for review; no new desktop screens or handoff are marked approved here.

## Branding to preserve from the current frontend

| Item | Actual current value / source |
| --- | --- |
| Font | Plus Jakarta Sans, weights 400–800, with existing offline fallback; `styles/fonts.css` / `theme.css` |
| Primary | `#1570D8`; primary-dark `#0B4FA8`; ink `#0A2540` |
| Brand accents | navy `#054D6D`, deep-blue `#097CA0`, ocean `#16A0B8`, turquoise `#26C0C1`, gold `#F2B33D` |
| Role cues | Existing blue customer/Keke patterns and green tanker pattern; preserve current semantics |
| Main surfaces | canvas `#F4F7FB`, white surface, sky `#EAF3FE`; existing semantic text/background pairs |
| Type | title 24 px, body 14 px / 1.45, section 16 px, input 15 px, existing caption/label scales; these are current values, not a fresh accessibility approval |
| Layout tokens | phone 430 px; customer 720 px; customer-wide 1120 px; card 480 px; gutter 18 px |
| Other tokens | Card radius 20 px, input radius 12 px, current shadows and transform/opacity motion; reduced-motion behavior |
| Logos and illustration policy | Use actual `frontend/public/brand/` files and `Logo`/`Illustration` components. Brand asset copies are included unchanged under `references/frontend/public/brand/`; never redraw them |

The older document records **Noto Sans**, primary `#0B6786`, 16 px body and a 48 px target minimum. The later handoff uses Plus Jakarta Sans / `#1570D8` and 44 px baseline hits with later selective 48 px changes. These are documented generations, not interchangeable token sets. The newer responsive decision again calls for 48 px interactive targets while the code token remains 44 px. That specific inconsistency needs a recorded decision/implementation review. Enlarging page width does not resolve it.

## Existing approved references

Approval statements below are recorded metadata in the repository, not a fresh approval by this audit. The old file's approval does not override the later handoff/screen amendments. External canvas versions may differ today and were not authenticated or compared pixel-for-pixel.

| Source snapshot | Recorded approval/status | Existing external reference |
| --- | --- | --- |
| [design-system.md](references/docs/design/design-system.md) | Designer: @nnamdi-security · Reviewed by: @nnamdi-security on 2026-10-14 ·; Status: approved | [recorded canvas](https://claude.ai/artifact/9fKnBVzgvqwm8vx1eU8Y5C#play-15dd8cd198dd) |
| [handoff-v1.md](references/docs/design/handoff-v1.md) | Handoff approved by @chidimmamogbo for this frontend on 2026-10-16; service-zone amendment separately approved G2 by @nnamdi-security on 2026-10-26 | No external canvas URL recorded in this document |
| [responsive.md](references/docs/design/responsive.md) | Designer: @Bonvee120 + Claude Code (text design; no visual mockup) · Reviewed by:; @Cloudcrackamara (not the author) on 2026-11-03 · Status: **approved** (G2), with | No external canvas URL recorded in this document |
| [authentication.md](references/docs/design/authentication.md) | Designer: @nnamdi-security · Reviewed by: @nnamdi-security on 2026-10-15 ·; Status: approved | [recorded canvas](https://claude.ai/artifact/9fKnBVzgvqwm8vx1eU8Y5C) |
| [phone-verification.md](references/docs/design/phone-verification.md) | Designer: @chidimmamogbo + Claude Code · Reviewed by: @chidimmamogbo on 2026-10-26 · Status: approved | [recorded canvas](https://claude.ai/artifact/RefzjgcQeFbDqtZqFa9uqB) |
| [partner-phone-verification.md](references/docs/design/partner-phone-verification.md) | Designer: @nnamdi-security + Claude Code · Reviewed by: @Cloudcrackamara; (not the author), 2026-11-02 · Status: approved (G2) | No external canvas URL recorded in this document |
| [sign-up-password-and-terms.md](references/docs/design/sign-up-password-and-terms.md) | Designer: @chidimmamogbo + Claude Code · Reviewed by: @nnamdi-security; (2026-11-03) · Status: approved | No external canvas URL recorded in this document |
| [customer-live-prices.md](references/docs/design/customer-live-prices.md) | Designer: @Daveoski + Claude Code · Reviewed by: @chidimmamogbo on 2026-10-27 · Status: approved | [recorded canvas](https://claude.ai/artifact/ETUqwPQdujh4psAeLhM1ew) |
| [customer-delivery-window.md](references/docs/design/customer-delivery-window.md) | Designer: @Cloudcrackamara + Claude Code · Reviewed by: @nnamdi-security on 2026-10-28 · Status: approved | No external canvas URL recorded in this document |
| [customer-device-location.md](references/docs/design/customer-device-location.md) | Reviewed by: @nnamdi-security (2026-11-03) · Status: approved | No external canvas URL recorded in this document |
| [driver-arrival-unreachable.md](references/docs/design/driver-arrival-unreachable.md) | Designer: @Bonvee120 + Claude Code · Reviewed by: @nnamdi-security (technical lead) on 2026-10-29 · Status: approved | [recorded canvas](https://claude.ai/artifact/DaMqjVxD1woJjK5kB7WUH3) |
| [driver-cash.md](references/docs/design/driver-cash.md) | Designer: @chidimmamogbo + Claude Code · Reviewed by: @chidimmamogbo on 2026-10-26 · Status: approved | [recorded canvas](https://claude.ai/artifact/EmuF94h7pQteg79i56tX2E) |
| [cash-remittance.md](references/docs/design/cash-remittance.md) | Reviewed by: @Cloudcrackamara (design system) and @nnamdi-security; (technical lead) on 2026-10-22 · Status: approved | [recorded canvas](https://claude.ai/artifact/UWkVKaCyD5o9kkRv2VajDd) |

## Original Claude Design prompts

The following original prompt files are included as historical input. They must be read alongside later decisions, not pasted as current requirements without reconciliation.

- [docs/design/prompts/00-design-system.md](references/docs/design/prompts/00-design-system.md)
- [docs/design/prompts/01-customer-ordering.md](references/docs/design/prompts/01-customer-ordering.md)
- [docs/design/prompts/03-driver-deliveries.md](references/docs/design/prompts/03-driver-deliveries.md)
- [docs/design/prompts/04-authentication.md](references/docs/design/prompts/04-authentication.md)
- [docs/design/prompts/12-cash-remittance.md](references/docs/design/prompts/12-cash-remittance.md)
- [docs/design/prompts/13-customer-live-prices.md](references/docs/design/prompts/13-customer-live-prices.md)
- [docs/design/prompts/18-driver-arrival-and-unreachable.md](references/docs/design/prompts/18-driver-arrival-and-unreachable.md)
- [docs/design/prompts/20-customer-device-location.md](references/docs/design/prompts/20-customer-device-location.md)

Important conflicts: prompt 01 permits a centered max-width desktop customer column and describes early manual phone verification/no price. Prompt 03 explicitly asks for a 360 px phone-only driver design and says drivers do not use desktops. Later SMS verification, pricing, partner registration, cash and arrival designs supersede those early behavior assumptions. The new desktop brief should preserve the current contracts, not revive historical placeholder flows.

## Missing or incomplete references

| Gap | Why it matters / next information needed |
| --- | --- |
| Original `design/MmiriOma-design-handoff/` (`screens-png/`, `screens-html/`, `tokens/mo.css`, `tokens/tokens.json`) absent | Cannot certify pixel parity with the approved 57-screen visual pack. Obtain the version approved on 16 October and its README/index |
| Standalone `docs/design/customer-ordering.md` and `docs/design/driver-deliveries.md` absent | Original prompts reference early screen slices, but this checkout's active reference is the handoff plus later amendments; do not invent missing approvals |
| No approved expanded desktop driver workspace specification | Original phone-only prompt and current approved 430 px policy differ from the new objective; reviewer must decide replacement responsive behavior |
| Pattern-derived screens lack individual original artboards | Handoff lists added address/account/recovery/partner-registration/tanker-assignment screens. Their origin is a reused pattern, not an unseen approved PNG |
| Several late features are text designs without external canvas | The recorded Markdown describes their states; obtain any private artboards if pixel references are required |
| Physical tablet review, short-height/keyboard/zoom evidence | A 720 px customer tablet width was explicitly conditional on looking at a real tablet. Headless viewport captures do not prove that review occurred |
| External canvas access/version | Recorded URLs are supplied for authorized review; mutable canvas links alone do not establish the approved historical revision |

## Inconsistencies to carry into the review

- Broad handoff statement “responsive on phone, tablet and desktop” coexists with a phone-only original driver prompt and a later explicitly narrow partner policy. Describe the requested change as a revised desktop policy, not only a missing media query.
- Legacy design-system/authentication documents still appear approved, while the chosen handoff says it replaces their visual system. New designers must be given the authority order above.
- Current component behavior and several older feature docs refer to different route generations (`/sign-in`, `/request`, `/driver` versus current `/signin`, `/order`, `/partner/driver`). The screen inventory uses actual current routes.
- Some mock fields/actions are richer than real contracts: email/preferences/photo, documents, push and sample earnings. Preserve flags and real-mode honesty rather than treating every visible mock control as an approved production capability.
- No blanket absence of responsive CSS was found. Customer desktop grids and list/detail panes exist; the main conflict is selected scope/content rules and missing enlarged driver specifications.
