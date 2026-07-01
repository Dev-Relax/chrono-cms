import React, { useCallback, useEffect, useState } from "react"
import { Layout } from "../../components/common/Layout.js"
import {
  analyticsApi,
  type AnalyticsOverview,
  type AnalyticsContent,
  type AnalyticsEvents,
  type AnalyticsPeriod,
} from "../../lib/api.js"

// ── Helpers ───────────────────────────────────────────────────────────────────

// Fill gaps in the time series so the chart always shows a continuous range.
const fillTimeSeries = (
  raw: AnalyticsOverview["timeSeries"],
  period: AnalyticsPeriod,
): AnalyticsOverview["timeSeries"] => {
  if (raw.length === 0) return []
  const days = period === "7d" ? 7 : period === "30d" ? 30 : period === "90d" ? 90 : null
  const end = new Date()
  const start = days ? new Date(Date.now() - days * 86_400_000) : new Date(raw[0]!.date)
  const map = new Map(raw.map((r) => [r.date, r]))
  const result: AnalyticsOverview["timeSeries"] = []
  const cursor = new Date(start)
  while (cursor <= end) {
    const d = cursor.toISOString().slice(0, 10)
    result.push(map.get(d) ?? { date: d, visitors: 0, pageViews: 0 })
    cursor.setDate(cursor.getDate() + 1)
  }
  return result
}

// ── SVG line chart ────────────────────────────────────────────────────────────

const LineChart: React.FC<{ data: AnalyticsOverview["timeSeries"] }> = ({ data }) => {
  if (data.length < 2) {
    return (
      <div className="flex h-44 items-center justify-center text-sm text-slate-600">
        Not enough data yet
      </div>
    )
  }

  const W = 800
  const H = 160
  const PAD = { top: 10, right: 10, bottom: 28, left: 38 }
  const iW = W - PAD.left - PAD.right
  const iH = H - PAD.top - PAD.bottom

  const maxVal = Math.max(...data.flatMap((d) => [d.visitors, d.pageViews]), 1)
  const px = (i: number) => PAD.left + (i / (data.length - 1)) * iW
  const py = (v: number) => PAD.top + iH - (v / maxVal) * iH

  const visitorPts = data.map((d, i) => `${px(i)},${py(d.visitors)}`).join(" ")
  const pvPts = data.map((d, i) => `${px(i)},${py(d.pageViews)}`).join(" ")

  const yTicks = [0, 0.25, 0.5, 0.75, 1].map((p) => Math.round(maxVal * p))
  const step = Math.max(1, Math.floor(data.length / 6))
  const xLabels = data
    .map((d, i) => ({ d, i }))
    .filter(({ i }) => i % step === 0 || i === data.length - 1)

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ height: 192 }}>
      {yTicks.map((v) => (
        <line
          key={v}
          x1={PAD.left}
          y1={py(v)}
          x2={PAD.left + iW}
          y2={py(v)}
          stroke="rgb(30,41,59)"
          strokeWidth="1"
        />
      ))}
      {yTicks.map((v) => (
        <text
          key={v}
          x={PAD.left - 6}
          y={py(v) + 4}
          textAnchor="end"
          fontSize="11"
          fill="rgb(100,116,139)"
        >
          {v >= 1000 ? `${(v / 1000).toFixed(1)}k` : v}
        </text>
      ))}
      <polyline
        fill="none"
        stroke="rgb(100,116,139)"
        strokeWidth="1.5"
        strokeOpacity="0.5"
        points={pvPts}
      />
      <polyline
        fill="none"
        style={{ stroke: "var(--color-primary)" }}
        strokeWidth="2"
        points={visitorPts}
      />
      {xLabels.map(({ d, i }) => (
        <text
          key={i}
          x={px(i)}
          y={H - 4}
          textAnchor="middle"
          fontSize="11"
          fill="rgb(100,116,139)"
        >
          {d.date.slice(5)}
        </text>
      ))}
    </svg>
  )
}

// ── Horizontal bar list ───────────────────────────────────────────────────────

