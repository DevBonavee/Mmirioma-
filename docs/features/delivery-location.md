# Delivery location

Issue: [#340](https://github.com/mmiri-oma/mmirioma/issues/340) (backend; the
screen that sets the point is #345) · Requirements: FR-020, FR-022, FR-024,
FR-032, NFR-003, NFR-005 · Contract: [delivery-location.md](../api/delivery-location.md)
(agreed 2026-11-03) · Decision: [maps.md](../architecture/maps.md) (#334)

## 1. Overview and purpose

A delivery address can carry an optional map point (FR-020: a map pin "MAY be
provided but is not mandatory"). The customer sets it from the phone's position
or by placing a pin; there is no address search (maps.md, option G1). A saved
address keeps its point, and an order keeps its own copy (FR-024). The assigned
driver sees the point to find the gate. Every field is optional, so clients
that do not send it keep working unchanged.

The point is personal data and is handled as the address it belongs to: same
access, same retention, same deletion (maps.md section 8).

## 2. Feature workflow

1. The customer sends `location` on `POST /me/addresses` or
   `PATCH /me/addresses/{id}`, or `delivery_location` on `POST /orders`.
2. The server checks the point against `DELIVERY_LOCATION_BOUNDS` and stores it,
   rounded to 6 decimal places, with how it was set (`device_location` or
   `map_pin`).
3. Placing an order copies the point into the order. Later changes to the saved
   address never change the order.
4. While a job is `accepted`, the driver's job detail returns the order's point
   (latitude and longitude only).
5. `anonymize-customer` and the monthly retention review clear order points;
   saved-address points go when the address is deleted.

The customer screen (#345, design `docs/design/customer-device-location.md`)
sits on the sending side of steps 1 and 3:

1. On New address, Edit address and Delivery details (new address) the customer
   sees a location card. The phone's location is asked for only when they tap
   "Use my location"; "Place the pin myself" opens the map at the chosen area's
   centre (`GET /service-zones`, `centre`), or at all the listed centres before an
   area is chosen.
2. A phone fix is sent as `device_location`. Once the customer moves the map under
   the fixed pin it is `map_pin`. "Place the pin myself" saves nothing until the
   map is moved, so a zone centre is never stored as a gate.
3. The pin goes with the address (`POST` or `PATCH /me/addresses`; on a `PATCH`,
   `null` removes it) and, at checkout, with the order as `delivery_location`.
   The order gets the saved address's pin, or the one chosen for a new address
   even when that address is not saved. Quotes are not sent a pin.
4. A 422 on `location` shows "We can't use that pin..."; the fields and the pin
   stay. A pin is never checked on the phone: whether MmiriOma delivers there is
   still the area the customer picks.

## 3. Important files and their responsibilities

| File | Responsibility |
| --- | --- |
| `backend/app/shared/location.py` | The `Location` request object and its checks, the response objects, the PostGIS column helpers |
| `backend/app/core/config.py` | `DELIVERY_LOCATION_BOUNDS` and its validation |
| `backend/alembic/versions/20261103_0025_add_delivery_location.py` | The columns and CHECKs |
| `backend/app/modules/customers/` | `models.py` (columns), `schemas.py`, `router.py`, `service.py` (add, replace, keep, remove) |
| `backend/app/modules/orders/` | `models.py`, `schemas.py` (`OrderCreate`, customer `OrderRead`), `service.py` (own copy, idempotency), `retention.py` (clear, count) |
| `backend/app/modules/deliveries/schemas.py` | `DriverJobDetail.delivery_location`, only while accepted |
| `backend/app/modules/privacy/` | Audit counts and tool output (`order_locations_cleared`) |
| `frontend/src/features/customer/components/LocationCard.tsx` | The card: explain, finding, found, denied, unavailable, not supported, offline, and the pin map (#345) |
| `frontend/src/features/customer/components/PinMap.tsx` | The map frame with a fixed centre pin; loads MapLibre only when shown; "isn't loading" note and "Try again" |
| `frontend/src/features/customer/components/pinSupport.ts` | Where the map starts, the refused-pin and area-gone wording and checks |
| `frontend/src/lib/devicePosition.ts` | The one call to the browser's location, with a 15 s wait; returns denied, unavailable or unsupported instead of throwing |
| `frontend/src/features/customer/pages/AddressForm.tsx`, `order/DeliveryDetails.tsx`, `order/SaveAddress.tsx`, `order/Review.tsx` | Where the pin is set, saved with the address, and copied to the order |
| `backend/tests/test_delivery_location.py` | The object, bounds and setting, no database |
| `backend/tests/test_delivery_location_integration.py` | Storage, copy, driver view and privacy steps against PostGIS |

## 4. Database models and relationships

`geography(POINT, 4326)`, as the zone centre and the delivery proof. No spatial
index: nothing searches by location yet.

| Table | Columns |
| --- | --- |
| `customer_addresses` | `location` (nullable), `location_source` (nullable) |
| `orders` | `delivery_location` (nullable), `delivery_location_source` (nullable) |

Two CHECKs per table: the point and its source are set together or not at all,
and the source is `device_location` or `map_pin`. The models also expose
read-only `location_latitude` and `location_longitude` (and the order
equivalents), computed in SQL with `ST_Y` and `ST_X` on a geometry cast
(a geography has no `ST_X`), so a loaded row carries plain numbers.

## 5. API endpoints and request/response behavior

| Endpoint | Behaviour |
| --- | --- |
| `POST /me/addresses` | `location` optional; absent or `null` saves none |
| `PATCH /me/addresses/{id}` | `location` absent: unchanged. `null`: removed. Set: replaced |
| `GET /me/addresses`, and the responses above | `location` is the object or `null` |
| `POST /orders` | `delivery_location` optional; stored as the order's copy |
| `GET /orders`, `GET /orders/{reference}` (customer) | `delivery_location` is the stored copy or `null` |
| `GET /driver/jobs/{reference}` | `delivery_location` is `{latitude, longitude}` while accepted, else `null` |

The admin order and customer endpoints, and the driver job list, never return it.
`POST /quotes` takes no location, so the point never changes a quote.

## 6. Important business rules

- **Optional everywhere** (FR-020). A missing point is `null`, never an error.
- **`source` is required with a point.** Only `device_location` and `map_pin`
  are accepted; there is no "typed" value, because no point already means typed.
- **An order keeps its own copy** (FR-024), also in the idempotency comparison:
  the same key with a different point is 409 `idempotency_key_reused`.
- **Bounds are a sanity check, not the service area.** The zone the customer
  picks still decides whether MmiriOma delivers (FR-010). The server never works
  out a zone from a point.
- **The driver sees it only while the job is accepted**, the same rule as the
  receiver (FR-032), and without `source`.
- **Retention:** a saved-address point lives with the address; an order's point
  lives 3 years after the order is finished, then the review clears it with the
  address (notice section 8).

## 7. Authentication and authorization requirements

The customer endpoints need a signed-in customer, and a customer reaches only
their own addresses and orders (another customer's address is 404
`address_not_found`). The driver endpoint needs the driver the job is assigned
to. Staff do not receive the point in the pilot (contract, decision 3).

## 8. Error handling and edge cases

- A point outside the box, with latitude or longitude out of range, with a
  missing or unknown `source`, or with extra fields: 422 `validation_error`.
  Outside the box, `loc` is `["body", "location"]` on addresses and
  `["body", "delivery_location"]` on orders, with the message "This location is
  outside the area we deliver in."
- A bad `DELIVERY_LOCATION_BOUNDS` stops the app at startup (four numbers,
  south below north and west below east, inside Nigeria).
- Saving the same point again records no audit change. The audit row names the
  field (`location`), never the coordinates.
- Orders made before this change have `delivery_location: null`.

## 9. Testing instructions

```bash
cd backend
pytest tests/test_delivery_location.py tests/test_customer_account_api.py tests/test_orders_api.py
# with the test database (never the dev database):
TEST_DATABASE_URL=<mmirioma_test URL> alembic upgrade head
TEST_DATABASE_URL=<mmirioma_test URL> pytest tests/test_delivery_location_integration.py tests/test_privacy_integration.py
alembic downgrade -1 && alembic upgrade head && alembic check
```

## 10. Known limitations

- **The bounds are a sanity box, not the service area.** The default,
  `5.9,6.9,7.2,8.0` (south, west, north, east), is the OpenStreetMap boundary of
  Enugu State rounded outwards to 0.1 degree, as the contract says. Checked on
  3 November 2026 against the boundary's bounding box (south 5.9246, north
  7.1037, west 6.9317, east 7.9034). It takes in parts of neighbouring states on
  purpose; whether MmiriOma delivers somewhere is still the zone the customer
  picked. It can be changed with `DELIVERY_LOCATION_BOUNDS` and no code change.
- Quotes do not use the point yet. Road-distance pricing needs OSRM, which is
  gated by a memory measurement (maps.md R1); until then every quote uses zone
  rates.
- The customer app sends a point from the #345 screen. It must not go live until
  a person has read OpenFreeMap's privacy policy and confirmed the wording of the
  permission text against maps.md section 8 (condition on #345).
- The pin on Delivery details for a saved address is shown read-only; it is
  changed from Saved addresses. A customer who reorders an unsaved address gets no
  pin, because the customer's order view does not return the order's copy.
- Tests cover the screens with a fake map library (jsdom has no WebGL). The real
  OpenFreeMap tiles and a real phone's permission prompt were not tested.
- The admin screens do not show the point.
