import React, { useCallback, useEffect, useRef, useState } from "react"
import { testimonialsApi, ApiError } from "../../lib/api.js"
import type { Testimonial } from "../../types/index.js"
import { Layout } from "../../components/common/Layout.js"
import { SkeletonTableRows } from "../../components/common/Skeleton.js"

const emptyForm = {
  author: "",
  role: "",
  company: "",
  avatarUrl: "",
  content: "",
  rating: 5,
  featured: false,
  visible: true,
}

const StarRating: React.FC<{
  value: number
  onChange: (v: number) => void
}> = ({ value, onChange }) => (
  <div className="flex gap-0.5">
    {[1, 2, 3, 4, 5].map((star) => (
      <button
        key={star}
        type="button"
        onClick={() => onChange(star)}
        className={`text-lg leading-none transition-colors ${
          star <= value ? "text-yellow-400" : "text-slate-700 hover:text-yellow-600"
        }`}
      >
        ★
      </button>
    ))}
  </div>
)

const inputCls =
  "w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm " +
  "text-slate-100 placeholder-slate-600 focus:border-brand-500 focus:outline-none"

const TestimonialsAdmin: React.FC = () => {
  const [testimonials, setTestimonials] = useState<Testimonial[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [dragId, setDragId] = useState<string | null>(null)
  const [savingOrder, setSavingOrder] = useState(false)
  const [editingId, setEditingId] = useState<string | "new" | null>(null)
  const [form, setForm] = useState(emptyForm)
  const [saving, setSaving] = useState(false)
  const authorRef = useRef<HTMLInputElement>(null)

  const fetchTestimonials = useCallback(() => {
    setLoading(true)
    testimonialsApi
      .adminList()
      .then(({ data }) => setTestimonials(data))
      .catch((err: Error) => setError(err.message))
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => { fetchTestimonials() }, [fetchTestimonials])

  useEffect(() => {
    if (editingId !== null) authorRef.current?.focus()
  }, [editingId])

  const openNew = () => {
    setForm(emptyForm)
    setEditingId("new")
  }

  const openEdit = (t: Testimonial) => {
    setForm({
      author: t.author,
      role: t.role ?? "",
      company: t.company ?? "",
      avatarUrl: t.avatarUrl ?? "",
      content: t.content,
      rating: t.rating,
      featured: t.featured,
      visible: t.visible,
    })
    setEditingId(t.id)
  }

  const closeForm = () => { setEditingId(null); setForm(emptyForm) }

  const set = <K extends keyof typeof emptyForm>(key: K, value: (typeof emptyForm)[K]) =>
    setForm((f) => ({ ...f, [key]: value }))

  const handleSave = async () => {
    if (!form.author.trim()) { setError("Author name is required"); return }
    if (!form.content.trim()) { setError("Content is required"); return }
    setSaving(true)
    setError(null)
    try {
      const payload = {
        author: form.author.trim(),
        role: form.role.trim() || undefined,
        company: form.company.trim() || undefined,
        avatarUrl: form.avatarUrl.trim() || undefined,
        content: form.content.trim(),
        rating: form.rating,
        featured: form.featured,
        visible: form.visible,
      }
      if (editingId === "new") {
        const { data } = await testimonialsApi.create(payload)
        setTestimonials((prev) => [...prev, data])
      } else if (editingId) {
        const { data } = await testimonialsApi.update(editingId, payload)
        setTestimonials((prev) => prev.map((t) => (t.id === editingId ? data : t)))
      }
      closeForm()
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Save failed")
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (t: Testimonial) => {
    if (!confirm(`Delete testimonial from "${t.author}"? This cannot be undone.`)) return
    try {
      await testimonialsApi.delete(t.id)
      setTestimonials((prev) => prev.filter((x) => x.id !== t.id))
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Delete failed")
    }
  }

  const toggleFlag = async (t: Testimonial, field: "visible" | "featured") => {
    try {
      const { data } = await testimonialsApi.update(t.id, { [field]: !t[field] })
      setTestimonials((prev) => prev.map((x) => (x.id === t.id ? data : x)))
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Update failed")
    }
  }

  const persistOrder = async (ordered: Testimonial[]) => {
    setSavingOrder(true)
    try {
      await testimonialsApi.reorder(ordered.map((t) => t.id))
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Reorder failed")
      fetchTestimonials()
    } finally {
      setSavingOrder(false)
    }
  }

  const reorder = (from: number, to: number) => {
    if (to < 0 || to >= testimonials.length || from === to) return
    const next = [...testimonials]
    const [moved] = next.splice(from, 1)
    if (!moved) return
    next.splice(to, 0, moved)
    setTestimonials(next)
    void persistOrder(next)
  }

  const handleDrop = (targetId: string) => {
    if (!dragId || dragId === targetId) return
    const from = testimonials.findIndex((t) => t.id === dragId)
    const to = testimonials.findIndex((t) => t.id === targetId)
    setDragId(null)
    reorder(from, to)
  }

  return (
    <Layout admin>
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-50">Testimonials</h1>
          <p className="mt-1 text-sm text-slate-500">
            Drag rows to reorder{savingOrder ? " · saving…" : ""}
          </p>
        </div>
        <button
          onClick={openNew}
          className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-500 transition-colors"
        >
          + New testimonial
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
            {editingId === "new" ? "New testimonial" : "Edit testimonial"}
          </h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs text-slate-400">Author *</label>
              <input
                ref={authorRef}
                value={form.author}
                onChange={(e) => set("author", e.target.value)}
                className={inputCls}
                placeholder="Jane Smith"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs text-slate-400">Role / Title</label>
              <input
                value={form.role}
                onChange={(e) => set("role", e.target.value)}
                className={inputCls}
                placeholder="CTO at Acme"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs text-slate-400">Company</label>
              <input
                value={form.company}
                onChange={(e) => set("company", e.target.value)}
                className={inputCls}
                placeholder="Acme Corp"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs text-slate-400">Avatar URL</label>
              <input
                type="url"
                value={form.avatarUrl}
                onChange={(e) => set("avatarUrl", e.target.value)}
                className={inputCls}
                placeholder="https://…"
              />
            </div>
            <div className="sm:col-span-2">
              <label className="mb-1 block text-xs text-slate-400">Content *</label>
              <textarea
                value={form.content}
                onChange={(e) => set("content", e.target.value)}
                rows={4}
                className={`${inputCls} resize-none`}
                placeholder="What they said about working with you…"
                maxLength={2000}
              />
              <p className="mt-1 text-xs text-slate-600">{form.content.length} / 2000</p>
            </div>
            <div>
              <label className="mb-2 block text-xs text-slate-400">Rating</label>
              <StarRating value={form.rating} onChange={(v) => set("rating", v)} />
            </div>
            <div className="flex items-end gap-6">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.featured}
                  onChange={(e) => set("featured", e.target.checked)}
                  className="h-4 w-4 rounded border-slate-600 bg-slate-800 accent-brand-500"
                />
                <span className="text-sm text-slate-300">Featured ★</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.visible}
                  onChange={(e) => set("visible", e.target.checked)}
                  className="h-4 w-4 rounded border-slate-600 bg-slate-800 accent-brand-500"
                />
                <span className="text-sm text-slate-300">Visible</span>
              </label>
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
              <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-slate-500">Author</th>
              <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-slate-500">Content</th>
              <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-slate-500">Rating</th>
              <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-slate-500">Flags</th>
              <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-slate-500">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <SkeletonTableRows cols={6} rows={4} />
            ) : testimonials.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-12 text-center text-slate-500">
                  No testimonials yet. Click "+ New testimonial" to add one.
                </td>
              </tr>
            ) : (
              testimonials.map((t, idx) => (
                <tr
                  key={t.id}
                  draggable
                  onDragStart={() => setDragId(t.id)}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={() => handleDrop(t.id)}
                  onDragEnd={() => setDragId(null)}
                  className={[
                    "border-b border-slate-800/60 transition-colors",
                    dragId === t.id ? "opacity-40" : "hover:bg-slate-800/30",
                    !t.visible ? "opacity-60" : "",
                  ].join(" ")}
                >
                  <td className="px-3 py-4 text-slate-600 cursor-grab active:cursor-grabbing select-none">⋮⋮</td>

                  {/* Author */}
                  <td className="px-4 py-4">
                    <div className="flex items-center gap-2">
                      {t.avatarUrl ? (
                        <img
                          src={t.avatarUrl}
                          alt={t.author}
                          className="h-8 w-8 rounded-full object-cover bg-slate-800"
                          onError={(e) => { (e.target as HTMLImageElement).style.display = "none" }}
                        />
                      ) : (
                        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-brand-800 text-xs font-bold text-white">
                          {t.author.charAt(0).toUpperCase()}
                        </div>
                      )}
                      <div>
                        <p className="font-medium text-slate-100">{t.author}</p>
                        {(t.role || t.company) && (
                          <p className="text-xs text-slate-500">
                            {[t.role, t.company].filter(Boolean).join(" · ")}
                          </p>
                        )}
                      </div>
                    </div>
                  </td>

                  {/* Content preview */}
                  <td className="px-4 py-4 max-w-xs">
                    <p className="truncate text-slate-400 text-xs">{t.content}</p>
                  </td>

                  {/* Rating */}
                  <td className="px-4 py-4">
                    <span className="text-yellow-400">{"★".repeat(t.rating)}</span>
                    <span className="text-slate-700">{"★".repeat(5 - t.rating)}</span>
                  </td>

                  {/* Flags */}
                  <td className="px-4 py-4">
                    <div className="flex flex-col gap-1">
                      <button
                        onClick={() => void toggleFlag(t, "featured")}
                        className={`text-xs ${t.featured ? "text-yellow-400" : "text-slate-600 hover:text-slate-400"}`}
                      >
                        {t.featured ? "★ Featured" : "☆ Feature"}
                      </button>
                      <button
                        onClick={() => void toggleFlag(t, "visible")}
                        className={`text-xs ${t.visible ? "text-emerald-400" : "text-slate-600 hover:text-slate-400"}`}
                      >
                        {t.visible ? "✓ Visible" : "Hidden"}
                      </button>
                    </div>
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
                        disabled={idx === testimonials.length - 1}
                        className="text-slate-500 hover:text-slate-300 disabled:opacity-20"
                      >↓</button>
                      <button
                        onClick={() => openEdit(t)}
                        className="text-slate-400 hover:text-slate-100 transition-colors"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => void handleDelete(t)}
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

export default TestimonialsAdmin