const BarList: React.FC<{
  items: { label: string; value: number }[]
  color?: string
}> = ({ items, color = "var(--color-primary)" }) => {
  if (items.length === 0) {
    return <p className="py-8 text-center text-sm text-slate-600">No data yet</p>
  }
  const max = Math.max(...items.map((i) => i.value), 1)
  return (
    <ul className="space-y-3">
      {items.map((item, i) => (
        <li key={i}>
          <div className="mb-1 flex items-center justify-between gap-2 text-xs">
            <span className="truncate font-mono text-slate-400" title={item.label}>
              {item.label}
            </span>
            <span className="shrink-0 tabular-nums text-slate-300">{item.value.toLocaleString()}</span>
          </div>
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-800">
            <div
              className="h-full rounded-full"
              style={{ width: `${(item.value / max) * 100}%`, background: color }}
            />
          </div>
        </li>
      ))}
    </ul>
  )
}

// ── Donut chart ───────────────────────────────────────────────────────────────

const DonutChart: React.FC<{
  segments: { label: string; value: number; color: string }[]
}> = ({ segments }) => {
  const total = segments.reduce((s, g) => s + g.value, 0)
  if (total === 0) {
    return <p className="py-8 text-center text-sm text-slate-600">No data yet</p>
  }
  const R = 42
  const C = 2 * Math.PI * R
  let offset = 0
  const arcs = segments.map((seg) => {
    const pct = seg.value / total
    const dash = pct * C
    const arc = { ...seg, pct, dash, offset }
    offset += dash
    return arc
  })

  return (
    <div className="flex items-center gap-8">
      <svg viewBox="0 0 100 100" className="h-24 w-24 shrink-0 -rotate-90">
        <circle cx="50" cy="50" r={R} fill="none" stroke="rgb(15,23,42)" strokeWidth="16" />
        {arcs.map((arc, i) => (
          <circle
            key={i}
            cx="50"
            cy="50"
            r={R}
            fill="none"
            stroke={arc.color}
            strokeWidth="16"
            strokeDasharray={`${arc.dash} ${C - arc.dash}`}
            strokeDashoffset={-arc.offset}
          />
        ))}
      </svg>
      <ul className="flex-1 space-y-2.5">
        {arcs.map((arc, i) => (
          <li key={i} className="flex items-center gap-2 text-sm">
            <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: arc.color }} />
            <span className="capitalize text-slate-400">{arc.label}</span>
            <span className="ml-auto tabular-nums font-medium text-slate-200">
              {arc.value.toLocaleString()}
              <span className="ml-1 text-xs font-normal text-slate-500">
                ({Math.round(arc.pct * 100)}%)
              </span>
            </span>
          </li>
        ))}
      </ul>
    </div>
  )
}

// ── Section card wrapper ──────────────────────────────────────────────────────

const Section: React.FC<{ title: string; children: React.ReactNode; action?: React.ReactNode }> = ({
  title,
  children,
  action,
}) => (
  <div className="overflow-hidden rounded-xl border border-slate-800 bg-slate-900/60">
    <div className="flex items-center justify-between border-b border-slate-800 px-5 py-3">
      <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-500">{title}</h2>
      {action}
    </div>
    <div className="p-5">{children}</div>
  </div>
)

// ── Stat card ─────────────────────────────────────────────────────────────────

const Stat: React.FC<{ label: string; value: number | null; accent?: string }> = ({
  label,
  value,
  accent = "text-slate-50",
}) => (
  <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-5">
    <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">{label}</p>
    <p className={`mt-2 text-3xl font-bold tabular-nums ${accent}`}>
      {value === null ? "—" : value.toLocaleString()}
    </p>
  </div>
)

// ── Period selector ───────────────────────────────────────────────────────────

const PERIODS: { value: AnalyticsPeriod; label: string }[] = [
  { value: "7d", label: "7 days" },
  { value: "30d", label: "30 days" },
  { value: "90d", label: "90 days" },
  { value: "all", label: "All time" },
]

const DEVICE_COLORS: Record<string, string> = {
  desktop: "rgb(56,189,248)",
  mobile: "var(--color-primary)",
  tablet: "rgb(167,139,250)",
  unknown: "rgb(100,116,139)",
}

const EVENT_LABELS: Record<string, string> = {
  outbound_click: "Outbound clicks",
  read_complete: "Read completions",
  project_click: "Project clicks",
  contact_open: "Contact opens",
}

// ── Dashboard page ────────────────────────────────────────────────────────────

