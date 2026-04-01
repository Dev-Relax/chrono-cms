import React, { useCallback, useEffect, useState } from "react"
import { Link } from "react-router-dom"
import { postsApi, bulkApi } from "../../lib/api.js"
import type { Post } from "../../types/index.js"
import { Layout } from "../../components/common/Layout.js"
import { SkeletonTableRows } from "../../components/common/Skeleton.js"

const PostsAdmin: React.FC = () => {
  const [posts, setPosts] = useState<Post[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [bulking, setBulking] = useState(false)
  const [bulkMsg, setBulkMsg] = useState<string | null>(null)
  const [statusFilter, setFilter] = useState<"" | "DRAFT" | "PUBLISHED">("")

  const fetchPosts = useCallback(() => {
    setLoading(true)
    postsApi
      .adminList({
        limit: 100,
        ...(statusFilter ? { status: statusFilter } : {}),
      })
      .then(({ data }) => {
        setPosts(data)
        setSelected(new Set())
      })
      .catch((err: Error) => setError(err.message))
      .finally(() => setLoading(false))
  }, [statusFilter])

  useEffect(() => {
    fetchPosts()
  }, [fetchPosts])

  const toggleAll = () =>
    setSelected(selected.size === posts.length ? new Set() : new Set(posts.map((p) => p.id)))

  const toggleOne = (id: string) =>
    setSelected((s) => {
      const n = new Set(s)
      n.has(id) ? n.delete(id) : n.add(id)
      return n
    })

  const doBulk = async (action: "publish" | "unpublish" | "delete") => {
    if (selected.size === 0) return
    if (action === "delete" && !confirm(`Delete ${selected.size} post(s)? This cannot be undone.`))
      return
    setBulking(true)
    try {
      const { affected } = await bulkApi.posts(action, Array.from(selected))
      setBulkMsg(`${action.charAt(0).toUpperCase() + action.slice(1)}d ${affected} post(s).`)
      fetchPosts()
    } catch (err) {
      setBulkMsg(`Error: ${(err as Error).message}`)
    } finally {
      setBulking(false)
      setTimeout(() => setBulkMsg(null), 4000)
    }
  }

  const handleDelete = async (post: Post) => {
    if (!confirm(`Delete "${post.title}"? This cannot be undone.`)) return
    try {
      await postsApi.delete(post.id)
      fetchPosts()
    } catch (err) {
      alert((err as Error).message)
    }
  }

  return (
    <Layout admin>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-50">Posts</h1>
          <p className="mt-1 text-sm text-slate-500">
            {posts.length} post{posts.length !== 1 ? "s" : ""}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <select
            value={statusFilter}
            onChange={(e) => setFilter(e.target.value as typeof statusFilter)}
            className="rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-slate-300
                       focus:border-brand-500 focus:outline-none"
          >
            <option value="">All statuses</option>
            <option value="PUBLISHED">Published</option>
            <option value="DRAFT">Draft</option>
          </select>
          <Link
            to="/admin/posts/new"
            className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700 transition-colors"
          >
            + New post
          </Link>
        </div>
      </div>

      {selected.size > 0 && (
        <div className="mb-4 flex items-center gap-3 rounded-xl border border-brand-700 bg-brand-900/20 px-4 py-3">
          <span className="text-sm font-medium text-brand-300">{selected.size} selected</span>
          <div className="ml-auto flex flex-wrap gap-2">
            <button
              onClick={() => void doBulk("publish")}
              disabled={bulking}
              className="rounded-md bg-emerald-900/40 px-3 py-1.5 text-xs font-medium text-emerald-400
                         hover:bg-emerald-900/70 disabled:opacity-50 transition-colors"
            >
              Publish
            </button>
            <button
              onClick={() => void doBulk("unpublish")}
              disabled={bulking}
              className="rounded-md bg-amber-900/30 px-3 py-1.5 text-xs font-medium text-amber-400
                         hover:bg-amber-900/60 disabled:opacity-50 transition-colors"
            >
              Unpublish
            </button>
            <button
              onClick={() => void doBulk("delete")}
              disabled={bulking}
              className="rounded-md bg-red-900/30 px-3 py-1.5 text-xs font-medium text-red-400
                         hover:bg-red-900/60 disabled:opacity-50 transition-colors"
            >
              Delete
            </button>
            <button
              onClick={() => setSelected(new Set())}
              className="rounded-md border border-slate-700 px-3 py-1.5 text-xs text-slate-400
                         hover:text-white transition-colors"
            >
              Clear
            </button>
          </div>
        </div>
      )}

      {bulkMsg && (
        <p className="mb-4 rounded-lg bg-slate-800 px-4 py-2 text-sm text-slate-300">{bulkMsg}</p>
      )}
      {error && (
        <p className="mb-4 rounded-lg bg-red-900/30 border border-red-800 px-4 py-3 text-sm text-red-400">
          {error}
        </p>
      )}

      {loading ? (
        <SkeletonTableRows rows={8} cols={5} />
      ) : posts.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-800 py-20 text-center">
          <p className="text-slate-500">
            No posts{statusFilter ? ` with status "${statusFilter}"` : ""} yet.
          </p>
          <Link
            to="/admin/posts/new"
            className="mt-3 inline-block text-sm text-brand-400 hover:underline"
          >
            Create your first post →
          </Link>
        </div>
      ) : (
        <div className="rounded-xl border border-slate-800 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-800 bg-slate-900">
                <th className="w-10 px-4 py-3">
                  <input
                    type="checkbox"
                    checked={selected.size === posts.length && posts.length > 0}
                    onChange={toggleAll}
                    className="rounded border-slate-600 bg-slate-800 accent-brand-500"
                  />
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-500">
                  Title
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-500">
                  Author
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-500">
                  Status
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-500">
                  Updated
                </th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {posts.map((post) => (
                <tr
                  key={post.id}
                  className={`transition-colors ${selected.has(post.id) ? "bg-brand-900/10" : "bg-slate-950 hover:bg-slate-900"}`}
                >
                  <td className="px-4 py-3">
                    <input
                      type="checkbox"
                      checked={selected.has(post.id)}
                      onChange={() => toggleOne(post.id)}
                      className="rounded border-slate-600 bg-slate-800 accent-brand-500"
                    />
                  </td>
                  <td className="px-4 py-3 max-w-xs">
                    <div className="flex items-center gap-2 min-w-0">
                      {post.featured && <span className="text-amber-400 text-xs shrink-0">★</span>}
                      <span className="font-medium text-slate-200 truncate">{post.title}</span>
                    </div>
                    <span className="font-mono text-xs text-slate-600 truncate block">
                      /{post.slug}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-xs text-slate-500 whitespace-nowrap">
                    {post.author.name ?? post.author.email}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    <StatusBadge status={post.status} />
                  </td>
                  <td className="px-4 py-3 text-xs text-slate-500 whitespace-nowrap">
                    {new Date(post.updatedAt).toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                    })}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-2 whitespace-nowrap">
                      {post.status === "PUBLISHED" && (
                        <Link
                          to={`/posts/${post.slug}`}
                          target="_blank"
                          className="text-xs text-slate-500 hover:text-slate-300 transition-colors"
                        >
                          View ↗
                        </Link>
                      )}
                      <Link
                        to={`/admin/posts/${post.id}/edit`}
                        className="rounded-md bg-slate-800 px-2.5 py-1 text-xs font-medium text-slate-300
                                   hover:bg-slate-700 hover:text-white transition-colors"
                      >
                        Edit
                      </Link>
                      <button
                        onClick={() => void handleDelete(post)}
                        className="rounded-md bg-red-900/30 px-2.5 py-1 text-xs font-medium text-red-400
                                   hover:bg-red-900/60 hover:text-red-300 transition-colors"
                      >
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Layout>
  )
}

const StatusBadge: React.FC<{ status: string }> = ({ status }) => (
  <span
    className={[
      "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium",
      status === "PUBLISHED"
        ? "bg-emerald-900/40 text-emerald-400"
        : "bg-amber-900/30 text-amber-500",
    ].join(" ")}
  >
    {status === "PUBLISHED" ? "● Published" : "○ Draft"}
  </span>
)

export default PostsAdmin
