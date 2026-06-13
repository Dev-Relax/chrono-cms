import React, { useCallback, useEffect, useState } from "react"
import { contactApi, ApiError } from "../../lib/api.js"
import type { ContactSubmission, SubmissionStatus } from "../../types/index.js"
import { Layout } from "../../components/common/Layout.js"
import { SkeletonTableRows } from "../../components/common/Skeleton.js"

const STATUS_TABS: { label: string; value: SubmissionStatus | "ALL" }[] = [
  { label: "New", value: "NEW" },
  { label: "Read", value: "READ" },
  { label: "Archived", value: "ARCHIVED" },
  { label: "All", value: "ALL" },
]

const STATUS_BADGE: Record<SubmissionStatus, string> = {
  NEW: "bg-yellow-500/20 text-yellow-300 border border-yellow-700",
  READ: "bg-slate-700/40 text-slate-400 border border-slate-700",
  ARCHIVED: "bg-slate-800 text-slate-600 border border-slate-800",
}

const ContactAdmin: React.FC = () => {
  const [tab, setTab] = useState<SubmissionStatus | "ALL">("NEW")
  const [submissions, setSubmissions] = useState<ContactSubmission[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [expanded, setExpanded] = useState<string | null>(null)

  const limit = 25

  const fetchSubmissions = useCallback(() => {
    setLoading(true)
    contactApi
      .adminList(tab === "ALL" ? undefined : tab, page, limit)
      .then(({ data, meta }) => {
        setSubmissions(data)
        setTotal(meta.total)
      })
      .catch((err: Error) => setError(err.message))
      .finally(() => setLoading(false))
  }, [tab, page])

  useEffect(() => {
    setPage(1)
  }, [tab])

  useEffect(() => {
    fetchSubmissions()
  }, [fetchSubmissions])

  const setStatus = async (sub: ContactSubmission, status: SubmissionStatus) => {
    try {
      const { data } = await contactApi.moderate(sub.id, status)
      setSubmissions((prev) => prev.map((s) => (s.id === sub.id ? data : s)))
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Update failed")
    }
  }

  const handleDelete = async (sub: ContactSubmission) => {
    if (!confirm(`Delete message from "${sub.name}"? This cannot be undone.`)) return
    try {
      await contactApi.delete(sub.id)
      setSubmissions((prev) => prev.filter((s) => s.id !== sub.id))
      setTotal((t) => t - 1)
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Delete failed")
    }
  }

  const toggleExpand = async (sub: ContactSubmission) => {
    const next = expanded === sub.id ? null : sub.id
    setExpanded(next)
    if (next && sub.status === "NEW") {
      await setStatus(sub, "READ")
    }
  }

  const totalPages = Math.ceil(total / limit)

  return (
    <Layout admin>
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-50">Contact</h1>
          <p className="mt-1 text-sm text-slate-500">{total} submission{total !== 1 ? "s" : ""}</p>
        </div>
      </div>

      {error && (
        <div className="mb-4 rounded-lg border border-red-800 bg-red-950 px-4 py-3 text-sm text-red-300">
          {error}
          <button onClick={() => setError(null)} className="ml-2 underline">dismiss</button>
        </div>
      )}

      {/* Tabs */}
      <div className="mb-4 flex gap-1 border-b border-slate-800">
        {STATUS_TABS.map((t) => (
          <button
            key={t.value}
            onClick={() => setTab(t.value)}
            className={[
              "px-4 py-2 text-sm font-medium transition-colors border-b-2 -mb-px",
              tab === t.value
                ? "border-brand-500 text-brand-300"
                : "border-transparent text-slate-500 hover:text-slate-300",
            ].join(" ")}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="rounded-xl border border-slate-800 bg-slate-900 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-800 text-left">
              <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-slate-500">From</th>
              <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-slate-500">Subject</th>
              <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-slate-500">Status</th>
              <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-slate-500">Date</th>
              <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-slate-500">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <SkeletonTableRows cols={5} rows={6} />
            ) : submissions.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-12 text-center text-slate-500">
                  No submissions{tab !== "ALL" ? ` with status "${tab}"` : ""}.
                </td>
              </tr>
            ) : (
              submissions.map((sub) => (
                <React.Fragment key={sub.id}>
                  <tr
                    className={[
                      "border-b border-slate-800/60 cursor-pointer transition-colors",
                      sub.status === "NEW" ? "bg-yellow-500/5" : "",
                      expanded === sub.id ? "bg-slate-800/50" : "hover:bg-slate-800/30",
                    ].join(" ")}
                    onClick={() => void toggleExpand(sub)}
                  >
                    {/* From */}
                    <td className="px-4 py-4">
                      <p className={`font-medium ${sub.status === "NEW" ? "text-slate-100" : "text-slate-300"}`}>
                        {sub.name}
                      </p>
                      <a
                        href={`mailto:${sub.email}`}
                        onClick={(e) => e.stopPropagation()}
                        className="text-xs text-brand-400 hover:underline"
                      >
                        {sub.email}
                      </a>
                    </td>

                    {/* Subject */}
                    <td className="px-4 py-4 max-w-xs">
                      <p className="truncate text-slate-400 text-xs">
                        {sub.subject ?? <em className="text-slate-600">No subject</em>}
                      </p>
                    </td>

                    {/* Status */}
                    <td className="px-4 py-4">
                      <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_BADGE[sub.status]}`}>
                        {sub.status}
                      </span>
                    </td>

                    {/* Date */}
                    <td className="px-4 py-4 text-xs text-slate-500 whitespace-nowrap">
                      {new Date(sub.createdAt).toLocaleDateString(undefined, {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      })}
                    </td>

                    {/* Actions */}
                    <td className="px-4 py-4" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center gap-2">
                        {sub.status !== "ARCHIVED" && (
                          <button
                            onClick={() => void setStatus(sub, "ARCHIVED")}
                            className="text-xs text-slate-500 hover:text-slate-300 transition-colors"
                          >
                            Archive
                          </button>
                        )}
                        {sub.status === "ARCHIVED" && (
                          <button
                            onClick={() => void setStatus(sub, "READ")}
                            className="text-xs text-slate-500 hover:text-slate-300 transition-colors"
                          >
                            Unarchive
                          </button>
                        )}
                        <button
                          onClick={() => void handleDelete(sub)}
                          className="text-xs text-red-500 hover:text-red-400 transition-colors"
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>

                  {/* Expanded message */}
                  {expanded === sub.id && (
                    <tr className="border-b border-slate-800/60 bg-slate-800/30">
                      <td colSpan={5} className="px-6 py-5">
                        {sub.subject && (
                          <p className="mb-3 text-sm font-medium text-slate-300">{sub.subject}</p>
                        )}
                        <p className="whitespace-pre-wrap text-sm text-slate-400 leading-relaxed">
                          {sub.message}
                        </p>
                        <div className="mt-4 flex gap-2">
                          <a
                            href={`mailto:${sub.email}?subject=Re: ${encodeURIComponent(sub.subject ?? "")}`}
                            className="rounded-lg bg-brand-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-brand-500 transition-colors"
                          >
                            Reply by email
                          </a>
                          {sub.status !== "ARCHIVED" && (
                            <button
                              onClick={() => void setStatus(sub, "ARCHIVED")}
                              className="rounded-lg border border-slate-700 px-3 py-1.5 text-xs text-slate-400 hover:text-slate-200 transition-colors"
                            >
                              Archive
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="mt-4 flex items-center justify-between text-sm text-slate-500">
          <span>
            Page {page} of {totalPages}
          </span>
          <div className="flex gap-2">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="rounded border border-slate-700 px-3 py-1.5 hover:border-slate-600 disabled:opacity-30 transition-colors"
            >
              ← Prev
            </button>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="rounded border border-slate-700 px-3 py-1.5 hover:border-slate-600 disabled:opacity-30 transition-colors"
            >
              Next →
            </button>
          </div>
        </div>
      )}
    </Layout>
  )
}

export default ContactAdmin
