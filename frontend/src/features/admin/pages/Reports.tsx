import { useId, useState } from 'react'
import { CheckIcon, CloseIcon, DocumentLinesIcon, TrendUpIcon } from '../../../components/icons/icons'
import { ErrorBlock, LoadingBlock } from '../../../components/layout/StateScreens'
import { DataTable, StatCard } from '../../../components/ui/Admin'
import { Button } from '../../../components/ui/Button'
import { SampleTag } from '../../../components/ui/Chip'
import { Pills } from '../../../components/ui/Controls'
import { TextField } from '../../../components/ui/Field'
import type { AdminReport, ReportQuery, ReportRange } from '../../../domain/admin'
import { formatNaira } from '../../../lib/format/money'
import { AdminFrame, PageHead, Panel } from '../AdminParts'
import { useReport } from '../queries'
import { lagosToday, validateCustomRange } from '../reportDates'

type RangeChoice = ReportRange | 'custom'

const RANGES: { value: RangeChoice; label: string }[] = [
  { value: 'today', label: 'Today' },
  { value: '7d', label: 'Last 7 days' },
  { value: '30d', label: 'Last 30 days' },
  { value: 'custom', label: 'Custom' },
]

/** The words for the range in the CSV: the pill's label, or the chosen dates. */
const rangeLabel = (r: AdminReport) => (r.range === 'custom' ? `${r.from} to ${r.to}` : (RANGES.find((x) => x.value === r.range)?.label ?? r.range))

/** The vehicle rows of the "Orders by vehicle" table; "Not recorded" only when some orders have no vehicle type. */
const vehicleRows = (r: AdminReport) =>
  r.by_type.keke + r.by_type.tanker + r.by_type.not_recorded === 0
    ? []
    : [
        { label: 'Keke', orders: r.by_type.keke },
        { label: 'Tanker', orders: r.by_type.tanker },
        ...(r.by_type.not_recorded > 0 ? [{ label: 'Not recorded', orders: r.by_type.not_recorded }] : []),
      ]

/**
 * A count with a proportional bar. The number is always written next to the bar, so the
 * bar is never the only carrier of the value (colour and length alone are not enough).
 *
 * @param count - This row's count.
 * @param max - The largest count in the table, which gets the full-width bar.
 */
function CountBar({ count, max }: { count: number; max: number }) {
  return (
    <div className="flex items-center gap-2">
      <span className="w-10 shrink-0 tabular-nums">{count}</span>
      <span aria-hidden="true" className="h-2 min-w-0 flex-1 rounded-full bg-line">
        <span className="block h-2 rounded-full bg-primary" style={{ width: `${max > 0 ? Math.round((count / max) * 100) : 0}%` }} />
      </span>
    </div>
  )
}

/** True when the backend sends what riders earned; the real API does not (partner pay is out of the MVP), so the column is hidden. */
const hasEarnings = (r: AdminReport) => r.by_rider.some((x) => x.earned_minor_units !== undefined)

/** CSV of the report's tables (opened in a spreadsheet; amounts in naira). */
function toCsv(r: AdminReport): string {
  const esc = (v: string | number) => `"${String(v).replace(/"/g, '""')}"`
  const rows: (string | number)[][] = [
    ['MmiriOma report', rangeLabel(r), ...(r.is_sample ? ['SAMPLE DATA'] : [])],
    [],
    ['Orders', r.orders],
    ['Delivered', r.delivered],
    ['Cancelled', r.cancelled],
    [r.is_sample ? 'Revenue (NGN, delivered)' : 'Cash collected (NGN)', r.revenue_minor_units / 100],
    ['Keke orders', r.by_type.keke],
    ['Tanker orders', r.by_type.tanker],
    ...(r.by_type.not_recorded > 0 ? [['Vehicle not recorded', r.by_type.not_recorded]] : []),
    [r.includes_cancelled ? 'Area and vehicle tables include cancelled orders' : 'Area and vehicle tables leave out cancelled orders'],
    [],
    ['Area', 'Orders', 'Delivered'],
    ...r.by_area.map((a) => [a.area, a.orders, a.delivered]),
    [],
    ['Rider', 'Code', 'Trips', ...(hasEarnings(r) ? ['Earned (NGN)'] : [])],
    ...r.by_rider.map((x) => [x.name, x.code ?? '', x.trips, ...(hasEarnings(r) ? [(x.earned_minor_units ?? 0) / 100] : [])]),
    [],
    ['Station', 'Loads'],
    ...r.by_station.map((s) => [s.name, s.loads]),
  ]
  return rows.map((row) => row.map(esc).join(',')).join('\r\n')
}

function download(r: AdminReport) {
  const url = URL.createObjectURL(new Blob([toCsv(r)], { type: 'text/csv;charset=utf-8' }))
  const a = document.createElement('a')
  a.href = url
  a.download = `mmirioma-report-${r.range === 'custom' ? `${r.from}-to-${r.to}` : r.range}-${new Date().toISOString().slice(0, 10)}.csv`
  a.click()
  URL.revokeObjectURL(url)
}

