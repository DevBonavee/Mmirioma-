/**
 * Admin reports adapter (#218): the real-API side of `getReport` in
 * `adminApi.ts`, converting with docs/architecture/api-mapping.md ("Admin
 * reports") and docs/api/admin-operations.md.
 *
 * What the backend does not send is left out, never filled in: the rider
 * "Earned" figure has no source (partner pay is out of the MVP). The report
 * counts real orders only (BR-09): the call sends no `simulated` parameter.
 */
import type { AdminReport, ReportQuery } from '../../../domain/admin'
import { apiClient, type ApiClient } from '../../../lib/api/client'
import { getAdminReport, type AdminReportQuery, type AdminReportRead } from '../../../lib/api/adminReports'

/** Shown for the row that collects orders with no service zone. */
export const NO_ZONE_LABEL = 'Area not listed'

/**
 * Convert the contract's report to the design type.
 *
 * `delivered` is the count of `delivered` events in the range and `cancelled`
 * the orders created in the range that are cancelled. `revenue_minor_units`
 * is the cash collected, in integer kobo. `by_area` is the contract's
 * `by_zone`, `by_station` its `by_source` with `loads` taken from `pickups`,
 * and `by_rider` its `by_driver` with the plate as the code. `by_type` and
 * `by_area` leave out cancelled orders unless `includesCancelled` (#333);
 * `orders` and `cancelled` always count them.
 */
export function reportFromRead(read: AdminReportRead, includesCancelled = false): AdminReport {
  return {
    range: read.range,
    from: read.from,
    to: read.to,
    includes_cancelled: includesCancelled,
    orders: read.orders.total,
    delivered: read.deliveries.delivered,
    cancelled: read.orders.by_status.cancelled ?? 0,
    revenue_minor_units: read.cash.collected_minor_units,
    by_type: { keke: read.by_delivery_type.keke, tanker: read.by_delivery_type.tanker, not_recorded: read.by_delivery_type.not_recorded },
    by_area: read.by_zone.map((zone) => ({ area: zone.name ?? NO_ZONE_LABEL, orders: zone.orders, delivered: zone.delivered })),
    by_rider: read.by_driver.map((driver) => ({ name: driver.name, code: driver.plate, trips: driver.delivered })),
    by_station: read.by_source.map((source) => ({ name: source.name, loads: source.pickups })),
    is_sample: read.is_simulated,
  }
}

/**
 * The report for a preset range or chosen dates (`GET /admin/reports`).
 *
 * @param query - The pill or dates the admin picked; always sent.
 * @param client - The API client; tests pass one with a fake `fetch`.
 */
export async function getReport(query: ReportQuery, client: ApiClient = apiClient): Promise<AdminReport> {
  const request: AdminReportQuery =
    query.range === 'custom'
      ? { from: query.from, to: query.to, includeCancelled: query.includeCancelled }
      : { range: query.range, includeCancelled: query.includeCancelled }
  return reportFromRead(await getAdminReport(request, undefined, client), query.includeCancelled)
}
