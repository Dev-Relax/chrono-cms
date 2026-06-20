import React, { useCallback, useEffect, useRef, useState } from "react"
import * as LucideAll from "lucide-react"
import type { LucideIcon } from "lucide-react"
import { skillsApi, ApiError } from "../../lib/api.js"
import type { Skill, SkillLevel } from "../../types/index.js"
import { Layout } from "../../components/common/Layout.js"
import { SkeletonTableRows } from "../../components/common/Skeleton.js"
import { IconPickerModal, toPascal } from "../../components/common/IconPickerModal.js"

const lucideIcons = (LucideAll as unknown as { icons: Record<string, LucideIcon> }).icons

const SkillIcon: React.FC<{ slug: string; size?: number }> = ({ slug, size = 16 }) => {
  const Component = lucideIcons[toPascal(slug)]
  if (!Component) return <span className="font-mono text-xs text-slate-500">{slug}</span>
  return <Component size={size} strokeWidth={1.5} className="text-slate-400" />
}

const LEVEL_LABELS: Record<SkillLevel, string> = {
  BEGINNER: "Beginner",
  INTERMEDIATE: "Intermediate",
  ADVANCED: "Advanced",
  EXPERT: "Expert",
}

const LEVEL_COLORS: Record<SkillLevel, string> = {
  BEGINNER: "bg-slate-700 text-slate-300",
  INTERMEDIATE: "bg-blue-900/60 text-blue-300",
  ADVANCED: "bg-brand-900/60 text-brand-300",
  EXPERT: "bg-emerald-900/60 text-emerald-300",
}

const emptyForm = {
  name: "",
  slug: "",
  category: "",
  level: "INTERMEDIATE" as SkillLevel,
  icon: "",
  visible: true,
}