/** Reports (added): orders, deliveries and revenue by area, rider and station for a date range. Tagged SAMPLE only when the numbers are simulated. */
export function Reports() {
  // What is being shown. A custom range only becomes `query` when "Apply" passes the date check, so
  // a bad range never replaces the last valid report.
  const [query, setQuery] = useState<ReportQuery>({ range: '7d', includeCancelled: false })
  const [customOpen, setCustomOpen] = useState(false)
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const [dateError, setDateError] = useState<string | null>(null)
  const today = lagosToday()
  const cancelledId = useId()
  const report = useReport(query)
  const r = report.data

  const pick = (choice: RangeChoice) => {
    if (choice === 'custom') {
      setCustomOpen(true)
      return
    }
    setCustomOpen(false)
    setDateError(null)
    setQuery({ range: choice, includeCancelled: query.includeCancelled })
  }
  const apply = () => {
    const problem = validateCustomRange(from, to, today)
    setDateError(problem)
    if (!problem) setQuery({ range: 'custom', from, to, includeCancelled: query.includeCancelled })
  }
  const setIncludeCancelled = (includeCancelled: boolean) => setQuery({ ...query, includeCancelled })
  return (
    <AdminFrame searchPlaceholder="Search orders, customers, riders">
      <PageHead
        title="Reports"
        sub="Orders and deliveries over time."
        actions={
          <>
            {r?.is_sample && <SampleTag>SAMPLE DATA</SampleTag>}
            <Button size="sm" block={false} variant="alt" disabled={!r} onClick={() => r && download(r)}>
              Download CSV
            </Button>
          </>
        }
      />
      <Pills className="rise-2" label="Date range" value={customOpen ? 'custom' : query.range} onChange={pick} options={RANGES} />
      {customOpen && (
        <form
          noValidate
          className="rise-2 flex flex-col gap-3 sm:flex-row sm:items-start"
          onSubmit={(e) => {
            e.preventDefault()
            apply()
          }}
        >
          <TextField label="From" type="date" max={today} value={from} onChange={(e) => setFrom(e.target.value)} />
          <TextField label="To" type="date" max={today} value={to} onChange={(e) => setTo(e.target.value)} />
          <div className="sm:mt-7">
            <Button type="submit" size="sm" block={false} variant="alt">
              Apply
            </Button>
          </div>
          {dateError && (
            <p role="alert" className="text-sm font-semibold text-danger sm:mt-8">
              {dateError}
            </p>
          )}
        </form>
      )}
      <label htmlFor={cancelledId} className="rise-2 flex min-h-12 w-fit cursor-pointer items-center gap-2 text-sm font-semibold">
        <input id={cancelledId} type="checkbox" className="size-5" checked={query.includeCancelled} onChange={(e) => setIncludeCancelled(e.target.checked)} />
        Include cancelled orders
      </label>
      {report.isPending && <LoadingBlock label="Building the report" />}
      {report.isError && <ErrorBlock error={report.error} onRetry={() => report.refetch()} />}
      {r && (
        <>
          <div className="rise-3 grid grid-cols-[repeat(auto-fit,minmax(210px,1fr))] gap-3.5">
            <StatCard tone="blue" icon={<DocumentLinesIcon size={24} />} value={r.orders} label="Orders" note={`${r.by_type.keke} Keke · ${r.by_type.tanker} Tanker`} />
            <StatCard tone="green" icon={<CheckIcon size={24} />} value={r.delivered} label="Delivered" note={r.orders ? `${Math.round((r.delivered / r.orders) * 100)}% of orders` : 'No orders'} noteTone="green" />
            <StatCard tone="red" icon={<CloseIcon size={24} />} value={r.cancelled} label="Cancelled" />
            <StatCard tone="green" icon={<TrendUpIcon size={24} strokeWidth={2.2} roundJoin={false} />} value={formatNaira(r.revenue_minor_units)} label="Revenue" note={r.is_sample ? 'SAMPLE prices' : 'Cash collected'} />
          </div>
          {!r.includes_cancelled && r.cancelled > 0 && (
            <p className="rise-3 text-sm text-slate">
              {r.cancelled === 1 ? '1 cancelled order is' : `${r.cancelled} cancelled orders are`} not counted in the area and vehicle tables. Tick "Include cancelled orders" to count {r.cancelled === 1 ? 'it' : 'them'}.
            </p>
          )}
          <div className="rise-4 grid gap-3.5 xl:grid-cols-2">
            <Panel title="Orders by area">
              <DataTable
                caption="Orders by area"
                rows={r.by_area}
                rowKey={(a) => a.area}
                empty="No orders in this period."
                columns={[
                  { header: 'Area', cell: (a) => a.area },
                  { header: 'Orders', cell: (a) => <CountBar count={a.orders} max={Math.max(...r.by_area.map((x) => x.orders))} /> },
                  { header: 'Delivered', cell: (a) => a.delivered },
                ]}
              />
            </Panel>
            <Panel title="Orders by vehicle">
              <DataTable
                caption="Orders by vehicle"
                rows={vehicleRows(r)}
                rowKey={(v) => v.label}
                empty="No orders in this period."
                columns={[
                  { header: 'Vehicle', cell: (v) => v.label },
                  { header: 'Orders', cell: (v) => <CountBar count={v.orders} max={Math.max(...vehicleRows(r).map((x) => x.orders))} /> },
                ]}
              />
            </Panel>
            <Panel title="By rider">
              <DataTable
                caption="Deliveries by rider"
                rows={r.by_rider}
                rowKey={(x) => `${x.name}-${x.code ?? ''}`}
                empty="No deliveries."
                columns={[
                  { header: 'Rider', cell: (x) => (x.code ? `${x.name} · ${x.code}` : x.name) },
                  { header: 'Trips', cell: (x) => x.trips },
                  ...(hasEarnings(r) ? [{ header: 'Earned', cell: (x: AdminReport['by_rider'][number]) => formatNaira(x.earned_minor_units ?? 0) }] : []),
                ]}
              />
            </Panel>
            <Panel title="By station">
              <DataTable caption="Loads by station" rows={r.by_station} rowKey={(s) => s.name} empty="No loads." columns={[{ header: 'Station', cell: (s) => s.name }, { header: 'Orders', cell: (s) => s.loads }]} />
            </Panel>
          </div>
        </>
      )}
    </AdminFrame>
  )
}
