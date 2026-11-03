# Responsive design rules

<!-- Workflow: docs/process/ui-driven-development.md. Fork gates: CLAUDE.md,
"Team workflow". -->

Issue: [#335](https://github.com/mmiri-oma/mmirioma/issues/335) ·
Requirements: NFR-020, NFR-021 · Contract: none (no endpoint changes) ·
Visual system: [design-system.md](design-system.md)
Designer: @Bonvee120 + Claude Code (text design; no visual mockup) · Reviewed by:
pending (one reviewer who is not the author) · Status: **proposed**. G2
approval is not given yet. The reviewer sets `Status: approved` and writes their
name and the date here.

The three follow-up issues build from this document: #341 (customer app),
#342 (rider and driver app) and #343 (admin). It decides how every screen
behaves on a phone, a tablet and a desktop. It does not change a colour, a
business rule or an endpoint.

## Decisions to confirm

The issue assumed three things. @Bonvee120 confirmed them on 2026-11-03 before
drafting, and the reviewer can change any of them.

1. The customer app gets real desktop layouts.
2. The rider and driver app stays a centred phone-width column on large screens.
3. Admin is desktop-first, with a tablet layout.

Where the audit below gave a reason to refine one, the rule says so.

## Breakpoints

Three widths, the ones [design-system.md](design-system.md#breakpoints) already
names. In code they are Tailwind's `md` (768 px) and `xl` (1280 px). Tailwind's
other steps (`sm` 640, `lg` 1024) are not layout decisions in this document.

| Name | Width | Meaning |
| --- | --- | --- |
| phone | under 768 px | One column. The layout the apps have today |
| tablet | 768 to 1279 px | One or two columns, no sidebar |
| desktop | 1280 px and up | Sidebar or top navigation, side panels, content capped |

The design system lists `--breakpoint-mobile`, `-tablet` and `-desktop` as
tokens, but `theme.css` defines none of them; every screen uses Tailwind's
defaults. This document keeps the defaults and corrects the design system's
wording ([Changes to the design system](#changes-to-the-design-system)).

## What exists today

Measured in mock mode at 360, 768, 1280 and 1920 px, loading each screen in
an iframe of that width and reading the layout back: page overflow, the width
of the content column, tables and their scroll boxes, and the smallest
controls. About 60 screens were measured: 21 customer, about 25 rider and driver
(both apps, signed in and signed out) and 14 admin. Not measured: the screens a
feature flag turns off, the screens reachable only mid-flow (the customer's
`/order/save-address`, `/profile/phone`, `/profile/delete`, an address edit),
`/admin/cash/drivers/:id`, and the marketing pages (#337). Nothing was tried on
a real phone or tablet, in landscape, or with large text.

| App | Phone (360) | Tablet and desktop |
| --- | --- | --- |
| Customer | Works. 326 to 348 px of content, edge to edge | The same phone column, 394 to 428 px wide, centred. At 1280 px it is 33% of the screen and at 1920 px 22% |
| Rider and driver | Works | The same, 428 px. The page scrolls inside the column, so a desktop browser shows a second scrollbar inside the page |
| Admin | Works, with a menu button | The sidebar shows from 1024 px, not 1280. Tables are 750 to 1075 px wide and several sit in a box narrower than that |

Findings:

- **Nothing breaks on a phone, and no screen scrolls sideways at 360 px.** The
  only elements past the screen edge are decorative pictures and SVGs (the
  login hero and the SVGs on the step screens), which the frame clips. On the
  admin side `DataTable` shows stacked cards below 768 px, so its tables never
  scroll sideways on a phone; the one hand-written table, on Pricing, does (640 px
  in a 279 px box).
- **Customer and rider screens are phone screens on every device.** There is
  no tablet or desktop layout to fix, only one to design.
- **The admin screens have a tablet layout in name only.** From 1024 px the
  sidebar takes 248 px and a side panel (`SplitLayout`, 360 to 380 px) sits
  beside the table, so a 1000 px table is squeezed into 570 to 620 px and scrolls
  sideways. At 1920 px the same tables fit.
- **One admin screen overflows the page.** `/admin/cash` at 768 px is 70 px wider
  than the screen, because two of its tables are not inside a scroll box.
  `DataTable` leaves that box to each caller (its comment says "wrap it in a card
  with `overflow-x-auto`"), and Cash did not.
- **Admin content is not capped.** The design system says content is up to
  1200 px wide; at 1920 px the content area is 1657 px.
- **Small controls are rare and old.** "Not now" (69 by 19 px) and "View all"
  (50 by 20 px) are text links on the home screens, and the filter chips on the
  rider's orders and history screens are 38 px high. They are the same on a phone
  today, so this document leaves them unchanged.

## Rules by app

### Customer app (#341)

| | Phone | Tablet (768 to 1279) | Desktop (1280 and up) |
| --- | --- | --- | --- |
| Frame | Full width, as today | Centred column, 720 px | Centred area, content up to 1120 px |
| Navigation | Bottom tab bar | Bottom tab bar, inside the column | Header with logo and links (Home, Order, Orders, Profile) replaces the tab bar |
| Forms and the order flow | One column | One column, 720 px | One column, 720 px, centred |
| Orders and Addresses | List, then a detail page | List, then a detail page | Two panes: list (380 px) and detail |
| Home | One column | One column | Welcome banner, then the Keke and Tanker cards side by side |
| Sheets and pickers | Bottom sheet | Bottom sheet inside the column | Centred dialog, 480 px |

Everything below 768 px stays as it is now, so the installed customer app on a
phone does not change.

### Rider and driver app (#342)

| | Phone | Tablet | Desktop |
| --- | --- | --- | --- |
| Frame | Full width, as today | Centred phone column, 430 px | Centred phone column, 430 px |
| Navigation | Bottom tab bar | Same, inside the column | Same, inside the column |
| Scrolling | Inside the app, as today | The window scrolls | The window scrolls |
| Everything else | As today | As today | As today |

The one change is the scrolling. On a tablet or desktop the header and tab bar
stay in the column (`position: sticky`) and the browser window scrolls, so there
is one scrollbar. Phones keep the current frame.

### Admin (#343)

| | Phone | Tablet (768 to 1279) | Desktop (1280 and up) |
| --- | --- | --- | --- |
| Navigation | Menu button and drawer | Menu button and drawer (today the sidebar appears from 1024) | Sidebar, 248 px |
| Content | Full width, 16 px padding | Full width, 24 px padding | Up to 1440 px, centred in the space beside the sidebar |
| Tables | Stacked cards (`DataTable` already does this) | The table, in its own scroll box | The table, without scrolling where the content is at least 1100 px wide |
| Side panels (assign a rider, rider, customer) | Full-screen sheet | Side sheet over the table, 420 px | Beside the table only when the content is at least 1400 px wide; otherwise a side sheet |
| Filters and toolbars | Wrap onto lines | Wrap | One line |

Admin is desktop-first: the sidebar layout is the design, and the tablet layout
is the same screens with the drawer and side sheets. The phone layout is for
checking an order from a phone, not for daily work.

## Screen groups

What each group does at each width. "As today" means the current layout.

| Group | Phone | Tablet | Desktop |
| --- | --- | --- | --- |
| **Customer** | | | |
| Sign in, sign up, forgot password | As today | Centred card, 480 px | Centred card, 480 px |
| Home, menu | As today | Column, 720 px | Home as above; menu becomes the header's account menu |
| Order flow (type, size, details, address, review) | As today | Column, 720 px | Column, 720 px |
| Orders, order detail, track, receipt | As today | Column, 720 px | Orders: two panes. Track and receipt: column, 720 px |
| Addresses (list, new, edit) | As today | Column, 720 px | Two panes |
| Profile, settings, support, notifications | As today | Column, 720 px | Column, 720 px |
| **Rider and driver** | | | |
| Every screen | As today | Phone column, window scroll | Phone column, window scroll |
| **Admin** | | | |
| Dashboard | One column | Cards in two columns, table in its scroll box | Cards in a row; table fits |
| Orders, Riders, Customers | Stacked cards; panel as a full-screen sheet | Table in its scroll box; panel as a side sheet | Table fits; panel beside it only at 1400 px |
| Cash, Pricing, Reports | Stacked cards | Tables, each in its scroll box | Tables fit |
| Areas, Water sources, Support | One column | One column | As today |
| Settings and audit log | Stacked cards | Table in its scroll box | Table fits |
| Notifications, account, map | As today | As today | As today |

## Components that change

| Component | File | Change |
| --- | --- | --- |
| Phone frame | `components/layout/MobileShell.tsx` | The width becomes a setting per app: customer 720 at tablet and desktop (header navigation from 1280), partner 430 |
| Tab bar | `components/layout/BottomTabBar.tsx` | Stays for the partner app and for customer phone and tablet; the customer desktop uses the header |
| Top bar | `MobileShell.tsx` (`TopBar`) | The customer desktop header adds the links; partner and phone unchanged |
| Admin shell | `components/layout/AdminShell.tsx` | Sidebar from 1280, not 1024 (`lg:` becomes `xl:`); content capped at 1440 |
| Split layout | `features/admin/AdminParts.tsx` (`SplitLayout`) | Beside the table only from 1400 px of content; otherwise a side sheet |
| Tables | `components/ui/Admin.tsx` (`DataTable`) | `DataTable` owns its scroll box, so no caller can forget it; Pricing's hand-written table becomes a `DataTable`; a test checks the box is there |
| Forms | `components/ui/Field.tsx` | Column capped at 560 px inside the wider customer column; no change on a phone |
| Sheets | `AssignedSheet`, address and filter sheets | Bottom sheet on a phone, a centred dialog (customer desktop) or side sheet (admin) from 768 |
| Dialogs | `components/ui/ConfirmDialog.tsx` | None. It is already 420 px wide and centred |
| Cards | `components/ui/Card.tsx` | None; grids decide how many sit in a row |

## The five worst screens

| Screen | Before | After |
| --- | --- | --- |
| Admin Cash at 768 px | The page is 70 px wider than the screen. Two tables are not in a scroll box (798 px in 671 px) | `DataTable` brings its own scroll box, so both tables scroll inside it. The page does not scroll sideways |
| Admin Orders at 1280 px | A 1012 px table is squeezed into 571 px beside a 380 px panel and scrolls sideways | The table has the full 1017 px of content and fits. The panel opens as a side sheet over it |
| Admin Dashboard at 1280 px | An 885 px table in 621 px, scrolling | With the sidebar from 1280 and the full content width, the table fits |
| Customer Home at 1280 px | A 416 px phone screen in the middle of a 1280 px window (33%); 22% at 1920 | Header navigation, banner and the two order cards side by side across up to 1120 px |
| Admin Settings, audit log at 768 and 1280 px | A 1051 px table in 671 px (768) and 935 px (1280) | At 768 it stays in the scroll box; at 1280 the content is full width and the table fits |

The rider and driver screens are not in this list: they work as a phone column.
Their one change is the scrolling.

## Decisions

- **Three widths, no more.** Phone, tablet and desktop cover every rule above.
  A fourth step for very large screens would add a layout nobody uses.
- **The customer's two panes start at 1280 px.** At 768 to 1279 px a list and a
  380 px detail pane next to it would leave the detail about 340 px, which is
  the phone layout again.
- **The admin sidebar moves to 1280 px.** It already hides the content at
  1024 to 1279 px; the design system already puts the sidebar at "desktop".
- **A side panel opens as a sheet unless there is room.** That is what fixes the
  squeezed Orders table without removing the panel.
- **The partner app stays a phone column.** Riders and drivers use it on a phone;
  a desktop layout for them would be used only by whoever tests it.

## Open questions

For the reviewer. Each has a recommendation.

1. **Customer header navigation at 1280 px.** Replace the bottom tab bar with a
   header (recommended: a bottom bar on a 1280 px screen is the strongest sign
   that nobody designed for it), or keep the tab bar at every width.
2. **The admin content cap, 1440 px.** The design system says 1200 px, but the
   Cash table is 1075 px wide and the Orders table 1012 px plus a 380 px panel.
   Recommended: 1440 px, and update the design system.
3. **The partner window scroll.** Recommended as written. The alternative is to
   leave the inner scroll, which is cheaper and keeps the second scrollbar.
4. **Tablet width for the customer app, 720 px.** A guess. Recommended: build
   it, look at it on a real tablet, and change the one value if it is wrong.
5. **The tap targets** ("Not now", "View all", the 38 px chips). Left alone to
   keep the phone layout unchanged. Say if you want them raised to 44 px, which
   would change the phone.

## Changes to the design system

If this is approved, `design-system.md` changes in the same PR as the build:

- The Breakpoints section says the three widths are Tailwind's `md` and `xl`, and
  drops the `--breakpoint-*` tokens that do not exist.
- "Sidebar navigation for dispatchers" moves from the desktop width to
  "1280 px and up", which matches the admin shell once it changes.
- "Content up to 1200 px wide" becomes 1440 px, if open question 2 is agreed.
- `--container-phone` (430 px) stays; the customer width, 720 px, is added as
  `--container-customer`.

None of these touches a colour, a font or a spacing value.

## What each follow-up gets

- **#341, customer app.** Build the customer rules above. This is the largest
  change and it owns the shell: partners use the same `MobileShell`, so the
  customer width must be a setting that leaves the partner column at 430 px.
- **#342, rider and driver app.** The window scroll on tablet and desktop, and a
  before and after list for the screens in the audit. Phone screenshots must not
  change.
- **#343, admin.** The sidebar at 1280 px, the content cap, `SplitLayout`, and
  `DataTable` owning its scroll box. Start with `/admin/cash`, which overflows
  the page at 768 px today.

Whoever builds #341 first changes `MobileShell`; #342 starts from that.
