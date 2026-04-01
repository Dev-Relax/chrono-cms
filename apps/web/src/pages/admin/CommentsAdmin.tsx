import React, { useEffect, useState, useCallback } from "react"
import { Link } from "react-router-dom"
import { Layout } from "../../components/common/Layout.js"
import { commentsApi } from "../../lib/api.js"
import type { Comment, CommentStatus } from "../../types/index.js"
import { SkeletonTableRows } from "../../components/common/Skeleton.js"

const STATUS_TABS: { key: CommentStatus; label: string }[] = [
  { key: "PENDING", label: "Pending" },
  { key: "APPROVED", label: "Approved" },
  { key: "SPAM", label: "Spam" },
  { key: "REJECTED", label: "Rejected" },
]

const STATUS_BADGE: Record<CommentStatus, string> = {
  PENDING: "bg-yellow-500/15 text-yellow-400 border-yellow-500/30",
  APPROVED: "bg-green-500/15  text-green-400  border-green-500/30",
  SPAM: "bg-red-500/15    text-red-400    border-red-500/30",
  REJECTED: "bg-slate-700/40  text-slate-400  border-slate-600/40",
}

const fmt = (iso: string) =>
  new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  })

const CommentsAdmin: React.FC = () => {
  const [activeTab, setActiveTab] = useState<CommentStatus>("PENDING")
  const [comments, setComments] = useState<Comment[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [actionBusy, setActionBusy] = useState(false)
  const [toast, setToast] = useState<string | null>(null)
  const [pendingCount, setPendingCount] = useState(0)

  const showToast = (msg: string) => {
    setToast(msg)
    setTimeout(() => setToast(null), 3000)
  }

  const fetchComments = useCallback(async (tab: CommentStatus, pg: number) => {
    setLoading(true)
    setSelected(new Set())
    try {
      const res = await commentsApi.adminList({
        status: tab,
        page: pg,
        limit: 25,
      })
      setComments(res.data)
      setTotal(res.meta.total)
      setTotalPages(res.meta.totalPages)
    } catch {
      setComments([])
    } finally {
      setLoading(false)
    }
  }, [])

  const fetchPendingCount = useCallback(async () => {
    try {
      const { count } = await commentsApi.pendingCount()
      setPendingCount(count)
    } catch {
      /* non-critical */
    }
  }, [])

  useEffect(() => {
    void fetchComments(activeTab, page)
  }, [activeTab, page, fetchComments])

  useEffect(() => {
    void fetchPendingCount()
  }, [fetchPendingCount, comments]) // refresh badge after any mutation

  const switchTab = (tab: CommentStatus) => {
    setActiveTab(tab)
    setPage(1)
  }

  const toggleOne = (id: string) =>
    setSelected((prev) => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })

  const toggleAll = () =>
    setSelected((prev) =>
      prev.size === comments.length ? new Set() : new Set(comments.map((c) => c.id)),
    )

  const runBulk = async (action: "approve" | "reject" | "spam" | "delete", ids?: string[]) => {
    const targets = ids ?? [...selected]
    if (targets.length === 0) return
    setActionBusy(true)
    try {
      const { affected } = await commentsApi.bulk(action, targets)
      showToast(`${affected} comment${affected !== 1 ? "s" : ""} ${action}d.`)
      void fetchComments(activeTab, page)
    } catch (err: unknown) {
      showToast(err instanceof Error ? err.message : "Action failed.")
    } finally {
      setActionBusy(false)
    }
  }

  const runSingle = async (id: string, action: "approve" | "reject" | "spam" | "delete") => {
    setActionBusy(true)
    try {
      if (action === "delete") {
        await commentsApi.delete(id)
        showToast("Comment deleted.")
      } else {
        const statusMap = {
          approve: "APPROVED",
          reject: "REJECTED",
          spam: "SPAM",
        } as const
        await commentsApi.moderate(id, statusMap[action])
        showToast(`Comment marked as ${statusMap[action].toLowerCase()}.`)
      }
      void fetchComments(activeTab, page)
    } catch (err: unknown) {
      showToast(err instanceof Error ? err.message : "Action failed.")
    } finally {
      setActionBusy(false)
    }
  }

  const allSelected = comments.length > 0 && selected.size === comments.length

  return (
    <Layout admin>
      {toast && (
        <div
          className="fixed bottom-6 right-6 z-50 rounded-xl border border-brand-500/40
                        bg-slate-900 px-5 py-3 text-sm text-slate-200 shadow-xl
                        shadow-black/40 animate-fade-in"
        >
          {toast}
        </div>
      )}

      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-100">Comments</h1>
          <p className="mt-0.5 text-sm text-slate-500">Moderate reader comments across all posts</p>
        </div>
        {pendingCount > 0 && (
          <span
            className="rounded-full bg-yellow-500/15 border border-yellow-500/30
                           px-3 py-1 text-sm font-medium text-yellow-400"
          >
            {pendingCount} awaiting review
          </span>
        )}
      </div>

      <div className="mb-6 flex gap-1 rounded-xl border border-slate-800 bg-slate-900/40 p-1">
        {STATUS_TABS.map(({ key, label }) => (
          <button
            key={key}
            onClick={() => switchTab(key)}
            className={[
              "flex-1 rounded-lg px-4 py-2 text-sm font-medium transition-all",
              activeTab === key
                ? "bg-slate-800 text-slate-100 shadow-sm"
                : "text-slate-500 hover:text-slate-300",
            ].join(" ")}
          >
            {label}
            {key === "PENDING" && pendingCount > 0 && (
              <span
                className="ml-1.5 rounded-full bg-yellow-500 px-1.5 py-0.5
                               text-[10px] font-bold text-black"
              >
                {pendingCount}
              </span>
            )}
          </button>
        ))}
      </div>

      <div className="mb-4 flex items-center gap-3">
        <label className="flex cursor-pointer items-center gap-2 text-sm text-slate-500">
          <input
            type="checkbox"
            checked={allSelected}
            onChange={toggleAll}
            className="h-4 w-4 rounded border-slate-600 bg-slate-800 text-brand-500"
          />
          {selected.size > 0 ? `${selected.size} selected` : "Select all"}
        </label>

        {selected.size > 0 && (
          <div className="flex items-center gap-2 border-l border-slate-800 pl-3">
            {activeTab !== "APPROVED" && (
              <button
                disabled={actionBusy}
                onClick={() => void runBulk("approve")}
                className="rounded-lg bg-green-600/20 border border-green-500/30 px-3 py-1.5
                           text-xs font-medium text-green-400 hover:bg-green-600/30
                           disabled:opacity-50 transition-colors"
              >
                ✓ Approve
              </button>
            )}
            {activeTab !== "REJECTED" && (
              <button
                disabled={actionBusy}
                onClick={() => void runBulk("reject")}
                className="rounded-lg bg-slate-700/40 border border-slate-600/40 px-3 py-1.5
                           text-xs font-medium text-slate-400 hover:bg-slate-700/60
                           disabled:opacity-50 transition-colors"
              >
                ✕ Reject
              </button>
            )}
            {activeTab !== "SPAM" && (
              <button
                disabled={actionBusy}
                onClick={() => void runBulk("spam")}
                className="rounded-lg bg-orange-500/15 border border-orange-500/30 px-3 py-1.5
                           text-xs font-medium text-orange-400 hover:bg-orange-500/25
                           disabled:opacity-50 transition-colors"
              >
                ⚑ Spam
              </button>
            )}
            <button
              disabled={actionBusy}
              onClick={() => void runBulk("delete")}
              className="rounded-lg bg-red-600/15 border border-red-500/30 px-3 py-1.5
                         text-xs font-medium text-red-400 hover:bg-red-600/25
                         disabled:opacity-50 transition-colors"
            >
              ␡ Delete
            </button>

            {/* Approve-all shortcut when on Pending tab */}
            {activeTab === "PENDING" && (
              <button
                disabled={actionBusy}
                onClick={() =>
                  void runBulk(
                    "approve",
                    comments.map((c) => c.id),
                  )
                }
                className="ml-1 rounded-lg bg-brand-600/20 border border-brand-500/30 px-3 py-1.5
                           text-xs font-medium text-brand-300 hover:bg-brand-600/30
                           disabled:opacity-50 transition-colors"
              >
                ✓✓ Approve all {comments.length}
              </button>
            )}
          </div>
        )}

        <span className="ml-auto text-xs text-slate-600">
          {total} comment{total !== 1 ? "s" : ""}
        </span>
      </div>

      {loading ? (
        <SkeletonTableRows rows={7} cols={4} />
      ) : comments.length === 0 ? (
        <div className="rounded-xl border border-slate-800 bg-slate-900/30 px-6 py-12 text-center">
          <p className="text-sm text-slate-500">No {activeTab.toLowerCase()} comments.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {comments.map((comment) => (
            <div
              key={comment.id}
              className={[
                "group flex items-start gap-3 rounded-xl border p-4 transition-all",
                selected.has(comment.id)
                  ? "border-brand-500/40 bg-brand-500/5"
                  : "border-slate-800 bg-slate-900/40 hover:border-slate-700",
              ].join(" ")}
            >
              <input
                type="checkbox"
                checked={selected.has(comment.id)}
                onChange={() => toggleOne(comment.id)}
                className="mt-1 h-4 w-4 shrink-0 rounded border-slate-600 bg-slate-800 text-brand-500"
              />

              <div
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full
                              bg-brand-700/50 text-xs font-bold text-brand-200"
              >
                {comment.authorName.charAt(0).toUpperCase()}
              </div>

              <div className="min-w-0 flex-1">
                <div className="mb-1 flex flex-wrap items-center gap-2">
                  <span className="text-sm font-medium text-slate-200">{comment.authorName}</span>
                  <span className="text-xs text-slate-500">{comment.authorEmail}</span>
                  <span
                    className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold
                                uppercase tracking-wider ${STATUS_BADGE[comment.status]}`}
                  >
                    {comment.status}
                  </span>
                  {comment.parentId && <span className="text-[10px] text-slate-600">↩ reply</span>}
                  <span className="ml-auto text-xs text-slate-600">{fmt(comment.createdAt)}</span>
                </div>

                <p className="mb-2 whitespace-pre-wrap text-sm text-slate-400 leading-relaxed">
                  {comment.content}
                </p>

                {comment.post && (
                  <Link
                    to={`/posts/${comment.post.slug}`}
                    target="_blank"
                    className="text-xs text-slate-600 hover:text-brand-400 transition-colors"
                  >
                    ↗ {comment.post.title}
                  </Link>
                )}
              </div>

              <div className="flex shrink-0 flex-col gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                {activeTab !== "APPROVED" && (
                  <button
                    disabled={actionBusy}
                    onClick={() => void runSingle(comment.id, "approve")}
                    title="Approve"
                    className="rounded-lg border border-green-500/30 bg-green-600/10 px-2.5 py-1
                               text-xs text-green-400 hover:bg-green-600/20 disabled:opacity-50
                               transition-colors"
                  >
                    ✓
                  </button>
                )}
                {activeTab !== "SPAM" && (
                  <button
                    disabled={actionBusy}
                    onClick={() => void runSingle(comment.id, "spam")}
                    title="Mark spam"
                    className="rounded-lg border border-orange-500/30 bg-orange-500/10 px-2.5 py-1
                               text-xs text-orange-400 hover:bg-orange-500/20 disabled:opacity-50
                               transition-colors"
                  >
                    ⚑
                  </button>
                )}
                {activeTab !== "REJECTED" && (
                  <button
                    disabled={actionBusy}
                    onClick={() => void runSingle(comment.id, "reject")}
                    title="Reject"
                    className="rounded-lg border border-slate-600/40 bg-slate-700/20 px-2.5 py-1
                               text-xs text-slate-400 hover:bg-slate-700/40 disabled:opacity-50
                               transition-colors"
                  >
                    ✕
                  </button>
                )}
                <button
                  disabled={actionBusy}
                  onClick={() => void runSingle(comment.id, "delete")}
                  title="Delete"
                  className="rounded-lg border border-red-500/30 bg-red-600/10 px-2.5 py-1
                             text-xs text-red-400 hover:bg-red-600/20 disabled:opacity-50
                             transition-colors"
                >
                  ␡
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {totalPages > 1 && (
        <div className="mt-6 flex items-center justify-center gap-2">
          <button
            disabled={page <= 1}
            onClick={() => setPage((p) => p - 1)}
            className="rounded-lg border border-slate-800 px-3 py-1.5 text-sm text-slate-400
                       hover:border-slate-700 hover:text-slate-200 disabled:opacity-40
                       transition-colors"
          >
            ← Prev
          </button>
          <span className="text-sm text-slate-500">
            {page} / {totalPages}
          </span>
          <button
            disabled={page >= totalPages}
            onClick={() => setPage((p) => p + 1)}
            className="rounded-lg border border-slate-800 px-3 py-1.5 text-sm text-slate-400
                       hover:border-slate-700 hover:text-slate-200 disabled:opacity-40
                       transition-colors"
          >
            Next →
          </button>
        </div>
      )}
    </Layout>
  )
}

export default CommentsAdmin
