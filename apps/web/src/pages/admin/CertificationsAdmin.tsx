import React, { useCallback, useEffect, useRef, useState } from "react"
import { certificationsApi, ApiError } from "../../lib/api.js"
import type { Certification } from "../../types/index.js"
import { Layout } from "../../components/common/Layout.js"
import { SkeletonTableRows } from "../../components/common/Skeleton.js"

const emptyForm = {
  title: "",
  issuer: "",
  issuedAt: "",
  expiresAt: "",
  credentialUrl: "",
  logoUrl: "",
}

const inputCls =
  "w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm " +
  "text-slate-100 placeholder-slate-600 focus:border-brand-500 focus:outline-none"

const fmtDate = (iso: string): string => {
  if (!iso) return ""
  return new Date(iso).toLocaleDateString(undefined, { year: "numeric", month: "short" })
}

const toInputDate = (iso: string | null | undefined): string => {
  if (!iso) return ""
  return iso.split("T")[0] ?? ""
}

const CertificationsAdmin: React.FC = () => {
  const [certs, setCerts] = useState<Certification[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [dragId, setDragId] = useState<string | null>(null)
  const [savingOrder, setSavingOrder] = useState(false)
  const [editingId, setEditingId] = useState<string | "new" | null>(null)
  const [form, setForm] = useState(emptyForm)
  const [saving, setSaving] = useState(false)
  const titleRef = useRef<HTMLInputElement>(null)

  const fetchCerts = useCallback(() => {
    setLoading(true)
    certificationsApi
      .adminList()
      .then(({ data }) => setCerts(data))
      .catch((err: Error) => setError(err.message))
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => { fetchCerts() }, [fetchCerts])

  useEffect(() => {
    if (editingId !== null) titleRef.current?.focus()
  }, [editingId])

  const openNew = () => {
    setForm(emptyForm)
    setEditingId("new")
  }

  const openEdit = (c: Certification) => {
    setForm({
      title: c.title,
      issuer: c.issuer,
      issuedAt: toInputDate(c.issuedAt),
      expiresAt: toInputDate(c.expiresAt),
      credentialUrl: c.credentialUrl ?? "",
      logoUrl: c.logoUrl ?? "",
    })
    setEditingId(c.id)
  }

  const closeForm = () => { setEditingId(null); setForm(emptyForm) }

  const set = <K extends keyof typeof emptyForm>(key: K, value: string) =>
    setForm((f) => ({ ...f, [key]: value }))

  const handleSave = async () => {
    if (!form.title.trim()) { setError("Title is required"); return }
    if (!form.issuer.trim()) { setError("Issuer is required"); return }
    if (!form.issuedAt) { setError("Issue date is required"); return }
    setSaving(true)
    setError(null)
    try {
      const payload = {
        title: form.title.trim(),
        issuer: form.issuer.trim(),
        issuedAt: new Date(form.issuedAt).toISOString(),
        expiresAt: form.expiresAt ? new Date(form.expiresAt).toISOString() : null,
        credentialUrl: form.credentialUrl.trim() || null,
        logoUrl: form.logoUrl.trim() || null,
      }
      if (editingId === "new") {
        const { data } = await certificationsApi.create(payload)
        setCerts((prev) => [...prev, data])
      } else if (editingId) {
        const { data } = await certificationsApi.update(editingId, payload)
        setCerts((prev) => prev.map((c) => (c.id === editingId ? data : c)))
      }
      closeForm()
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Save failed")
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (c: Certification) => {
    if (!confirm(`Delete "${c.title}"? This cannot be undone.`)) return
    try {
      await certificationsApi.delete(c.id)
      setCerts((prev) => prev.filter((x) => x.id !== c.id))
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Delete failed")
    }
  }

  const persistOrder = async (ordered: Certification[]) => {
    setSavingOrder(true)
    try {
      await certificationsApi.reorder(ordered.map((c) => c.id))
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Reorder failed")
      fetchCerts()
    } finally {
      setSavingOrder(false)
    }
  }

  const reorder = (from: number, to: number) => {
    if (to < 0 || to >= certs.length || from === to) return
    const next = [...certs]
    const [moved] = next.splice(from, 1)
    if (!moved) return
    next.splice(to, 0, moved)
    setCerts(next)
    void persistOrder(next)
  }

  const handleDrop = (targetId: string) => {
    if (!dragId || dragId === targetId) return
    const from = certs.findIndex((c) => c.id === dragId)
    const to = certs.findIndex((c) => c.id === targetId)
    setDragId(null)
    reorder(from, to)
  }

  const isExpired = (expiresAt: string | null): boolean =>
    !!expiresAt && new Date(expiresAt) < new Date()

  return (
    <Layout admin>
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-50">Certifications</h1>
          <p className="mt-1 text-sm text-slate-500">
            Drag rows to reorder{savingOrder ? " · saving…" : ""}
          </p>
        </div>
        <button
          onClick={openNew}
          className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-500 transition-colors"
        >
          + New certification
        </button>
      </div>

      {error && (
        <div className="mb-4 rounded-lg border border-red-800 bg-red-950 px-4 py-3 text-sm text-red-300">
          {error}
          <button onClick={() => setError(null)} className="ml-2 underline">dismiss</button>
        </div>
      )}

      {/* Inline form */}
      {editingId !== null && (
        <div className="mb-6 rounded-xl border border-slate-700 bg-slate-900 p-6">
          <h2 className="mb-5 text-sm font-semibold text-slate-300">
            {editingId === "new" ? "New certification" : "Edit certification"}
          </h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs text-slate-400">Title *</label>
              <input
                ref={titleRef}
                value={form.title}
                onChange={(e) => set("title", e.target.value)}
                className={inputCls}
                placeholder="AWS Solutions Architect"
                maxLength={200}
              />
            </div>
            <div>
              <label className="mb-1 block text-xs text-slate-400">Issuer *</label>
              <input
                value={form.issuer}
                onChange={(e) => set("issuer", e.target.value)}
                className={inputCls}
                placeholder="Amazon Web Services"
                maxLength={200}
              />
            </div>
            <div>
              <label className="mb-1 block text-xs text-slate-400">Issue date *</label>
              <input
                type="date"
                value={form.issuedAt}
                onChange={(e) => set("issuedAt", e.target.value)}
                className={inputCls}
              />
            </div>
            <div>
              <label className="mb-1 block text-xs text-slate-400">Expiry date</label>
              <input
                type="date"
                value={form.expiresAt}
                onChange={(e) => set("expiresAt", e.target.value)}
                className={inputCls}
              />
            </div>
            <div>
              <label className="mb-1 block text-xs text-slate-400">Credential URL</label>
              <input
                type="url"
                value={form.credentialUrl}
                onChange={(e) => set("credentialUrl", e.target.value)}
                className={inputCls}
                placeholder="https://…"
                maxLength={500}
              />
            </div>
            <div>
              <label className="mb-1 block text-xs text-slate-400">Logo URL</label>
              <input
                type="url"
                value={form.logoUrl}
                onChange={(e) => set("logoUrl", e.target.value)}
                className={inputCls}
                placeholder="https://…"
                maxLength={500}
              />
            </div>
          </div>
          <div className="mt-5 flex gap-2">
            <button
              onClick={() => void handleSave()}
              disabled={saving}
              className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-500 disabled:opacity-50 transition-colors"
            >
              {saving ? "Saving…" : "Save"}
            </button>
            <button
              onClick={closeForm}
              className="rounded-lg border border-slate-700 px-4 py-2 text-sm text-slate-400 hover:text-slate-200 transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Table */}
      <div className="rounded-xl border border-slate-800 bg-slate-900 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-800 text-left">
              <th className="w-8 px-4 py-3" />
              <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-slate-500">Certification</th>
              <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-slate-500">Issuer</th>
              <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-slate-500">Issued</th>
              <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-slate-500">Expires</th>
              <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-slate-500">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <SkeletonTableRows cols={6} rows={4} />
            ) : certs.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-12 text-center text-slate-500">
                  No certifications yet. Click "+ New certification" to add one.
                </td>
              </tr>
            ) : (
              certs.map((c, idx) => (
                <tr
                  key={c.id}
                  draggable
                  onDragStart={() => setDragId(c.id)}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={() => handleDrop(c.id)}
                  onDragEnd={() => setDragId(null)}
                  className={[
                    "border-b border-slate-800/60 transition-colors",
                    dragId === c.id ? "opacity-40" : "hover:bg-slate-800/30",
                  ].join(" ")}
                >
                  <td className="px-3 py-4 text-slate-600 cursor-grab active:cursor-grabbing select-none">⋮⋮</td>

                  {/* Title + logo */}
                  <td className="px-4 py-4">
                    <div className="flex items-center gap-2">
                      {c.logoUrl ? (
                        <img
                          src={c.logoUrl}
                          alt={c.issuer}
                          className="h-7 w-7 rounded object-contain bg-slate-800 p-0.5"
                          onError={(e) => { (e.target as HTMLImageElement).style.display = "none" }}
                        />
                      ) : (
                        <div className="flex h-7 w-7 items-center justify-center rounded bg-brand-800 text-xs font-bold text-white">
                          {c.title.charAt(0).toUpperCase()}
                        </div>
                      )}
                      <div>
                        <p className="font-medium text-slate-100">{c.title}</p>
                        {c.credentialUrl && (
                          <a
                            href={c.credentialUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs text-brand-400 hover:underline"
                            onClick={(e) => e.stopPropagation()}
                          >
                            View credential ↗
                          </a>
                        )}
                      </div>
                    </div>
                  </td>

                  {/* Issuer */}
                  <td className="px-4 py-4 text-slate-400">{c.issuer}</td>

                  {/* Issued */}
                  <td className="px-4 py-4 text-slate-400 whitespace-nowrap">{fmtDate(c.issuedAt)}</td>

                  {/* Expires */}
                  <td className="px-4 py-4 whitespace-nowrap">
                    {c.expiresAt ? (
                      <span className={isExpired(c.expiresAt) ? "text-red-400" : "text-slate-400"}>
                        {isExpired(c.expiresAt) ? "Expired " : ""}{fmtDate(c.expiresAt)}
                      </span>
                    ) : (
                      <span className="text-emerald-500 text-xs">No expiry</span>
                    )}
                  </td>

                  {/* Actions */}
                  <td className="px-4 py-4">
                    <div className="flex items-center gap-3">
                      <button
                        onClick={() => reorder(idx, idx - 1)}
                        disabled={idx === 0}
                        className="text-slate-500 hover:text-slate-300 disabled:opacity-20"
                      >↑</button>
                      <button
                        onClick={() => reorder(idx, idx + 1)}
                        disabled={idx === certs.length - 1}
                        className="text-slate-500 hover:text-slate-300 disabled:opacity-20"
                      >↓</button>
                      <button
                        onClick={() => openEdit(c)}
                        className="text-slate-400 hover:text-slate-100 transition-colors"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => void handleDelete(c)}
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

export default CertificationsAdmin
