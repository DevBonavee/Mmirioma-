# Design system

<!-- Recorded from the approved Claude Design canvas. Values are copied from the
canvas source (project/Main.dc.html, version 1792010694-0e07). The only
additions are the decisions recorded under "Decisions".
Workflow: docs/process/ui-driven-development.md -->

Issue: S1-13 (#17) · Requirements: NFR-020, NFR-021 · Prompt:
[prompts/00-design-system.md](prompts/00-design-system.md)
Designer: @nnamdi-security · Reviewed by: @nnamdi-security on 2026-10-14 ·
Status: approved

This is the shared visual system for all three apps: customer (mobile),
staff/dispatcher (desktop first, also mobile) and driver (mobile). Every slice
design (`docs/design/<slice>.md`) reuses it. It sets **how things look**; it
does not set business rules. Example copy on the canvas (quantities, payment
options, time windows, references) is illustration only. See
[Not approved by this design](#not-approved-by-this-design).

## Design link

- Claude Design canvas: <https://claude.ai/artifact/9fKnBVzgvqwm8vx1eU8Y5C#play-15dd8cd198dd>
- Canvas title: "MmiriOma Design System". This system is the "Design system"
  artboard (`Main.dc.html`, 1280 px wide page); the canvas also holds the
  [authentication screens](authentication.md). Footer: "MmiriOma design system v1.0 · Lucide icons ·
  Noto Sans · Tailwind CSS v4 tokens".
- Version approved: `1792010694-0e07`. Version recorded here:
  `1792015088-aba8`, which adds the logo and the sign-in parts (see
  [Additions from the authentication design](#additions-from-the-authentication-design)).
  If the canvas changes again, this document must be updated in a reviewed
  PR.
- No screenshots are committed. The canvas is the visual reference; its
  sections are listed in [Canvas sections](#canvas-sections).

## Principles

From the canvas ("Six rules. Every component follows them."):

| Rule | Meaning |
| --- | --- |
| Plain words | Short sentences. Labels say what will happen: "Order water", not "Submit". |
| Never colour alone | Every status has an icon and words. Errors have an icon, words and a different border. |
| Easy to tap | Buttons and fields are at least 48 px tall, usable with one thumb outdoors. |
| Light on data | No photos. Icons are inline Lucide SVG. One font family, three weights, with a system fallback. |
| Visible focus | A 3 px blue ring on every control reached by keyboard. Every field has a visible label. |
| Honest examples | Mockups that show example names or naira amounts carry the Sample data tag. |

Light theme only. No dark theme was designed.

## Colors

Brand blue-teal is the only brand colour. Neutrals are cool grey. Semantic
colours are used for meaning only. **Primary shades 300 to 500 are for fills and
lines, never for text on white.**

### Brand primary

`600` is the main colour (buttons, links, focus border), `700` is hover, `800`
is pressed.

| Token | HEX | Use |
| --- | --- | --- |
| `--color-primary-50` | `#EEF8FB` | Tint backgrounds (selected tiles, hover, active nav) |
| `--color-primary-100` | `#D4EDF4` | Pressed secondary/ghost button |
| `--color-primary-200` | `#A9DAE8` | Brand badge border |
| `--color-primary-300` | `#74C0D6` | Fills and lines only |
| `--color-primary-400` | `#3FA0BE` | Fills and lines only |
| `--color-primary-500` | `#1D82A3` | Fills and lines only |
| `--color-primary-600` | `#0B6786` | Main brand colour |
| `--color-primary-700` | `#095370` | Hover; secondary and ghost button text |
| `--color-primary-800` | `#08425A` | Pressed; brand badge text; active nav text |
| `--color-primary-900` | `#073647` | Pressed secondary/ghost button text |

### Brand states (aliases)

| Token | HEX | Equals |
| --- | --- | --- |
| `--color-primary` | `#0B6786` | `primary-600`: buttons, links |
| `--color-primary-hover` | `#095370` | `primary-700` |
| `--color-primary-pressed` | `#08425A` | `primary-800` |

### Neutral

`900` is body text, `600` is secondary text, `500` is the border of form
controls.

| Token | HEX |
| --- | --- |
| `--color-neutral-50` | `#F7F9FA` |
| `--color-neutral-100` | `#EEF2F4` |
| `--color-neutral-200` | `#DFE5E9` |
| `--color-neutral-300` | `#C6D0D6` |
| `--color-neutral-400` | `#98A6AF` |
| `--color-neutral-500` | `#6A7983` |
| `--color-neutral-600` | `#4F5C66` |
| `--color-neutral-700` | `#3B464E` |
| `--color-neutral-800` | `#263037` |
| `--color-neutral-900` | `#151D23` |

### Surface, text, border and focus

These are the names to use in components.

| Token | HEX | Use |
| --- | --- | --- |
| `--color-background` | `#F7F9FA` | Page |
| `--color-surface` | `#FFFFFF` | Cards, fields, tables |
| `--color-surface-muted` | `#EEF2F4` | Disabled fill, suffix boxes |
| `--color-text-primary` | `#151D23` | Main text |
| `--color-text-secondary` | `#4F5C66` | Helper text, meta, placeholders |
| `--color-text-disabled` | `#6A7983` | Disabled text (WCAG-exempt) |
| `--color-text-inverse` | `#FFFFFF` | Text on dark fills |
| `--color-border` | `#C6D0D6` | Cards, dividers |
| `--color-border-strong` | `#6A7983` | Inputs, checkboxes (3:1) |
| `--color-focus-ring` | `#2A4BD7` | 3 px focus ring (3:1) |

### Semantic

| Token | HEX | Use |
| --- | --- | --- |
| `--color-success-50` | `#E9F7EF` | Background |
| `--color-success-200` | `#A9DCBF` | Border; icon on dark toast |
| `--color-success-600` | `#1B7A43` | Icon |
| `--color-success-700` | `#14602F` | Text |
| `--color-warning-50` | `#FFF5DC` | Background |
| `--color-warning-200` | `#F5D48A` | Border |
| `--color-warning-500` | `#F2A900` | Solid fill, **dark text only, never white** |
| `--color-warning-700` | `#8A5200` | Icon |
| `--color-warning-800` | `#6B4000` | Text on `warning-50` |
| `--color-danger-50` | `#FDEDEB` | Background; error field fill |
| `--color-danger-200` | `#F4B5AE` | Border; icon on dark toast |
| `--color-danger-600` | `#BE2A1E` | Destructive button; error field border |
| `--color-danger-700` | `#9B1F15` | Error text; destructive hover |
| `--color-danger-800` | `#7C190F` | Destructive pressed |
| `--color-info-50` | `#EAF1FD` | Background |
| `--color-info-200` | `#B4CCF3` | Border |
| `--color-info-600` | `#1F5FBF` | Icon |
| `--color-info-700` | `#184C99` | Text |

Info is a different blue from the brand so the two are never confused.

Other colour values used on the canvas: dialog backdrop
`rgb(21 29 35 / 0.62)`; skeleton shimmer gradient `neutral-100` → `neutral-200`
→ `neutral-100`.

### Contrast (WCAG 2.1 AA)

Text needs 4.5:1; control borders, focus rings and icons need 3:1. The canvas
computes these from the tokens; the ratios below were recomputed from the same
HEX values with the WCAG 2.1 formula and match.

| Pair | Ratio | Needs | Result |
| --- | --- | --- | --- |
| `text-primary` on `surface` | 17.05 : 1 | 4.5 : 1 | Pass |
| `text-primary` on `background` | 16.14 : 1 | 4.5 : 1 | Pass |
| `text-primary` on `surface-muted` | 15.13 : 1 | 4.5 : 1 | Pass |
| `text-secondary` on `surface` | 6.87 : 1 | 4.5 : 1 | Pass |
| `text-secondary` on `background` | 6.51 : 1 | 4.5 : 1 | Pass |
| `text-secondary` on `surface-muted` | 6.10 : 1 | 4.5 : 1 | Pass |
| `text-inverse` on `primary` | 6.37 : 1 | 4.5 : 1 | Pass |
| `text-inverse` on `primary-hover` | 8.46 : 1 | 4.5 : 1 | Pass |
| `text-inverse` on `primary-pressed` | 10.84 : 1 | 4.5 : 1 | Pass |
| `primary-700` on `surface` | 8.46 : 1 | 4.5 : 1 | Pass |
| `primary` on `surface` | 6.37 : 1 | 4.5 : 1 | Pass |
| `primary-800` on `primary-50` | 10.04 : 1 | 4.5 : 1 | Pass |
| `text-inverse` on `danger-600` | 5.93 : 1 | 4.5 : 1 | Pass |
| `text-inverse` on `danger-700` | 8.08 : 1 | 4.5 : 1 | Pass |
| `danger-700` on `surface` | 8.08 : 1 | 4.5 : 1 | Pass |
| `danger-700` on `danger-50` | 7.11 : 1 | 4.5 : 1 | Pass |
| `success-700` on `success-50` | 6.93 : 1 | 4.5 : 1 | Pass |
| `warning-800` on `warning-50` | 8.20 : 1 | 4.5 : 1 | Pass |
| `info-700` on `info-50` | 7.30 : 1 | 4.5 : 1 | Pass |
| `text-primary` on `warning-500` | 8.48 : 1 | 4.5 : 1 | Pass |
| `neutral-700` on `neutral-200` | 7.61 : 1 | 4.5 : 1 | Pass |
| `neutral-800` on `surface` | 13.46 : 1 | 4.5 : 1 | Pass |
| `border-strong` on `surface` | 4.49 : 1 | 3 : 1 | Pass |
| `border-strong` on `background` | 4.25 : 1 | 3 : 1 | Pass |
| `focus-ring` on `surface` | 6.80 : 1 | 3 : 1 | Pass |
| `focus-ring` on `background` | 6.44 : 1 | 3 : 1 | Pass |
| `focus-ring` on `primary-50` | 6.30 : 1 | 3 : 1 | Pass |
| `success-600` on `success-50` | 4.86 : 1 | 3 : 1 | Pass |
| `warning-700` on `warning-50` | 5.88 : 1 | 3 : 1 | Pass |
| `danger-600` on `danger-50` | 5.22 : 1 | 3 : 1 | Pass |
| `info-600` on `info-50` | 5.37 : 1 | 3 : 1 | Pass |
| `text-disabled` on `surface-muted` | 3.99 : 1 | 3 : 1 | Exempt |

Disabled text is exempt from AA, but keeps about 4:1 so it stays readable in
sunlight. Never put essential information in a disabled style.

## Typography

- **Font:** Noto Sans, weights **400, 600 and 700 only**, with the phone's own
  font as fallback. Chosen because it covers Igbo letters such as ọ, ụ, ị
  and ṅ.
- `--font-sans`: `"Noto Sans", system-ui, -apple-system, "Segoe UI", Roboto, Arial, sans-serif`
- `--font-mono`: `ui-monospace, "SF Mono", Menlo, Consolas, monospace` (codes,
  token names; 14/20 on the canvas)
- The canvas loads Noto Sans from Google Fonts for the mockup. Its guidance for
  production: self-host a Latin subset so the font file stays small. The subset
  **must not** include the Igbo letters (see [Decisions](#decisions)).

| Style | Size / line height | Weight | Token | Example on canvas |
| --- | --- | --- | --- | --- |
| display | 32/40 px | 700 | `--text-display` (2rem / 2.5rem) | "Water, on time" |
| display (desktop) | 40/48 px | 700 | `--text-display-lg` (2.5rem / 3rem) | Page title |
| h1 | 28/36 px | 700 | `--text-h1` (1.75rem / 2.25rem) | "Order water" |
| h2 | 22/30 px | 600 | `--text-h2` (1.375rem / 1.875rem) | "Choose a delivery day" |
| h3 | 18/26 px | 600 | `--text-h3` (1.125rem / 1.625rem) | "Delivery address" |
| body | 16/24 px | 400 | `--text-body` (1rem / 1.5rem) | Paragraph text |
| small | 14/20 px | 400 | `--text-small` (0.875rem / 1.25rem) | Helper text, meta |
| caption | 13/18 px | 400 | `--text-caption` (0.8125rem / 1.125rem) | "Updated Wed 14 Oct 2026, 2:30 pm" |

Rules:

- Body text is 16 px on every screen size.
- Small and caption are for extra detail only, never for the one thing a person
  must read.
- Form labels are body size at weight 600.
- Inputs use 16 px text so phones do not zoom in.

Component text sizes seen on the canvas: button 600 16/24; badge 600 14/20;
tag 700 13/16 upper case with 0.04em letter spacing; card title 700 18/26;
top bar title 700 18/26; dialog title 700 22/30; quantity tile main 700 18/26.

## Spacing, radius and shadows

### Spacing (4 px base)

`--spacing` is `0.25rem` (4 px), so Tailwind's `p-4` is 16 px. Named steps:

| Token | px |
| --- | --- |
| `--spacing-1` | 4 |
| `--spacing-2` | 8 |
| `--spacing-3` | 12 |
| `--spacing-4` | 16 |
| `--spacing-5` | 20 |
| `--spacing-6` | 24 |
| `--spacing-8` | 32 |
| `--spacing-10` | 40 |
| `--spacing-12` | 48 |
| `--spacing-16` | 64 |
| `--spacing-20` | 80 |
| `--spacing-touch` | 48 (minimum touch target) |
| `--spacing-touch-lg` | 56 (driver app primary button and fields; added with the auth design) |

Page gutter on the canvas: 16 px; content max width 1200 px.

### Radius

| Token | Value | Use |
| --- | --- | --- |
| `--radius-sm` | 6 px (0.375rem) | Tags, skeleton blocks |
| `--radius-md` | 10 px (0.625rem) | Buttons, fields |
| `--radius-box` | 12 px (0.75rem) | Quantity tiles, alerts, toasts, dropdown panels, brand mark |
| `--radius-lg` | 14 px (0.875rem) | Cards, tables, list containers |
| `--radius-xl` | 20 px (1.25rem) | Dialogs |
| `--radius-full` | 9999px | Badges, pills |

`--radius-box` was added after approval: the canvas uses 12 px on these
elements but had no token for it (see [Decisions](#decisions)).

### Shadows (subtle)

| Token | Value | Use |
| --- | --- | --- |
| `--shadow-xs` | `0 1px 2px 0 rgb(21 29 35 / 0.06)` | Cards |
| `--shadow-sm` | `0 1px 3px 0 rgb(21 29 35 / 0.08), 0 1px 2px -1px rgb(21 29 35 / 0.06)` | Rows |
| `--shadow-md` | `0 4px 12px -2px rgb(21 29 35 / 0.10), 0 2px 4px -2px rgb(21 29 35 / 0.06)` | Menus, dropdown panel |
| `--shadow-lg` | `0 16px 32px -8px rgb(21 29 35 / 0.20), 0 4px 8px -4px rgb(21 29 35 / 0.10)` | Dialogs, toasts |

## Breakpoints

Three widths, from [responsive.md](responsive.md). In code they are Tailwind's
default `md` (768 px) and `xl` (1280 px) variants; the app defines no
`--breakpoint-*` tokens.

| Name | Width | Tailwind | Behaviour |
| --- | --- | --- | --- |
| phone | under 768 px | (none) | One column, full-width buttons, bottom navigation. |
| tablet | 768 to 1279 px | `md:` | One or two columns, no sidebar. The customer app is a 720 px column. |
| desktop | 1280 px and up | `xl:` | Customer: header navigation instead of the tab bar, content up to 1120 px, two panes for Orders and Addresses. Admin: sidebar navigation for dispatchers (still to move from 1024 px, #343). |

The column widths of the phone-style apps are tokens: `--container-phone`
(430 px, the rider and driver app and every phone), `--container-customer`
(720 px, the customer tablet), `--container-customer-wide` (1120 px, the customer
desktop) and `--container-card` (480 px, the signed-out customer screens).

Below the tablet width the table scrolls sideways inside its box (table min
width 760 px).

## Tailwind CSS v4 theme

The canvas's final token table, as its `@theme` block (to paste after
`@import "tailwindcss";`). Per the canvas, `--color-primary-600` gives
`bg-primary-600`, `--radius-md` gives `rounded-md`, and `--spacing` is the 4 px
base. This goes into
`frontend/src/index.css` in the first frontend PR that uses it (prompt 00),
not before.

```css
@theme {
  /* Color: brand primary */
  --color-primary-50: #EEF8FB;
  --color-primary-100: #D4EDF4;
  --color-primary-200: #A9DAE8;
  --color-primary-300: #74C0D6;
  --color-primary-400: #3FA0BE;
  --color-primary-500: #1D82A3;
  --color-primary-600: #0B6786;
  --color-primary-700: #095370;
  --color-primary-800: #08425A;
  --color-primary-900: #073647;

  /* Color: brand states */
  --color-primary: #0B6786;
  --color-primary-hover: #095370;
  --color-primary-pressed: #08425A;

  /* Color: neutral */
  --color-neutral-50: #F7F9FA;
  --color-neutral-100: #EEF2F4;
  --color-neutral-200: #DFE5E9;
  --color-neutral-300: #C6D0D6;
  --color-neutral-400: #98A6AF;
  --color-neutral-500: #6A7983;
  --color-neutral-600: #4F5C66;
  --color-neutral-700: #3B464E;
  --color-neutral-800: #263037;
  --color-neutral-900: #151D23;

  /* Color: surface, text, border, focus */
  --color-background: #F7F9FA;
  --color-surface: #FFFFFF;
  --color-surface-muted: #EEF2F4;
  --color-text-primary: #151D23;
  --color-text-secondary: #4F5C66;
  --color-text-disabled: #6A7983;
  --color-text-inverse: #FFFFFF;
  --color-border: #C6D0D6;
  --color-border-strong: #6A7983;
  --color-focus-ring: #2A4BD7;

  /* Color: semantic */
  --color-success-50: #E9F7EF;
  --color-success-200: #A9DCBF;
  --color-success-600: #1B7A43;
  --color-success-700: #14602F;
  --color-warning-50: #FFF5DC;
  --color-warning-200: #F5D48A;
  --color-warning-500: #F2A900;
  --color-warning-700: #8A5200;
  --color-warning-800: #6B4000;
  --color-danger-50: #FDEDEB;
  --color-danger-200: #F4B5AE;
  --color-danger-600: #BE2A1E;
  --color-danger-700: #9B1F15;
  --color-danger-800: #7C190F;
  --color-info-50: #EAF1FD;
  --color-info-200: #B4CCF3;
  --color-info-600: #1F5FBF;
  --color-info-700: #184C99;

  /* Font */
  --font-sans: "Noto Sans", system-ui, -apple-system, "Segoe UI", Roboto, Arial, sans-serif;
  --font-mono: ui-monospace, "SF Mono", Menlo, Consolas, monospace;

  /* Type scale */
  --text-display: 2rem;
  --text-display--line-height: 2.5rem;
  --text-display--font-weight: 700;
  --text-display-lg: 2.5rem;
  --text-display-lg--line-height: 3rem;
  --text-display-lg--font-weight: 700;
  --text-h1: 1.75rem;
  --text-h1--line-height: 2.25rem;
  --text-h1--font-weight: 700;
  --text-h2: 1.375rem;
  --text-h2--line-height: 1.875rem;
  --text-h2--font-weight: 600;
  --text-h3: 1.125rem;
  --text-h3--line-height: 1.625rem;
  --text-h3--font-weight: 600;
  --text-body: 1rem;
  --text-body--line-height: 1.5rem;
  --text-body--font-weight: 400;
  --text-small: 0.875rem;
  --text-small--line-height: 1.25rem;
  --text-small--font-weight: 400;
  --text-caption: 0.8125rem;
  --text-caption--line-height: 1.125rem;
  --text-caption--font-weight: 400;

  /* Spacing (4 px base) */
  --spacing: 0.25rem;
  --spacing-1: 0.25rem;
  --spacing-2: 0.5rem;
  --spacing-3: 0.75rem;
  --spacing-4: 1rem;
  --spacing-5: 1.25rem;
  --spacing-6: 1.5rem;
  --spacing-8: 2rem;
  --spacing-10: 2.5rem;
  --spacing-12: 3rem;
  --spacing-16: 4rem;
  --spacing-20: 5rem;
  --spacing-touch: 3rem;
  --spacing-touch-lg: 3.5rem;

  /* Radius */
  --radius-sm: 0.375rem;
  --radius-md: 0.625rem;
  --radius-box: 0.75rem;
  --radius-lg: 0.875rem;
  --radius-xl: 1.25rem;
  --radius-full: 9999px;

  /* Shadow */
  --shadow-xs: 0 1px 2px 0 rgb(21 29 35 / 0.06);
  --shadow-sm: 0 1px 3px 0 rgb(21 29 35 / 0.08), 0 1px 2px -1px rgb(21 29 35 / 0.06);
  --shadow-md: 0 4px 12px -2px rgb(21 29 35 / 0.10), 0 2px 4px -2px rgb(21 29 35 / 0.06);
  --shadow-lg: 0 16px 32px -8px rgb(21 29 35 / 0.20), 0 4px 8px -4px rgb(21 29 35 / 0.10);

  /* Breakpoints: none. The app uses Tailwind's md (768 px) and xl (1280 px); see Breakpoints. */
}
```

## Canvas sections

The canvas page is one long reference with these sections, in order:
Principles · Colour (swatches and contrast check) · Type · Space, radius,
shadow (and breakpoints) · Buttons (4 variants × 6 states, full width on
mobile, with icon and icon only) · Forms (text input, textarea, phone, number
with unit, date and select, radio and checkbox, quantity chooser) · Status and
alerts · Cards, lists, tables (card, list rows, sortable table, pagination,
empty table) · Filters, empty, loading · Navigation (page header, top bar,
bottom nav, sidebar) · Dialog and toast · Tags · Sign-in parts (password
field, large and sunlight buttons, account menu, staff top bar, splash) ·
Money and time · All tokens (table and `@theme` block). A Logo section follows
Principles.

## Not approved by this design

The canvas uses example content to show components. These examples are
**not** approved business rules or copy. The SRS and `docs/api/` decide them;
where they conflict, the SRS and contracts win.

| Canvas example | Conflict or status | Source of truth |
| --- | --- | --- |
| Quantity presets 500 / 1,000 / 2,000 / 5,000 litres; helper "Between 500 and 10,000 litres"; error "The smallest order is 500 litres" | SRS pilot defaults are 25, 50, 100, 200, 300 and 500 L, pending approval; Sprint 1 treats every quantity as a quote request (1–100000) | FR-021; [orders.md](../api/orders.md) field rules |
| Order number "MO-1042" and the rule "MO, a hyphen, 4 digits or more" | Contract reference is `MO-` plus 10 random Crockford base32 characters | [orders.md](../api/orders.md) Reference (FR-027) |
| Payment radio: "Pay when the water arrives", "Pay by bank transfer", "Pay by card (not available yet)" | Payment method is an open decision; FR-040 lists only cash on delivery and bank transfer, no card | SRS §12.5, FR-040 |
| Delivery time select: Morning 8:00 am to 12:00 pm, Afternoon 12:00 pm to 4:00 pm, Evening 4:00 pm to 7:00 pm | Windows are admin-configured; Sprint 1 has a preferred date only, no slots | FR-025; orders.md `preferred_delivery_date` |
| Driver note "Use 200 letters or fewer" | `delivery_instructions` allows up to 500 characters (`landmark` 200) | orders.md field rules |
| Phone helper "Use 11 digits" and error "This number is too short. Use 11 digits." | The auth design uses "Enter a Nigerian mobile number, for example 08000000001"; the API also accepts `234…` and `+234…` input | [04-authentication.md](prompts/04-authentication.md); [auth.md](../api/auth.md) |
| Checkbox "Driver unloads the water for me" | Unloading is part of every delivery, not an option | PRD §1, §3.1 |
| Checkbox "Send updates by email (not available yet)" | Not in the SRS | None |
| "Prices include unloading"; sample prices on tiles, cards and table | Prices come only from the server; Sprint 1 has no prices | FR-022; process honesty rules |
| Sidebar items Overview, Orders, Drivers, Customers; "Below 1280 px it moves to the bottom navigation" | The admin prompt specifies Orders plus greyed later items, and a top bar with a menu button on mobile | [02-admin-orders.md](prompts/02-admin-orders.md) Screen 2 |
| Badge "Driver assigned" | Customers see it only after the driver accepts (`accepted`); before that they see "Confirmed". Staff screens need labels for `assigned` vs `accepted` that this set does not include | orders.md statuses; FR-032 |

## Decisions

Made by the technical lead on 2026-10-14, after the canvas was approved:

1. **Designer and sign-off.** @nnamdi-security made the canvas and approved
   it. Prompt 00 also asks the customer and admin designers (@Cloudcrackamara
   and @Daveoski, S1-13 owners) to agree; they were not available, so their
   review is still outstanding. Raise any change they request as a design
   system change (see the last section).
2. **File location.** This file lives at `docs/design/design-system.md`, where
   prompt 00, the template and the G2 check expect it.
3. **Font subset.** The self-hosted production font is a Latin subset that
   **does not** include the Igbo letters ọ, ụ, ị and ṅ. Those characters fall
   back to the phone's system font (`--font-sans` stack). Self-hosting the font
   file is agreed in the first frontend PR that adds it.
4. **12 px radius.** Added `--radius-box` (12 px, `0.75rem`) for the elements
   the canvas draws at 12 px: quantity tiles, alerts, toasts, dropdown panels
   and the brand mark. It is in the radius table and the `@theme` block. The
   canvas itself does not name it yet.

## Open questions

1. **Staff status labels.** Staff views (prompt 02) need badges for
   "Assigned - awaiting driver", "Driver accepted" and "Disputed". The admin
   design should add them to this system.
2. **Staff navigation below desktop.** The sidebar note says it "moves to the
   bottom navigation" below 1280 px; the staff top bar note says it becomes a
   Menu button below 768 px, which matches prompt 02. The admin design should
   settle one rule.
3. **Touch target size in PR #15.** `docs/design/ui-system.md` in PR #15 uses
   44 px; this approved system uses 48 px.

## Changes to the design system

- Version 1.0 (`1792010694-0e07`), approved 2026-10-14, plus `--radius-box`
  (Decision 4).
- Authentication additions (`1792015088-aba8`): logo, password field, locked
  state, large and sunlight buttons, account menu, staff top bar, splash,
  `--spacing-touch-lg`. Approved with the authentication design.

Future changes: update the canvas, then this file, in one reviewed PR.

## Additions from the driver arrival design (#250)

- **Outline-danger button** (arrived screen, "Customer not reachable"): built as
  the existing `line-danger` variant (white with red text and border), so no
  new variant exists.
- **AttemptList** (`features/partner/components/AttemptList.tsx`): rows
  "Attempt n · time" with a count under them ("0 of 2 attempts recorded", "3
  attempts recorded"). No existing part lists timed rows with a count; the job
  timeline is admin-only.
