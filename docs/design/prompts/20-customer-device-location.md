# Prompt 20: customer delivery address with device location and map pin

Issue: [#345](https://github.com/mmiri-oma/mmirioma/issues/345) ·
Requirements: FR-010, FR-020, FR-022, FR-024, NFR-012, NFR-020 · Decision:
[maps.md](../../architecture/maps.md) (#334, approved: MapLibre + OpenFreeMap,
no text search, failure rules in section 6, privacy text in section 8) ·
Contracts: [customer-account.md](../../api/customer-account.md#saved-addresses)
(agreed), [admin-directory.md](../../api/admin-directory.md#get-service-zones)
(agreed); the location fields come from #340 (**not agreed yet**).

**Why this prompt:** today the customer types an address and picks an area;
the "Move pin" button on Delivery details says pins are not available. #345
adds an optional map pin, placed from the phone's location or by hand, saved
with the address. It changes what the customer sees, so it needs design
approval (G2) before it is built. Record: [customer-device-location.md](../customer-device-location.md).

**Before using:** the visual system is the **design handoff v1**
([handoff-v1.md](../handoff-v1.md)). Extend `c-details`, `c-save`, the
account address form and the home "Delivering to" row with their existing
components (cards, notices, key-value rows, chips, the area picker); the map
frame is the one new component.

```text
Using the MmiriOma customer app design already in this project (design
handoff v1: its colours, Plus Jakarta Sans, cards, notices and chips), design
how a CUSTOMER sets a delivery address with an optional map pin. Mobile first
at 360px wide; also show 1280px (the centred phone column is fine until the
responsive rules in #335 say otherwise). Add no colours or fonts. The map
frame is the only new component.

CONTEXT
Customers order water deliveries in Enugu, Nigeria, on entry-level Android
phones with slow, expensive data. Addresses are often a street plus a landmark;
house numbers are rare. A pin helps the rider find the gate. Ordering must
never depend on the map or the phone's location.

PRODUCT HONESTY RULES (every screen)
- Ask for the phone's location ONLY after the customer taps "Use my location",
  after the short explanation. Never on page load, never at sign-up.
- Saying no, or a phone that cannot find itself, loses nothing: typing the
  address and choosing the area always works, and the order goes ahead.
- No promises the app cannot keep. Never "exact price", "we'll find you
  anywhere" or a delivery time. A pin MAY be used to price delivery by road;
  without one the area's delivery rate applies.
- "Outside our delivery areas" comes only from the real areas list (the
  existing "My area is not listed" choice) or from the server. Never guess it.
- No address search box and no suggestions (there is no search service).
- No tracking language: the pin is where to deliver, not where the customer is.
- Keep everything typed after any error (NFR-012).
- Sample addresses carry a "Sample" tag.

SCREENS AND STATES

L1. NEW ADDRESS, in two places with the same card and map:
  - Account form "New address" (from the home row and Saved addresses): a
    location card above the existing fields (address, required; area picker,
    required to save, "My area is not listed" as today; landmark; label;
    "Make this my default"). Footer "Save address".
  - Order flow, Delivery details with "Add a new address": the card under the
    address field; the map replaces today's map placeholder. The next step,
    Save address, is unchanged and saves the pin with the address.
  Location card states:
  a. Explain (before anything is asked): why a pin helps, that we only ask
     when they tap, that they can type instead; link "Privacy notice".
     Buttons "Use my location" and "Place the pin myself".
  b. Finding your location: spinner, "Cancel". The phone's own permission
     prompt appears over the screen here.
  c. Found: the map with the pin at the phone's position, and how accurate
     the phone says it is ("about 20 m"; if over 100 m, ask them to move the
     pin to their gate).
  d. Location turned off for the app (permission denied): say so, how to turn
     it on in the browser, and that typing works. "Place the pin myself".
  e. Could not find the location (unavailable or timed out): "Try again",
     "Place the pin myself".
  f. Phone or browser cannot share location: same as e without "Try again".
  g. Offline: "Use my location" and the map are unavailable; typing works and
     the pin can be added later.

L2. MAP FRAME (inside L1, and in Delivery details instead of the "Move pin"
    placeholder)
  - The pin stays in the centre; the customer moves the map under it
    (works with one thumb, and with the arrow keys on a keyboard).
  - Map loading; map failed to load ("The map isn't loading. Your typed
    address is enough." with Try again); pin moved; "Remove pin".
  - The map's attribution (OpenFreeMap, OpenStreetMap) stays visible.

L3. SAVING (L1 footer)
  Saving; saved (back to where they came from; the home row shows the
  address); errors, keeping every field and the pin:
    404 service_zone_not_found   the area is no longer listed: pick again
    409 address_limit_reached    existing wording
    422 validation_error         the field's message under the field; a pin
                                 refused by the server (#340): move it or
                                 remove it
    network failure              "Check your connection", retry

L4. HOME ROW
  No saved address: "Set your delivery address" (replaces "Add your delivery
  address") opens L1. With an address: the existing "Delivering to" row.

L5. SAVED ADDRESSES and EDIT ADDRESS
  Each address shows whether it has a pin. Editing offers the same location
  card and map to add, move or remove the pin.

BUILD NOW: L1 to L5. DESIGN AHEAD: none.

OUTPUT
For each screen: the 360px and 1280px frames, every state above, and the
exact copy. Name components as in the handoff.
```

## Field rules

| Item | Rule | Source |
| --- | --- | --- |
| Address, landmark, label, area, default | Unchanged: `AddressInput` | [customer-account.md](../../api/customer-account.md#saved-addresses) |
| Area list | `GET /service-zones`: `{id, name, centre, boundary}`; `centre` always, `boundary` only when the administrator drew one (#346 amendment) | [admin-directory.md](../../api/admin-directory.md#amendment-346-zone-centre-and-boundary-on-get-service-zones) |
| Pin | Optional `latitude`, `longitude` and how it was set (`device_location`, `map_pin`, `typed`) on saved addresses and the order's address; a point outside Nigeria or the Enugu bound is refused with 422 | #340 scope, **not agreed** |
| Device position | Browser only until the customer saves or orders; never sent before | [maps.md](../../architecture/maps.md) section 8 |
| Map tiles | OpenFreeMap style address, one configuration value; MapLibre loaded lazily | maps.md section 3 |
| Failure | Tiles, location and offline failures leave the typed address usable; price falls back to zone rates | maps.md section 6 |
| Permission text | Matches the privacy notice section 5 rewrite in maps.md section 8, item 2 (#340 owns the notice edit) | maps.md section 8 |

## After generating

1. Check every state exists and the honesty rules hold.
2. Attach the frames to [customer-device-location.md](../customer-device-location.md).
3. Anything needing a field the contracts lack is an open question there, not
   a new field.
