import React, { useCallback, useEffect, useState } from "react"
import { Link } from "react-router-dom"
import { statsApi, activityApi, type CmsStats } from "../../lib/api.js"
import { Layout } from "../../components/common/Layout.js"
import { useAuth } from "../../context/AuthContext.js"
import { SkeletonStatCards, SkeletonTableRows } from "../../components/common/Skeleton.js"

interface ActivityEntry {
  id: string
  action: string
  entityTitle: string | null
  createdAt: string
  user: { name: string | null; email: string }
}

const relativeTime = (iso: string): string => {
  const diff = Date.now() - new Date(iso).getTime()
  const mins = Math.floor(diff / 60_000)
  const hours = Math.floor(diff / 3_600_000)
  const days = Math.floor(diff / 86_400_000)
  if (mins < 1) return "just now"
  if (mins < 60) return `${mins}m ago`
  if (hours < 24) return `${hours}h ago`
  return `${days}d ago`
}

const actionColor = (action: string) => {
  if (action.endsWith(".deleted")) return "text-red-400"
  if (action.endsWith(".published")) return "text-emerald-400"
  if (action.endsWith(".created")) return "text-brand-400"
  return "text-slate-400"
}

const ActionIcon: Record<string, string> = {
  "post.created": "✚",
  "post.updated": "✎",
  "post.published": "◉",
  "post.deleted": "✕",
  "page.created": "✚",
  "page.updated": "✎",
  "page.published": "◉",
  "page.deleted": "✕",
  "user.created": "👤",
  "user.deleted": "👤",
  "apikey.created": "🔑",
  "apikey.deleted": "🔑",
  "webhook.created": "⚡",
  "webhook.deleted": "⚡",
  "media.uploaded": "🖼",
  "media.deleted": "🖼",
}

const StatCard: React.FC<{
  label: string
  value: number | null
  sub?: string
  href?: string
  accent?: string
}> = ({ label, value, sub, href, accent = "text-slate-50" }) => {
  const content = (
    <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-5 transition-colors hover:border-slate-700">
      <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">{label}</p>
      <p className={`mt-2 text-3xl font-bold tabular-nums ${accent}`}>
        {value === null ? "—" : value.toLocaleString()}
      </p>
      {sub && <p className="mt-1 text-xs text-slate-600">{sub}</p>}
    </div>
  )
  return href ? <Link to={href}>{content}</Link> : <>{content}</>
}

