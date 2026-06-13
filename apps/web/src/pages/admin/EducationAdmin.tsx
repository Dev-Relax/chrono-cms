import React, { useCallback, useEffect, useState } from "react"
import { Link } from "react-router-dom"
import { educationApi, ApiError } from "../../lib/api.js"
import type { Education } from "../../types/index.js"
import { Layout } from "../../components/common/Layout.js"
import { SkeletonTableRows } from "../../components/common/Skeleton.js"

const formatDate = (iso: string) =>
  new Date(iso).toLocaleDateString("en", { year: "numeric", month: "short" })

const EducationAdmin: React.FC = () => {
  const [entries, setEntries] = useState<Education[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [dragId, setDragId] = useState<string | null>(null)
  const [savingOrder, setSavingOrder] = useState(false)

  const fetchEntries = useCallback(() => {
    setLoading(true)
    educationApi
      .adminList()
      .then(({ data }) => setEntries(data))
      .catch((err: Error) => setError(err.message))
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    fetchEntries()
  }, [fetchEntries])

  const handleDelete = async (edu: Education) => {
    if (!confirm(`Delete "${edu.institution}"? This cannot be undone.`)) return
    try {
      await educationApi.delete(edu.id)
      setEntries((prev) => prev.filter((e) => e.id !== edu.id))
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Delete failed")
    }
  }

  const persistOrder = async (ordered: Education[]) => {
    setSavingOrder(true)
    try {
      await educationApi.reorder(ordered.map((e) => e.id))
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Reorder failed")
      fetchEntries()
    } finally {
      setSavingOrder(false)
    }
  }

  const reorder = (from: number, to: number) => {
    if (to < 0 || to >= entries.length || from === to) return
    const next = [...entries]
    const [moved] = next.splice(from, 1)
    if (!moved) return
    next.splice(to, 0, moved)
    setEntries(next)
    void persistOrder(next)
  }

  const handleDrop = (targetId: string) => {
    if (!dragId || dragId === targetId) return
    const from = entries.findIndex((e) => e.id === dragId)
    const to = entries.findIndex((e) => e.id === targetId)
    setDragId(null)
    reorder(from, to)
  }

  return (
    <Layout admin>
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-50">Education</h1>
          <p className="mt-1 text-sm text-slate-500">
            Drag rows to reorder{savingOrder ? " · saving…" : ""}
          </p>
        </div>
        <Link
          to="/admin/education/new"
          className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-500 transition-colors"
        >
          + New entry
        </Link>
      </div>

      {error && (
        <div className="mb-4 rounded-lg border border-red-800 bg-red-950 px-4 py-3 text-sm text-red-300">
          {error}
          <button onClick={() => setError(null)} className="ml-2 underline">dismiss</button>
        </div>
      )}

      <div className="rounded-xl border border-slate-800 bg-slate-900 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-800 text-left">
              <th className="w-8 px-4 py-3" />
              <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-slate-500">Degree / Institution</th>
              <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-slate-500">Period</th>
              <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-slate-500">Translations</th>
              <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-slate-500">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <SkeletonTableRows cols={5} rows={4} />
            ) : entries.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-12 text-center text-slate-500">
                  No education entries yet. Click "+ New entry" to add one.
                </td>
              </tr>
            ) : (
              entries.map((edu, idx) => (
                <tr
                  key={edu.id}
                  draggable
                  onDragStart={() => setDragId(edu.id)}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={() => handleDrop(edu.id)}
                  onDragEnd={() => setDragId(null)}
                  className={[
                    "border-b border-slate-800/60 transition-colors",
                    dragId === edu.id ? "opacity-40" : "hover:bg-slate-800/30",
                  ].join(" ")}
                >
                  <td className="px-3 py-4 text-slate-600 cursor-grab active:cursor-grabbing select-none">⋮⋮</td>
                  <td className="px-4 py-4">
                    <div className="flex items-center gap-3">
                      {edu.logoUrl && (
                        <img
                          src={edu.logoUrl}
                          alt={edu.institution}
                          className="h-8 w-8 rounded object-contain bg-slate-800 p-1"
                          onError={(e) => { (e.target as HTMLImageElement).style.display = "none" }}
                        />
                      )}
                      <div>
                        <p className="font-medium text-slate-100">
                          {edu.degree || <span className="text-slate-500 italic">No degree set</span>}
                        </p>
                        <p className="text-xs text-slate-500">
                          {edu.institution}
                          {edu.field && ` · ${edu.field}`}
                        </p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-4 text-slate-400 text-xs">
                    {formatDate(edu.startDate)} →{" "}
                    {edu.endDate ? formatDate(edu.endDate) : <span className="text-emerald-400">Present</span>}
                  </td>
                  <td className="px-4 py-4">
                    <span className="rounded-full bg-slate-800 px-2 py-0.5 text-xs text-slate-400">
                      {edu.translationCount ?? edu.translations?.length ?? 0} lang
                    </span>
                  </td>
                  <td className="px-4 py-4">
                    <div className="flex items-center gap-3">
                      <button
                        onClick={() => reorder(idx, idx - 1)}
                        disabled={idx === 0}
                        className="text-slate-500 hover:text-slate-300 disabled:opacity-20"
                      >↑</button>
                      <button
                        onClick={() => reorder(idx, idx + 1)}
                        disabled={idx === entries.length - 1}
                        className="text-slate-500 hover:text-slate-300 disabled:opacity-20"
                      >↓</button>
                      <Link
                        to={`/admin/education/${edu.id}/edit`}
                        className="text-slate-400 hover:text-slate-100 transition-colors"
                      >
                        Edit
                      </Link>
                      <button
                        onClick={() => void handleDelete(edu)}
                        className="text-red-500 hover:text-red-400 transition-colors"
                      >
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </Layout>
  )
}

export default EducationAdmin
