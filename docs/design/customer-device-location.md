# Customer delivery address with device location design

<!-- Workflow: docs/process/ui-driven-development.md. Gates: CLAUDE.md. -->

Issue: [#345](https://github.com/mmiri-oma/mmirioma/issues/345) ·
Requirements: FR-010, FR-020, FR-022, FR-024, NFR-012, NFR-020 · Prompt:
[prompts/20-customer-device-location.md](prompts/20-customer-device-location.md) ·
Decision: [maps.md](../architecture/maps.md) (#334, approved 2026-11-02) ·
Contracts: [customer-account.md](../api/customer-account.md#saved-addresses)
and [admin-directory.md](../api/admin-directory.md#get-service-zones)
(agreed); location fields from #340 (not agreed yet)
Designer: @Daveoski + Claude Code (written design; no visual mockup yet) ·
Reviewed by: (not yet) · Status: draft

This is a written design: the flow, every state and the exact wording. The
visual mockup is made from the prompt and attached before the screen is built.
It becomes `Status: approved` when one reviewer who is not the author checks it
against the SRS, the issue and maps.md (G2). Building also waits for #340's
contract (G3).

A customer can add an optional map pin to a delivery address, placed from the
phone's location or by hand, and save it with the address. Typing the address
and choosing the area stay the whole flow for anyone who says no.

## Design link

None yet. The frames are generated from the prompt and attached here.

## Screens and states

All build now; nothing is design ahead. Every screen is the phone column at
360 px and, until #335 sets the responsive rules, the same centred column at
1280 px.

| Screen | States |
| --- | --- |
| L1 New address (account form, `/addresses/new`) and Delivery details with a new address (`c-details`) | Location card: explain, finding, found, denied, unavailable, not supported, offline. Fields as today. Saving, saved, each error |
| L2 Map frame (in L1 and L5) | Not shown until asked; loading; loaded with pin; pin moved; failed to load; removed |
| L3 Saving | Saving; saved; `service_zone_not_found`; `address_limit_reached`; `validation_error` (field and pin); network failure |
| L4 Home row | No saved address; has a default address (unchanged) |
| L5 Saved addresses and Edit address | Each address with or without a pin; edit with the location card and map |

### L1 New address

Two places, the same card and map:

- **Account form** (`/addresses/new`, title "New address"), opened from the
  home row when there is no address and from Saved addresses. The location
  card sits above the existing fields: Address (required), Area (required to
  save, with "My area is not listed"), Landmark (optional), Label, "Make this
  my default". Footer: "Save address", as today.
- **Order flow,** Delivery details with "Add a new address" chosen: the card
  sits under the Address field and the map frame replaces today's map
  placeholder. The next step, Save address (`c-save`), is unchanged ("Continue",
  or "Continue without saving" when the area is not listed) and saves the pin
  with the address.

Location card, by state:

| State | When | Wording | Actions |
| --- | --- | --- | --- |
| Explain | Opened; nothing asked yet | **Add a pin at your gate** · A pin helps the rider find you. We ask for your phone's location only when you tap the button, and you can type your address instead. We keep the pin with this address and never use it to track you. | "Use my location" (primary), "Place the pin myself", link "Privacy notice" (`/privacy`) |
| Finding | After "Use my location"; the phone's own permission prompt shows over this | Finding your location… | "Cancel" (back to Explain) |
| Found | Position received | Pin placed from your phone's location, accurate to about {n} m. Move the map so the pin sits on your gate. Over 100 m: Your phone's location is rough (about {n} m). Move the map so the pin sits on your gate. | Map frame shows; "Remove pin" |
| Denied | Permission refused (now or before) | **Location is off for MmiriOma** · You can turn it on in your browser's site settings. You don't need it: type your address below, or place the pin yourself. | "Place the pin myself" |
| Unavailable | Position unavailable or timed out (15 s) | **We couldn't find your location** · Try again in the open, or type your address below. | "Try again", "Place the pin myself" |
| Not supported | No location in this browser, or not a secure page | **This browser can't share your location** · Type your address below, or place the pin yourself. | "Place the pin myself" |
| Offline | No connection | **You're offline** · Type your address below. You can add a pin when you're back online. | none; the map is not loaded |

`{n}` is the accuracy the phone reports, rounded to 10 m. No other figure is
shown.

### L2 Map frame

- The pin stays in the centre of the frame and the customer moves the map
  under it: one thumb, no precise drag on a small pin. Arrow keys move the map
  when it has focus; `+` and `-` zoom. Label for screen readers: "Map. Move the
  map to put the pin on your gate."
- **Start:** the phone's position (Found), otherwise the map's default centre
  (open question 2).
- **Loading:** the frame in the canvas colour with "Loading map…".
- **Failed to load:** The map isn't loading. Your typed address is enough; we'll
  use your area's delivery rate. "Try again". The fields stay usable.
- **Pin moved:** the card line becomes "Pin moved. It sits on the spot in the
  centre of the map."
- **Remove pin:** removes the pin and closes the map; the card returns to
  Explain. The address saves without a location.
- The attribution the map adds (OpenFreeMap, OpenStreetMap) stays visible.
- In Delivery details the frame replaces the "Move pin" placeholder and its
  "Map pins are not available yet" notice. A saved address chosen there shows
  its saved pin, read-only; it is changed from Saved addresses.

### L3 Saving

Saving (account form "Save address", or Save address `c-save` in the order
flow): the button shows its loading state; no double submit. Saved: back to
where the customer came from (home or Saved addresses), or on to Review in the
order flow. Every error keeps all fields and the pin.

| Error | Wording |
| --- | --- |
| 404 `service_zone_not_found` | That area is no longer listed. Choose your area again. (under Area) |
| 409 `address_limit_reached` | Today's wording, unchanged |
| 422 `validation_error`, a field | The server's message under that field, as today |
| 422 `validation_error`, the pin (#340) | We can't use that pin: it's outside the area we deliver to. Move it, or remove the pin and save without it. |
| Network failure | Check your connection and try again. |

Outside our delivery areas: choosing "My area is not listed" shows today's
notice, and the address cannot be saved (customer-account.md). A pin never
decides this on the phone (open question 1).

### L4 Home row

| State | Row |
| --- | --- |
| No saved address | "Delivering to" · **Set your delivery address** (replaces "Add your delivery address"); opens L1 |
| Has a default address | Unchanged: "Delivering to · {label}" and the address |

### L5 Saved addresses and Edit address

- Each saved address shows a small chip under its area: "Pin on map" when it
  has a location; nothing when it has none.
- Edit address shows the same location card: Explain when there is no pin;
  the map at the saved pin, with "Remove pin", when there is one.

## Screen-to-endpoint table

| Screen | Element / action | Endpoint | Fields used |
| --- | --- | --- | --- |
| L1, L5 | Area picker | `GET /service-zones` (agreed) | `id`, `name` |
| L1 | Save a new address | `POST /me/addresses` (agreed) | `label`, `address`, `landmark`, `zone_id`, `make_default`; **needs contract change (#340):** `latitude`, `longitude`, location source |
| L5 | Save an edit | `PATCH /me/addresses/{id}` (agreed) | same; **needs contract change (#340)** |
| L4, L5 | List addresses, "Pin on map" chip | `GET /me/addresses` (agreed) | address fields; **needs contract change (#340):** the location on each address |
| Order flow | The order keeps its own copy of the pin | `POST /orders` (agreed) | **needs contract change (#340):** the order's address location (FR-024) |
| L1 | Device position | Browser location, no endpoint | latitude, longitude, accuracy; kept in the browser until saved |
| L2 | Map tiles | OpenFreeMap style address (configuration, maps.md) | none of the customer's data |

## Decisions

1. **One screen, location optional.** The location card sits above the
   address fields instead of a separate "allow location" step, so saying no
   never leaves a dead end and typing is always one scroll away.
2. **Asked only on the tap,** after the Explain text (issue scope; maps.md
   section 8). Nothing is requested on page load, at sign-up or when the
   screen opens; tests check the browser location is not called before the
   tap.
3. **Centre-fixed pin.** Moving the map under a fixed pin is easier with one
   thumb on a small screen and works with the keyboard.
4. **No search box.** maps.md option G1: the "finding" state is the wait for
   the phone's position or the map, never suggestions.
5. **The explanation wording follows maps.md section 8, item 2.** The privacy
   notice section 5 still says the app does not ask for location; #340 owns
   that edit, and this screen must not ship before it.
6. **The accuracy line uses only the phone's own figure,** rounded; no other
   number appears.

## Open questions (with recommendations)

1. **"Outside our delivery areas" from a pin.** `GET /service-zones` sends no
   boundaries, and the server never works out the area itself. Recommendation:
   in this issue the area picker and the quote (`outside_service_zone`) decide,
   as today; a pin is never checked on the phone. If the team wants a pin
   check, #340 adds it to the contract first.
2. **Where the map starts without the phone's position.** Zones expose no
   centre point. Recommendation: one configuration value for the default
   centre (central Enugu), set with the tile address, rather than a zone field.
3. **The error for a refused pin.** #340's scope says 422; confirm it comes as
   `validation_error` on the location fields, so L3's wording applies.
4. **The "Pin on map" chip** (L5). Recommendation: show it, so a customer knows
   which addresses help the rider.
5. **Edit an existing address's pin.** Recommendation: yes (L5), through the
   same card and map.

## Changes to the design system

One new component: the **map frame** (L2), the existing `MapFrame` with a live
map, a fixed centre pin, its loading and failed states, and the attribution.
Added to [design-system.md](design-system.md) when the frames are approved.
