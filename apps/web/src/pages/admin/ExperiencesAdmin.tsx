import React, { useCallback, useEffect, useState } from "react"
import { Link } from "react-router-dom"
import { experiencesApi, ApiError } from "../../lib/api.js"
import type { Experience } from "../../types/index.js"
import { Layout } from "../../components/common/Layout.js"
import { SkeletonTableRows } from "../../components/common/Skeleton.js"

const formatDate = (iso: string) =>
  new Date(iso).toLocaleDateString("en", { year: "numeric", month: "short" })

const ExperiencesAdmin: React.FC = () => {
  const [experiences, setExperiences] = useState<Experience[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [dragId, setDragId] = useState<string | null>(null)
  const [savingOrder, setSavingOrder] = useState(false)

  const fetchExperiences = useCallback(() => {
    setLoading(true)
    experiencesApi
      .adminList()
      .then(({ data }) => setExperiences(data))
      .catch((err: Error) => setError(err.message))
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    fetchExperiences()
  }, [fetchExperiences])

  const handleDelete = async (exp: Experience) => {
    if (!confirm(`Delete "${exp.company} — ${exp.role}"? This cannot be undone.`)) return
    try {
      await experiencesApi.delete(exp.id)
      setExperiences((prev) => prev.filter((e) => e.id !== exp.id))
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Delete failed")
    }
  }

  const persistOrder = async (ordered: Experience[]) => {
    setSavingOrder(true)
    try {
      await experiencesApi.reorder(ordered.map((e) => e.id))
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Reorder failed")
      fetchExperiences()
    } finally {
      setSavingOrder(false)
    }
  }

  const reorder = (from: number, to: number) => {
    if (to < 0 || to >= experiences.length || from === to) return
    const next = [...experiences]
    const [moved] = next.splice(from, 1)
    if (!moved) return
    next.splice(to, 0, moved)
    setExperiences(next)
    void persistOrder(next)
  }

  const handleDrop = (targetId: string) => {
    if (!dragId || dragId === targetId) return
    const from = experiences.findIndex((e) => e.id === dragId)
    const to = experiences.findIndex((e) => e.id === targetId)
    setDragId(null)
    reorder(from, to)
  }

  return (
    <Layout admin>
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-50">Work Experience</h1>
          <p className="mt-1 text-sm text-slate-500">
            Drag rows to reorder{savingOrder ? " · saving…" : ""}
          </p>
        </div>
        <Link
          to="/admin/experiences/new"
          className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-500 transition-colors"
        >
          + New experience
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
              <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-slate-500">Position</th>
              <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-slate-500">Period</th>
              <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-slate-500">Translations</th>
              <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-slate-500">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <SkeletonTableRows cols={5} rows={4} />
            ) : experiences.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-12 text-center text-slate-500">
                  No experiences yet. Click "+ New experience" to add one.
                </td>
              </tr>
            ) : (
              experiences.map((exp, idx) => (
                <tr
                  key={exp.id}
                  draggable
                  onDragStart={() => setDragId(exp.id)}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={() => handleDrop(exp.id)}
                  onDragEnd={() => setDragId(null)}
                  className={[
                    "border-b border-slate-800/60 transition-colors",
                    dragId === exp.id ? "opacity-40" : "hover:bg-slate-800/30",
                  ].join(" ")}
                >
                  <td className="px-3 py-4 text-slate-600 cursor-grab active:cursor-grabbing select-none">⋮⋮</td>
                  <td className="px-4 py-4">
                    <div className="flex items-center gap-3">
                      {exp.logoUrl && (
                        <img
                          src={exp.logoUrl}
                          alt={exp.company}
                          className="h-8 w-8 rounded object-contain bg-slate-800 p-1"
                          onError={(e) => { (e.target as HTMLImageElement).style.display = "none" }}
                        />
                      )}
                      <div>
                        <p className="font-medium text-slate-100">{exp.role || <span className="text-slate-500 italic">No role set</span>}</p>
                        <p className="text-xs text-slate-500">
                          {exp.company}
                          {exp.location && ` · ${exp.location}`}
                        </p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-4 text-slate-400 text-xs">
                    {formatDate(exp.startDate)} →{" "}
                    {exp.endDate ? formatDate(exp.endDate) : <span className="text-emerald-400">Present</span>}
                  </td>
                  <td className="px-4 py-4">
                    <span className="rounded-full bg-slate-800 px-2 py-0.5 text-xs text-slate-400">
                      {exp.translationCount ?? exp.translations?.length ?? 0} lang
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
                        disabled={idx === experiences.length - 1}
                        className="text-slate-500 hover:text-slate-300 disabled:opacity-20"
                      >↓</button>
                      <Link
                        to={`/admin/experiences/${exp.id}/edit`}
                        className="text-slate-400 hover:text-slate-100 transition-colors"
                      >
                        Edit
                      </Link>
                      <button
                        onClick={() => void handleDelete(exp)}
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

export default ExperiencesAdmin