const SkillsAdmin: React.FC = () => {
  const [skills, setSkills] = useState<Skill[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [dragId, setDragId] = useState<string | null>(null)
  const [savingOrder, setSavingOrder] = useState(false)
  const [editingId, setEditingId] = useState<string | "new" | null>(null)
  const [form, setForm] = useState(emptyForm)
  const [saving, setSaving] = useState(false)
  const [showIconPicker, setShowIconPicker] = useState(false)
  const nameRef = useRef<HTMLInputElement>(null)

  const fetchSkills = useCallback(() => {
    setLoading(true)
    skillsApi
      .adminList()
      .then(({ data }) => setSkills(data))
      .catch((err: Error) => setError(err.message))
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    fetchSkills()
  }, [fetchSkills])

  useEffect(() => {
    if (editingId !== null) nameRef.current?.focus()
  }, [editingId])

  const openNew = () => {
    setForm(emptyForm)
    setEditingId("new")
  }

  const openEdit = (skill: Skill) => {
    setForm({
      name: skill.name,
      slug: skill.slug,
      category: skill.category,
      level: skill.level,
      icon: skill.icon ?? "",
      visible: skill.visible,
    })
    setEditingId(skill.id)
  }

  const closeForm = () => {
    setEditingId(null)
    setForm(emptyForm)
  }

  const slugify = (text: string) =>
    text
      .toLowerCase()
      .replace(/[^\w\s-]/g, "")
      .replace(/\s+/g, "-")
      .replace(/-+/g, "-")
      .trim()

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const name = e.target.value
    setForm((f) => ({ ...f, name, slug: f.slug === slugify(f.name) || f.slug === "" ? slugify(name) : f.slug }))
  }

  const handleSave = async () => {
    if (!form.name.trim() || !form.category.trim()) {
      setError("Name and category are required")
      return
    }
    setSaving(true)
    setError(null)
    try {
      const payload = {
        name: form.name.trim(),
        slug: form.slug.trim() || undefined,
        category: form.category.trim(),
        level: form.level,
        icon: form.icon.trim() || undefined,
        visible: form.visible,
      }
      if (editingId === "new") {
        const { data } = await skillsApi.create(payload)
        setSkills((prev) => [...prev, data])
      } else if (editingId) {
        const { data } = await skillsApi.update(editingId, payload)
        setSkills((prev) => prev.map((s) => (s.id === editingId ? data : s)))
      }
      closeForm()
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Save failed")
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (skill: Skill) => {
    if (!confirm(`Delete skill "${skill.name}"? This cannot be undone.`)) return
    try {
      await skillsApi.delete(skill.id)
      setSkills((prev) => prev.filter((s) => s.id !== skill.id))
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Delete failed")
    }
  }

  const handleToggleVisible = async (skill: Skill) => {
    try {
      const { data } = await skillsApi.update(skill.id, { visible: !skill.visible })
      setSkills((prev) => prev.map((s) => (s.id === skill.id ? data : s)))
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Update failed")
    }
  }

  const persistOrder = async (ordered: Skill[]) => {
    setSavingOrder(true)
    try {
      await skillsApi.reorder(ordered.map((s) => s.id))
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Reorder failed")
      fetchSkills()
    } finally {
      setSavingOrder(false)
    }
  }

  const reorder = (from: number, to: number) => {
    if (to < 0 || to >= skills.length || from === to) return
    const next = [...skills]
    const [moved] = next.splice(from, 1)
    if (!moved) return
    next.splice(to, 0, moved)
    setSkills(next)
    void persistOrder(next)
  }

  const handleDrop = (targetId: string) => {
    if (!dragId || dragId === targetId) return
    const from = skills.findIndex((s) => s.id === dragId)
    const to = skills.findIndex((s) => s.id === targetId)
    setDragId(null)
    reorder(from, to)
  }

  const categories = [...new Set(skills.map((s) => s.category))].sort()

  return (
    <Layout admin>
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-50">Skills & Technologies</h1>
          <p className="mt-1 text-sm text-slate-500">
            Drag rows to reorder{savingOrder ? " · saving…" : ""}
          </p>
        </div>
        <button
          onClick={openNew}
          className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-500 transition-colors"
        >
          + New skill
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
          <h2 className="mb-4 text-sm font-semibold text-slate-300">
            {editingId === "new" ? "New skill" : "Edit skill"}
          </h2>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-1 block text-xs text-slate-400">Name *</label>
              <input
                ref={nameRef}
                value={form.name}
                onChange={handleNameChange}
                className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 focus:border-brand-500 focus:outline-none"
                placeholder="e.g. TypeScript"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs text-slate-400">Slug</label>
              <input
                value={form.slug}
                onChange={(e) => setForm((f) => ({ ...f, slug: e.target.value }))}
                className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 focus:border-brand-500 focus:outline-none"
                placeholder="typescript"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs text-slate-400">Category *</label>
              <input
                value={form.category}
                onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}
                list="categories-list"
                className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 focus:border-brand-500 focus:outline-none"
                placeholder="e.g. Frontend"
              />
              <datalist id="categories-list">
                {categories.map((c) => <option key={c} value={c} />)}
              </datalist>
            </div>
            <div>
              <label className="mb-1 block text-xs text-slate-400">Level</label>
              <select
                value={form.level}
                onChange={(e) => setForm((f) => ({ ...f, level: e.target.value as SkillLevel }))}
                className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 focus:border-brand-500 focus:outline-none"
              >
                {(["BEGINNER", "INTERMEDIATE", "ADVANCED", "EXPERT"] as SkillLevel[]).map((l) => (
                  <option key={l} value={l}>{LEVEL_LABELS[l]}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs text-slate-400">Icon</label>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setShowIconPicker(true)}
                  className="flex flex-1 items-center gap-2 rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 transition-colors hover:border-brand-500 focus:border-brand-500 focus:outline-none"
                >
                  {form.icon ? (
                    <>
                      <SkillIcon slug={form.icon} size={16} />
                      <span className="font-mono text-xs text-slate-300">{form.icon}</span>
                    </>
                  ) : (
                    <span className="text-slate-500">Choose icon…</span>
                  )}
                </button>
                {form.icon && (
                  <button
                    type="button"
                    onClick={() => setForm((f) => ({ ...f, icon: "" }))}
                    className="rounded p-2 text-slate-500 transition-colors hover:bg-slate-800 hover:text-slate-200"
                    title="Remove icon"
                  >
                    ✕
                  </button>
                )}
              </div>
            </div>
            <div className="flex items-end">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.visible}
                  onChange={(e) => setForm((f) => ({ ...f, visible: e.target.checked }))}
                  className="h-4 w-4 rounded border-slate-600 bg-slate-800 accent-brand-500"
                />
                <span className="text-sm text-slate-300">Visible</span>
              </label>
            </div>
          </div>
          <div className="mt-4 flex gap-2">
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

      <div className="rounded-xl border border-slate-800 bg-slate-900 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-800 text-left">
              <th className="w-8 px-4 py-3" />
              <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-slate-500">Name</th>
              <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-slate-500">Category</th>
              <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-slate-500">Level</th>
              <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-slate-500">Visible</th>
              <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-slate-500">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <SkeletonTableRows cols={6} rows={5} />
            ) : skills.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-12 text-center text-slate-500">
                  No skills yet. Click "New skill" to add one.
                </td>
              </tr>
            ) : (
              skills.map((skill, idx) => (
                <tr
                  key={skill.id}
                  draggable
                  onDragStart={() => setDragId(skill.id)}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={() => handleDrop(skill.id)}
                  onDragEnd={() => setDragId(null)}
                  className={[
                    "border-b border-slate-800/60 transition-colors",
                    dragId === skill.id ? "opacity-40" : "hover:bg-slate-800/30",
                  ].join(" ")}
                >
                  <td className="px-3 py-3 text-slate-600 cursor-grab active:cursor-grabbing select-none">
                    ⋮⋮
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      {skill.icon && <SkillIcon slug={skill.icon} size={16} />}
                      <span className="font-medium text-slate-100">{skill.name}</span>
                      <span className="text-slate-600 text-xs">{skill.slug}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-slate-400">{skill.category}</td>
                  <td className="px-4 py-3">
                    <span className={`rounded px-2 py-0.5 text-xs font-medium ${LEVEL_COLORS[skill.level]}`}>
                      {LEVEL_LABELS[skill.level]}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => void handleToggleVisible(skill)}
                      className={`text-xs ${skill.visible ? "text-emerald-400" : "text-slate-600"}`}
                    >
                      {skill.visible ? "✓ Visible" : "Hidden"}
                    </button>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <button
                        onClick={() => reorder(idx, idx - 1)}
                        disabled={idx === 0}
                        className="text-slate-500 hover:text-slate-300 disabled:opacity-20"
                        title="Move up"
                      >↑</button>
                      <button
                        onClick={() => reorder(idx, idx + 1)}
                        disabled={idx === skills.length - 1}
                        className="text-slate-500 hover:text-slate-300 disabled:opacity-20"
                        title="Move down"
                      >↓</button>
                      <button
                        onClick={() => openEdit(skill)}
                        className="text-slate-400 hover:text-slate-100 transition-colors"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => void handleDelete(skill)}
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
      {showIconPicker && (
        <IconPickerModal
          selected={form.icon}
          onSelect={(slug) => {
            setForm((f) => ({ ...f, icon: slug }))
            setShowIconPicker(false)
          }}
          onClose={() => setShowIconPicker(false)}
        />
      )}
    </Layout>
  )
}

export default SkillsAdmin
