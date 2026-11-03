# Delivery location contract

**Status: agreed** (G3) on 2026-11-03 by @nnamdi-security (technical lead), who
is not the author, with the decisions under "Reviewer's decisions" at the end.
Proposed for #340 by @Daveoski (+ Claude Code) on 2026-11-03. Built in #340
(backend; the screen is #345). It follows the maps decision (#334,
[maps.md](../architecture/maps.md)) and the technical lead's decisions on the
issue ([decisions](https://github.com/mmiri-oma/mmirioma/issues/340#issuecomment-6589913114)
and the [handover](https://github.com/mmiri-oma/mmirioma/issues/340#issuecomment-6590449932)
to @Daveoski, both 2026-11-02).

Requirements: FR-020, FR-022, FR-024, FR-032 · Design: #345
(`docs/design/customer-device-location.md`, awaiting G2, not yet merged) ·
Amends, additively:
[customer-account.md](customer-account.md#saved-addresses),
[order-details-and-price.md](order-details-and-price.md#post-orders-changes),
[deliveries.md](deliveries.md#driver-job-object)

A delivery address can carry an optional map location (FR-020: "map pin MAY
be provided but is not mandatory"). The customer sets it from the phone's
location or by placing a pin (#345); there is no geocoding (maps.md option
G1). A saved address keeps its location; an order keeps its own copy (FR-024).
The assigned driver sees it to find the gate. Every field is optional, so
today's clients keep working unchanged.

## Location object

```json
{ "latitude": 6.452713, "longitude": 7.510348, "source": "map_pin" }
```

| Field | Rule |
| --- | --- |
| `latitude`, `longitude` | WGS 84 decimal degrees (SRID 4326), as the zone `centre` and the delivery proof `location`. Latitude −90 to 90, longitude −180 to 180, then inside the delivery bounds (below). Stored to 6 decimal places (about 0.1 m); more are rounded |
| `source` | **Required whenever a location is sent.** How the point was set: `device_location` (the phone's position, not moved) or `map_pin` (placed or moved by hand). A missing or any other value is 422 `validation_error` |

An address with no point has `location: null`. That is the "typed" case in
#340's scope: it needs no third value ([question 1](#open-questions)).

No accuracy figure is stored: the customer confirms the pin, and the rider
needs the point, not how the phone found it.

### Delivery bounds

The server refuses a point outside the area MmiriOma delivers in (#340: "inside
Nigeria and within a sensible Enugu bound"). One server setting,
`DELIVERY_LOCATION_BOUNDS`, a box of south, west, north and east degrees; the
box sits inside Nigeria, so one check covers both. A point outside it is
422 `validation_error` with `loc` `["body", "location"]` on addresses and
`["body", "delivery_location"]` on orders (never the inner field, so a screen
has one place to show it), and the message "This location is outside the area we deliver in." The value is
[question 2](#open-questions).

The bounds are a sanity check, not the service area: whether MmiriOma
delivers there is still the zone the customer picked (FR-010,
[Which zone an address is in](admin-directory.md#which-zone-an-address-is-in)).
The server never works out a zone from a point.

## Saved addresses (customer)

`Address` gains `location` (the object above, or `null`):

```json
{
  "id": "4e2a9c1b-7f3d-4b6e-a508-1c9d2e3f4a5b",
  "label": "Home",
  "address": "12 Sample Close, Independence Layout, Enugu",
  "landmark": "Opposite the blue gate",
  "zone": { "id": "9e8d7c6b-5a4f-4e3d-8c1b-0a9f8e7d6c5b", "name": "Independence Layout", "is_active": true },
  "location": { "latitude": 6.452713, "longitude": 7.510348, "source": "map_pin" },
  "is_default": true,
  "created_at": "2026-10-14T09:31:00Z",
  "updated_at": "2026-11-03T08:12:00Z"
}
```

`AddressInput` (`POST /me/addresses` and `PATCH /me/addresses/{id}`) gains
optional `location`:

| Request | Effect |
| --- | --- |
| `POST`, `location` absent or `null` | Saved with no location |
| `POST`, `location` set | Saved with that location |
| `PATCH`, `location` absent | **Unchanged.** A client that does not know the field never removes a pin |
| `PATCH`, `location: null` | Location removed |
| `PATCH`, `location` set | Replaced |

Errors: the existing ones, plus 422 `validation_error` for a location out of
range, out of bounds or with an unknown `source`.

The admin directory's customer addresses
([admin-directory.md](admin-directory.md#customers)) do **not** return or
accept `location` ([question 3](#open-questions)).

## Orders

`OrderCreate` (`POST /orders`) gains optional `delivery_location` (the object
above, or `null`), sent with `delivery_address`. The order stores its own copy:
changing or deleting the saved address later never changes the order (FR-024).

- It is **not** compared with the quote ([When a quote matches the
  order](order-details-and-price.md#when-a-quote-matches-the-order)), because
  `POST /quotes` does not take a location in this contract
  ([question 4](#open-questions)).
- It is part of the idempotency body comparison, like every other field:
  the same key with a different location is 409 `idempotency_key_reused`.
- Errors: 422 `validation_error` as for addresses.

`OrderRead` (the customer's own order) gains `delivery_location`: the copy
stored with the order, or `null` (every order before this change).

`POST /admin/orders` takes no location, and `AdminOrderRead` does not return
it ([question 3](#open-questions)).

## Driver job detail

`DriverJobDetail` ([deliveries.md](deliveries.md#driver-job-object)) gains
`delivery_location`: `{ "latitude", "longitude" }` from the order, **only while
the job is `accepted`**, the same rule as `receiver` (FR-032). `null` for an
offer, after the job ends, and when the order has none. `source` is not sent.
`DriverJobSummary` (the list) never carries it.

This is the driver exposure the technical lead decided on #340 ("the driver
sees the pin on their assigned order, while assigned"). The driver app opens
it from the job and does not store it.

## Storage

PostGIS `geography(POINT, 4326)`, as the zone centre and the delivery proof:

| Table | Columns |
| --- | --- |
| `customer_addresses` | `location` (nullable), `location_source` (nullable; set exactly when `location` is) |
| `orders` | `delivery_location` (nullable), `delivery_location_source` (nullable; same rule) |

One reversible migration, `alembic check` clean. No spatial index: nothing
searches by location yet.

## Personal data and retention

A location is personal data and is handled as the address it belongs to
([maps.md](../architecture/maps.md#8-personal-data-and-the-privacy-notice)
section 8):

| Where | Kept | Removed by |
| --- | --- | --- |
| Saved address | While the address and the account exist | Deleting the address; `anonymize-customer` (addresses are deleted); the retention review, with the address |
| Order | Like the order's address: 3 years after the order is finished | `anonymize-customer` and the 3-year retention review set `delivery_location` and its source to `null`, with the address they already replace |

Neither is logged. The `customer_anonymized` and `retention_review_applied`
audit rows count cleared order locations (`order_locations_cleared`).

Before any client sends a location, the privacy notice changes as listed in
maps.md section 8 (sections 2, 5, 7, 8 and 15 of `PRIVACY_NOTICE.md`, with the
`/privacy` page and `docs/process/privacy-retention.md`). The notice says
today that the app does not ask for the customer's location. The backend part
of #340 ships that edit; the #345 screen must not go live before it.

## Open questions

Each has a recommendation; the reviewer decides.

1. **"Typed" as a source.** #340's scope lists `device_location`, `map_pin` and
   `typed`. A typed address has no point, so `location: null` already says it.
   Recommendation: two values only.
2. **The delivery bounds.** Recommendation: the box around Enugu State taken
   from its OpenStreetMap boundary, rounded outwards to 0.1 degree, set when the
   backend is built and recorded in the PR. Wider than the city on purpose, so
   an outlying customer is never refused by a too-tight box.
3. **Staff and the location.** The technical lead's comment names the driver
   endpoints only, so admin order and customer views do not get it.
   Recommendation: keep it so for the pilot; add it to the admin order detail
   later only if dispatchers ask, as a contract change.
4. **Locations on quotes.** Road-distance pricing (FR-022) needs the point on
   `POST /quotes` and in the quote match. OSRM is not deployed yet (maps.md R1
   is gated by a measurement), so every quote uses zone rates.
   Recommendation: add `delivery_location` to quotes in the issue that builds
   road-distance pricing, with its match rule, not now.
5. **Where the customer's map starts without the phone's position** (#345
   design, open question 2). Since the
   [#346 amendment](admin-directory.md#amendment-346-zone-centre-and-boundary-on-get-service-zones)
   (agreed 2026-11-03), `GET /service-zones` returns each zone's `centre`.
   Recommendation: start the map at the centre of the zone the customer
   picked, which needs no new field or setting.

## Reviewer's decisions

By @nnamdi-security, 2026-11-03 (recommendations, approved with the contract):

1. **Two source values only** (`device_location`, `map_pin`): agreed. `null`
   already means no pin.
2. **Bounds:** agreed: a box around Enugu State from its OpenStreetMap
   boundary, rounded outwards to 0.1 degree, set when the backend is built and
   recorded in the PR. A sanity check only; the zone the customer picks still
   decides whether MmiriOma delivers.
3. **Staff do not see the location in the pilot:** agreed. The driver sees it
   only on the assigned, accepted job, as decided on #340.
4. **No location on quotes yet:** agreed. OSRM is gated by the memory
   measurement, so every quote uses zone rates; the road-distance issue adds
   it with its match rule.
5. **Where the map starts:** agreed: the centre of the zone the customer
   picked, from `GET /service-zones` (#346). This replaces the earlier idea of a
   separate configuration value.
6. **Clarifications made in the agreement:** the validation `loc` is the
   location field (above), and `source` is required with a location.
7. **The build PR** adds a one-line pointer to this file in
   [customer-account.md](customer-account.md#saved-addresses),
   [order-details-and-price.md](order-details-and-price.md#post-orders-changes) and
   [deliveries.md](deliveries.md#driver-job-object), so a reader of those
   contracts finds the new fields, and tests that an inactive or foreign
   address never exposes another customer's location.

## Changes

| Date | Change | Agreed |
| --- | --- | --- |
| 2026-11-03 | Proposed for #340 | @nnamdi-security (technical lead, G3, 2026-11-03), with the clarifications in "Reviewer's decisions" |