const AnalyticsDashboard: React.FC = () => {
  const [period, setPeriod] = useState<AnalyticsPeriod>("30d")
  const [overview, setOverview] = useState<AnalyticsOverview | null>(null)
  const [content, setContent] = useState<AnalyticsContent | null>(null)
  const [events, setEvents] = useState<AnalyticsEvents | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchAll = useCallback((p: AnalyticsPeriod) => {
    setLoading(true)
    setError(null)
    Promise.all([analyticsApi.overview(p), analyticsApi.content(p), analyticsApi.events(p)])
      .then(([ov, ct, ev]) => {
        setOverview(ov.data)
        setContent(ct.data)
        setEvents(ev.data)
      })
      .catch((err: Error) => setError(err.message))
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    fetchAll(period)
  }, [fetchAll, period])

  const filledSeries = overview ? fillTimeSeries(overview.timeSeries, period) : []
  const isEmpty = !loading && overview?.summary.totalPageViews === 0

  const deviceSegments = (overview?.devices ?? []).map((d) => ({
    label: d.device,
    value: d.count,
    color: DEVICE_COLORS[d.device] ?? "rgb(100,116,139)",
  }))

  return (
    <Layout admin>
      {/* Header */}
      <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-50">Analytics</h1>
          <p className="mt-1 text-sm text-slate-500">
            Visitor and engagement stats from your portfolio.
          </p>
        </div>
        <div className="flex rounded-lg border border-slate-800 bg-slate-900 p-1">
          {PERIODS.map(({ value, label }) => (
            <button
              key={value}
              onClick={() => setPeriod(value)}
              className={[
                "rounded-md px-3 py-1.5 text-xs font-medium transition-colors",
                period === value
                  ? "bg-slate-700 text-slate-100"
                  : "text-slate-500 hover:text-slate-300",
              ].join(" ")}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {error && (
        <div className="mb-6 rounded-lg border border-red-800 bg-red-900/20 px-4 py-3 text-sm text-red-400">
          {error}
        </div>
      )}

      {loading ? (
        <div className="animate-pulse space-y-6">
          <div className="grid grid-cols-3 gap-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-24 rounded-xl bg-slate-800/60" />
            ))}
          </div>
          <div className="h-56 rounded-xl bg-slate-800/60" />
          <div className="grid grid-cols-3 gap-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-52 rounded-xl bg-slate-800/60" />
            ))}
          </div>
          <div className="h-44 rounded-xl bg-slate-800/60" />
        </div>
      ) : isEmpty ? (
        <div className="rounded-xl border border-dashed border-slate-700 bg-slate-900/30 px-8 py-16 text-center">
          <p className="text-3xl">📊</p>
          <p className="mt-4 text-lg font-semibold text-slate-300">No data yet</p>
          <p className="mt-2 text-sm text-slate-500">
            Add the analytics tracker to your portfolio to start collecting data.
          </p>
          <pre className="mx-auto mt-6 max-w-md rounded-lg bg-slate-800 px-4 py-3 text-left text-xs text-slate-400">
            {`import { trackPageView } from "./lib/analytics"\n\n// call on every route change:\ntrackPageView(window.location.pathname)`}
          </pre>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Summary cards */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <Stat
              label="Unique visitors"
              value={overview?.summary.uniqueVisitors ?? null}
              accent="text-brand-400"
            />
            <Stat label="Page views" value={overview?.summary.totalPageViews ?? null} />
            <Stat
              label="Events"
              value={overview?.summary.totalEvents ?? null}
              accent="text-sky-400"
            />
          </div>

          {/* Time series */}
          <div className="overflow-hidden rounded-xl border border-slate-800 bg-slate-900/60">
            <div className="flex items-center justify-between border-b border-slate-800 px-5 py-3">
              <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                Visitors over time
              </h2>
              <div className="flex items-center gap-4 text-xs text-slate-600">
                <span className="flex items-center gap-1.5">
                  <span
                    className="inline-block h-2 w-4 rounded"
                    style={{ background: "var(--color-primary)" }}
                  />
                  Visitors
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="inline-block h-2 w-4 rounded bg-slate-500" />
                  Page views
                </span>
              </div>
            </div>
            <div className="px-2 py-4">
              <LineChart data={filledSeries} />
            </div>
          </div>

          {/* Top pages | Devices | Referrers */}
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
            <Section title="Top pages">
              <BarList
                items={(overview?.topPages ?? []).map((p) => ({
                  label: p.path,
                  value: p.views,
                }))}
              />
            </Section>

            <Section title="Devices">
              <DonutChart segments={deviceSegments} />
            </Section>

            <Section title="Referrers">
              <BarList
                items={(overview?.referrers ?? [])
                  .filter((r): r is { referrer: string; count: number } => r.referrer != null)
                  .map((r) => ({ label: r.referrer, value: r.count }))}
                color="rgb(56,189,248)"
              />
            </Section>
          </div>

          {/* Events by type */}
          {events && events.byType.length > 0 && (
            <Section title="Events by type">
              <div className="-m-5 divide-y divide-slate-800">
                {events.byType.map((e) => (
                  <div key={e.type} className="flex items-center justify-between px-5 py-3">
                    <span className="text-sm text-slate-400">
                      {EVENT_LABELS[e.type] ?? e.type}
                    </span>
                    <span className="tabular-nums text-sm font-medium text-slate-200">
                      {e.count.toLocaleString()}
                    </span>
                  </div>
                ))}
              </div>
            </Section>
          )}

          {/* Top clicked targets */}
          {events && events.topTargets.length > 0 && (
            <Section title="Top clicked links">
              <BarList
                items={events.topTargets
                  .filter((t): t is { target: string; count: number } => t.target != null)
                  .map((t) => ({ label: t.target, value: t.count }))}
                color="rgb(167,139,250)"
              />
            </Section>
          )}

          {/* Blog posts */}
          {content && content.posts.length > 0 && (
            <div className="overflow-hidden rounded-xl border border-slate-800 bg-slate-900/60">
              <div className="border-b border-slate-800 px-5 py-3">
                <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                  Blog posts
                </h2>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-800 text-xs text-slate-600">
                      <th className="px-5 py-2.5 text-left font-medium">Title</th>
                      <th className="px-5 py-2.5 text-right font-medium">Views</th>
                      <th className="px-5 py-2.5 text-right font-medium">Read completions</th>
                      <th className="px-5 py-2.5 text-right font-medium">Completion rate</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60">
                    {content.posts.map((p) => (
                      <tr
                        key={p.postId ?? p.slug}
                        className="transition-colors hover:bg-slate-900/40"
                      >
                        <td className="px-5 py-3 font-medium text-slate-200">
                          {p.title || p.slug}
                        </td>
                        <td className="px-5 py-3 text-right tabular-nums text-slate-300">
                          {p.views.toLocaleString()}
                        </td>
                        <td className="px-5 py-3 text-right tabular-nums text-slate-300">
                          {p.readCompletions.toLocaleString()}
                        </td>
                        <td className="px-5 py-3 text-right">
                          <span
                            className={[
                              "inline-block rounded-full px-2 py-0.5 text-xs font-medium",
                              p.completionRate >= 50
                                ? "bg-emerald-900/40 text-emerald-400"
                                : p.completionRate >= 25
                                  ? "bg-amber-900/30 text-amber-400"
                                  : "bg-slate-800 text-slate-500",
                            ].join(" ")}
                          >
                            {p.completionRate}%
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Projects */}
          {content && content.projects.length > 0 && (
            <div className="overflow-hidden rounded-xl border border-slate-800 bg-slate-900/60">
              <div className="border-b border-slate-800 px-5 py-3">
                <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                  Projects
                </h2>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-800 text-xs text-slate-600">
                      <th className="px-5 py-2.5 text-left font-medium">Title</th>
                      <th className="px-5 py-2.5 text-right font-medium">Views</th>
                      <th className="px-5 py-2.5 text-right font-medium">Outbound clicks</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60">
                    {content.projects.map((p) => (
                      <tr
                        key={p.projectId ?? p.slug}
                        className="transition-colors hover:bg-slate-900/40"
                      >
                        <td className="px-5 py-3 font-medium text-slate-200">
                          {p.title || p.slug}
                        </td>
                        <td className="px-5 py-3 text-right tabular-nums text-slate-300">
                          {p.views.toLocaleString()}
                        </td>
                        <td className="px-5 py-3 text-right tabular-nums text-slate-300">
                          {p.outboundClicks.toLocaleString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}
    </Layout>
  )
}

export default AnalyticsDashboard