const AdminDashboard: React.FC = () => {
  const { state } = useAuth()
  const role = state.status === "authenticated" ? state.user.role : null
  const userName = state.status === "authenticated" ? state.user.name : null

  const [stats, setStats] = useState<CmsStats | null>(null)
  const [statsLoading, setStatsLoad] = useState(true)
  const [activity, setActivity] = useState<ActivityEntry[]>([])
  const [actLoading, setActLoading] = useState(true)

  const fetchStats = useCallback(() => {
    setStatsLoad(true)
    statsApi
      .get()
      .then(({ data }) => setStats(data))
      .catch(() => {
        /* non-critical */
      })
      .finally(() => setStatsLoad(false))
  }, [])

  const fetchActivity = useCallback(() => {
    if (role !== "ADMIN") {
      setActLoading(false)
      return
    }
    setActLoading(true)
    activityApi
      .list()
      .then(({ data }) => setActivity(data as ActivityEntry[]))
      .catch(() => {
        /* non-critical */
      })
      .finally(() => setActLoading(false))
  }, [role])

  useEffect(() => {
    fetchStats()
    fetchActivity()
  }, [fetchStats, fetchActivity])

  const sp = stats?.posts
  const sg = stats?.pages

  return (
    <Layout admin>
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-50">Overview</h1>
          <p className="mt-1 text-sm text-slate-500">
            Welcome back{userName ? `, ${userName}` : ""}.
          </p>
        </div>
        <Link
          to="/admin/posts/new"
          className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700 transition-colors"
        >
          + New post
        </Link>
      </div>

      {statsLoading ? (
        <>
          <SkeletonStatCards count={4} />
          <div className="grid gap-6 lg:grid-cols-2">
            <SkeletonTableRows rows={5} cols={3} />
            <SkeletonTableRows rows={5} cols={3} />
          </div>
        </>
      ) : (
        <>
          <div className="mb-8 grid grid-cols-2 gap-4 lg:grid-cols-4">
            <StatCard
              label="Posts"
              value={sp?.total ?? null}
              sub={sp ? `${sp.published} published · ${sp.draft} draft` : undefined}
              href="/admin/posts"
              accent="text-brand-300"
            />
            <StatCard
              label="Pages"
              value={sg?.total ?? null}
              sub={sg ? `${sg.published} published · ${sg.draft} draft` : undefined}
              href="/admin/pages"
              accent="text-violet-400"
            />
            <StatCard
              label="Media files"
              value={stats?.media.total ?? null}
              href="/admin/media"
              accent="text-sky-400"
            />
            {role === "ADMIN" && (
              <StatCard
                label="Users"
                value={stats?.users.total ?? null}
                href="/admin/users"
                accent="text-emerald-400"
              />
            )}
          </div>

          <div className="grid gap-6 lg:grid-cols-3">
            {/* Recent posts */}
            <div className="rounded-xl border border-slate-800 bg-slate-900/60 overflow-hidden">
              <div className="flex items-center justify-between border-b border-slate-800 px-5 py-3">
                <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                  Recent posts
                </h2>
                <Link to="/admin/posts" className="text-xs text-brand-400 hover:underline">
                  View all →
                </Link>
              </div>
              {!stats?.recentPosts.length ? (
                <p className="px-5 py-6 text-sm text-slate-600">No posts yet.</p>
              ) : (
                <ul className="divide-y divide-slate-800">
                  {stats.recentPosts.map((p) => (
                    <li
                      key={p.id}
                      className="flex items-center justify-between gap-3 px-5 py-3 hover:bg-slate-900 transition-colors"
                    >
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-slate-200">{p.title}</p>
                        <p className="text-xs text-slate-600">{relativeTime(p.updatedAt)}</p>
                      </div>
                      <div className="flex shrink-0 items-center gap-2">
                        <span
                          className={[
                            "rounded-full px-2 py-0.5 text-[10px] font-medium",
                            p.status === "PUBLISHED"
                              ? "bg-emerald-900/40 text-emerald-400"
                              : "bg-amber-900/30 text-amber-500",
                          ].join(" ")}
                        >
                          {p.status === "PUBLISHED" ? "live" : "draft"}
                        </span>
                        <Link
                          to={`/admin/posts/${p.id}/edit`}
                          className="text-xs text-slate-500 hover:text-slate-300 transition-colors"
                        >
                          Edit
                        </Link>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div className="rounded-xl border border-slate-800 bg-slate-900/60 overflow-hidden">
              <div className="flex items-center justify-between border-b border-slate-800 px-5 py-3">
                <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                  Recent pages
                </h2>
                <Link to="/admin/pages" className="text-xs text-brand-400 hover:underline">
                  View all →
                </Link>
              </div>
              {!stats?.recentPages.length ? (
                <p className="px-5 py-6 text-sm text-slate-600">No pages yet.</p>
              ) : (
                <ul className="divide-y divide-slate-800">
                  {stats.recentPages.map((p) => (
                    <li
                      key={p.id}
                      className="flex items-center justify-between gap-3 px-5 py-3 hover:bg-slate-900 transition-colors"
                    >
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-slate-200">{p.title}</p>
                        <p className="font-mono text-xs text-slate-600">/{p.slug}</p>
                      </div>
                      <div className="flex shrink-0 items-center gap-2">
                        <span
                          className={[
                            "rounded-full px-2 py-0.5 text-[10px] font-medium",
                            p.status === "PUBLISHED"
                              ? "bg-emerald-900/40 text-emerald-400"
                              : "bg-amber-900/30 text-amber-500",
                          ].join(" ")}
                        >
                          {p.status === "PUBLISHED" ? "live" : "draft"}
                        </span>
                        <Link
                          to={`/admin/pages/${p.id}/edit`}
                          className="text-xs text-slate-500 hover:text-slate-300 transition-colors"
                        >
                          Edit
                        </Link>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {role === "ADMIN" && (
              <div className="rounded-xl border border-slate-800 bg-slate-900/60 overflow-hidden">
                <div className="border-b border-slate-800 px-5 py-3">
                  <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                    Activity log
                  </h2>
                </div>
                {actLoading ? (
                  <SkeletonTableRows rows={4} cols={2} />
                ) : activity.length === 0 ? (
                  <p className="px-5 py-6 text-sm text-slate-600">No activity yet.</p>
                ) : (
                  <ul className="max-h-96 overflow-y-auto divide-y divide-slate-800/60">
                    {activity.map((entry) => (
                      <li
                        key={entry.id}
                        className="flex items-start gap-2.5 px-5 py-3 hover:bg-slate-900 transition-colors"
                      >
                        <span className="mt-0.5 shrink-0 text-sm">
                          {ActionIcon[entry.action] ?? "•"}
                        </span>
                        <div className="min-w-0">
                          <p className={`text-xs font-medium ${actionColor(entry.action)}`}>
                            {entry.action}
                          </p>
                          {entry.entityTitle && (
                            <p className="truncate text-xs text-slate-500">{entry.entityTitle}</p>
                          )}
                          <p className="mt-0.5 text-xs text-slate-600">
                            {entry.user.name ?? entry.user.email} · {relativeTime(entry.createdAt)}
                          </p>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}
          </div>
        </>
      )}
    </Layout>
  )
}

export default AdminDashboard
