import React, { useCallback, useEffect, useState } from "react"
import { Link } from "react-router-dom"
import { projectsApi, resolveMediaUrl, ApiError } from "../../lib/api.js"
import type { Project } from "../../types/index.js"
import { Layout } from "../../components/common/Layout.js"
import { SkeletonTableRows } from "../../components/common/Skeleton.js"

const ProjectsAdmin: React.FC = () => {
  const [projects, setProjects] = useState<Project[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [dragId, setDragId] = useState<string | null>(null)
  const [savingOrder, setSavingOrder] = useState(false)

  const fetchProjects = useCallback(() => {
    setLoading(true)
    projectsApi
      .adminList()
      .then(({ data }) => setProjects(data))
      .catch((err: Error) => setError(err.message))
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    fetchProjects()
  }, [fetchProjects])

  const handleDelete = async (project: Project) => {
    if (!confirm(`Delete project "${project.title}"? This cannot be undone.`)) return
    try {
      await projectsApi.delete(project.id)
      setProjects((prev) => prev.filter((p) => p.id !== project.id))
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Delete failed")
    }
  }

  // Persist the current order to the API (fire-and-forget with error surface).
  const persistOrder = async (ordered: Project[]) => {
    setSavingOrder(true)
    try {
      await projectsApi.reorder(ordered.map((p) => p.id))
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Reorder failed")
      fetchProjects() // revert to server truth
    } finally {
      setSavingOrder(false)
    }
  }

  const reorder = (from: number, to: number) => {
    if (to < 0 || to >= projects.length || from === to) return
    const next = [...projects]
    const [moved] = next.splice(from, 1)
    if (!moved) return
    next.splice(to, 0, moved)
    setProjects(next)
    void persistOrder(next)
  }

  const handleDrop = (targetId: string) => {
    if (!dragId || dragId === targetId) return
    const from = projects.findIndex((p) => p.id === dragId)
    const to = projects.findIndex((p) => p.id === targetId)
    setDragId(null)
    reorder(from, to)
  }

  return (
    <Layout admin>
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-50">Projects</h1>
          <p className="mt-1 text-sm text-slate-500">
            Portfolio items — drag rows to reorder{savingOrder ? " · saving…" : ""}
          </p>
        </div>
        <Link
          to="/admin/projects/new"
          className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white
                     hover:bg-brand-700 transition-colors"
        >
          + New project
        </Link>
      </div>

      {error && (
        <p className="mb-4 rounded-lg bg-red-900/30 border border-red-800 px-4 py-3 text-sm text-red-400">
          {error}
        </p>
      )}

      {loading ? (
        <SkeletonTableRows rows={6} cols={4} />
      ) : projects.length === 0 ? (
        <p className="text-center text-slate-500 py-20">No projects yet.</p>
      ) : (
        <div className="rounded-xl border border-slate-800 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-800 bg-slate-900">
                <th className="w-10 px-2 py-3" />
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-500">
                  Project
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-500">
                  Tech
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-500">
                  Status
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-slate-500">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {projects.map((project, index) => (
                <tr
                  key={project.id}
                  draggable
                  onDragStart={() => setDragId(project.id)}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={() => handleDrop(project.id)}
                  className={[
                    "bg-slate-950 hover:bg-slate-900 transition-colors",
                    dragId === project.id ? "opacity-40" : "",
                  ].join(" ")}
                >
                  <td className="px-2 py-3 text-center align-middle">
                    <div className="flex flex-col items-center gap-0.5">
                      <span
                        className="cursor-grab select-none text-slate-600 hover:text-slate-400"
                        title="Drag to reorder"
                      >
                        ⠿
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      {project.coverImage ? (
                        <img
                          src={resolveMediaUrl(project.coverImage)}
                          alt=""
                          className="h-9 w-12 shrink-0 rounded object-cover border border-slate-700"
                        />
                      ) : (
                        <div
                          className="h-9 w-12 shrink-0 rounded border border-slate-800"
                          style={{
                            background:
                              "linear-gradient(135deg, rgb(var(--color-primary-rgb) / 0.3), rgb(var(--color-surface-rgb) / 0.9))",
                          }}
                        />
                      )}
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          {project.featured && (
                            <span title="Featured" className="text-amber-400 text-xs">
                              ★
                            </span>
                          )}
                          <span className="font-medium text-slate-200">{project.title}</span>
                          <span className="font-mono text-xs text-slate-600">/{project.slug}</span>
                          {(project.translationCount ?? 0) > 1 && (
                            <span className="inline-flex items-center rounded-full bg-brand-600/20 px-1.5 py-0.5 text-[10px] font-semibold text-brand-400">
                              {project.translationCount} langs
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    {project.techStack.length > 0 ? (
                      <span className="inline-flex items-center rounded-full bg-slate-800 px-2 py-0.5 text-xs text-slate-400">
                        {project.techStack.length} chip{project.techStack.length > 1 ? "s" : ""}
                      </span>
                    ) : (
                      <span className="text-xs text-slate-700">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={[
                        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium",
                        project.status === "PUBLISHED"
                          ? "bg-emerald-900/40 text-emerald-400"
                          : "bg-amber-900/30 text-amber-500",
                      ].join(" ")}
                    >
                      {project.status === "PUBLISHED" ? "● Published" : "○ Draft"}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-2">
                      <div className="mr-1 flex flex-col leading-none">
                        <button
                          onClick={() => reorder(index, index - 1)}
                          disabled={index === 0}
                          title="Move up"
                          className="text-[10px] text-slate-600 hover:text-slate-300 disabled:opacity-30"
                        >
                          ▲
                        </button>
                        <button
                          onClick={() => reorder(index, index + 1)}
                          disabled={index === projects.length - 1}
                          title="Move down"
                          className="text-[10px] text-slate-600 hover:text-slate-300 disabled:opacity-30"
                        >
                          ▼
                        </button>
                      </div>
                      {project.status === "PUBLISHED" && (
                        <Link
                          to={`/projects/${project.slug}`}
                          target="_blank"
                          className="text-xs text-slate-500 hover:text-slate-300 transition-colors"
                        >
                          View ↗
                        </Link>
                      )}
                      <Link
                        to={`/admin/projects/${project.id}/edit`}
                        className="rounded-md bg-slate-800 px-2.5 py-1 text-xs font-medium
                                   text-slate-300 hover:bg-slate-700 hover:text-white transition-colors"
                      >
                        Edit
                      </Link>
                      <button
                        onClick={() => handleDelete(project)}
                        className="rounded-md bg-red-900/30 px-2.5 py-1 text-xs font-medium
                                   text-red-400 hover:bg-red-900/60 transition-colors"
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

export default ProjectsAdmin
