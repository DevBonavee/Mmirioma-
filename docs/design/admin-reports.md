# Admin reports: orders by area and by vehicle type (amendment)

Issue: [#333](https://github.com/mmiri-oma/mmirioma/issues/333) · Requirements:
FR-052, FR-053, BR-09 · Prompt: none (small amendment to the existing Reports
page, `/admin/reports`) · Contract (agreed, G3, 2026-11-02):
[admin-operations.md](../api/admin-operations.md#amendment-proposed-in-333-chosen-date-range-and-cancelled-orders)
Designer: @Cloudcrackamara + Claude Code · Reviewed by: @nnamdi-security (2026-11-02) · Status: approved

**Approved (G2) on 2026-11-02 by @nnamdi-security, who is not the author.**
The contract is agreed (G3), so the frontend may be built.

## What exists today

The Reports page already shows "Orders by area" and the Keke/Tanker split for
`today`, `7d` and `30d`, and `GET /admin/reports` already returns `by_zone` and
`by_delivery_type`. This amendment adds only what the issue asks beyond that:
a chosen date range and a cancelled-orders filter. The page layout does not
change; the amendment adds one control row.

## Screens and states

| Screen | States designed | Build now / design ahead |
| --- | --- | --- |
| Reports, date controls | Pills Today / 7 days / 30 days plus "Custom". Custom shows two date fields (From, To) and an "Apply" button. Checkbox "Include cancelled orders" (off by default) | Build now (after G2 and G3) |
| Reports, "Orders by area" | Loading skeleton; table (Area, Orders, Delivered) with a proportional bar in the Orders cell; empty ("No orders in this period."); error with "Try again"; the no-zone row is labelled "Area not listed" | Build now |
| Reports, "Orders by vehicle" | Same states. Rows: Keke, Tanker, "Not recorded" (the last only when above 0) | Build now |
| Custom range errors | "From must be on or before To."; "The end date cannot be in the future."; "Choose 90 days or fewer." Shown under the fields, announced to screen readers, results keep the last valid report | Build now |
| Sample data | The existing SAMPLE tag when the numbers are simulated (BR-09) | Existing |

Bars use a number beside each bar, never colour alone. Fields and buttons keep
the 48px touch target. At 360px the date fields stack and the tables scroll
inside their card; at 768px and above they sit in one row.

## Screen-to-endpoint table

| Screen | Element / action | Endpoint | Fields used |
| --- | --- | --- | --- |
| Reports | Pill or Apply | `GET /admin/reports` | query `range` or `from` + `to`; `include_cancelled` |
| Orders by area | Table and bars | same | `by_zone[].name`, `orders`, `delivered`; `zone_id: null` row |
| Orders by vehicle | Table and bars | same | `by_delivery_type.keke`, `tanker`, `not_recorded` |
| Cancelled note | "N cancelled orders are not counted here" | same | `orders.by_status.cancelled` |

No prices or money appear in these two breakdowns, and no customer name, phone
or address.

## Decisions

1. Vehicle type is the fixed `keke` / `tanker` value already stored on orders
   (technical lead, 2026-11-02). No free-text grouping.
2. Cancelled orders are left out of the two breakdowns by default, as the
   issue asks, and the page says how many were left out.

## Review decisions

Decided by @nnamdi-security on 2026-11-02 (recommendation and approval):

1. **`include_cancelled` defaults to `false`.** The issue asks to exclude
   cancelled orders, the breakdowns count demand that actually went ahead, and the
   page says how many were left out, so nothing is hidden. This changes the
   numbers for a request that sends only `range`; the only client of
   this endpoint in the repository is the Reports page, which this amendment
   extends, so no other client is affected.
2. **90 days is the maximum.** About a quarter is enough for the pilot's
   reviews and bounds the size of the query. No SRS figure exists; it is a
   recommendation and can be raised in a later contract change.

## Changes to the design system

None. Uses the existing pills, date field, checkbox, table and alert.
