import React, { useEffect, useState } from "react"
import { Layout } from "../../components/common/Layout.js"
import { useTheme } from "../../context/ThemeContext.js"
import { pagesApi } from "../../lib/api.js"
import { randomUUID } from "../../lib/uuid.js"
import type { NavItem } from "../../types/index.js"

const NavigationAdmin: React.FC = () => {
  const { savedNav, setNav, saveNav, isSaving, isNavDirty } = useTheme()
  const [items, setItems] = useState<NavItem[]>(savedNav.items)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  const [addLabel, setAddLabel] = useState("")
  const [addUrl, setAddUrl] = useState("")

  // Sync when savedNav changes from context load
  useEffect(() => {
    setItems(savedNav.items)
  }, [savedNav])

  // Merge published pages into the current item list.
  // Pages already in the list keep their position/settings.
  // New pages are appended (visible by default).
  useEffect(() => {
    pagesApi
      .list()
      .then(({ data }) => {
        setItems((prev) => {
          const existingSlugs = new Set(prev.filter((i) => i.type === "page").map((i) => i.slug))
          const newItems = data
            .filter((p) => !existingSlugs.has(p.slug))
            .map(
              (p): NavItem => ({
                id: p.id,
                type: "page",
                label: p.title,
                slug: p.slug,
                hidden: false,
              }),
            )
          return [...prev, ...newItems]
        })
      })
      .catch(() => {
        /* ignore */
      })
  }, [])

  useEffect(() => {
    setNav({ items })
  }, [items, setNav])

  const move = (index: number, dir: -1 | 1) => {
    const next = [...items]
    const target = index + dir
    if (target < 0 || target >= next.length) return
    ;[next[index], next[target]] = [next[target]!, next[index]!]
    setItems(next)
  }

  const toggle = (id: string) =>
    setItems((prev) => prev.map((it) => (it.id === id ? { ...it, hidden: !it.hidden } : it)))

  const rename = (id: string, label: string) =>
    setItems((prev) => prev.map((it) => (it.id === id ? { ...it, label } : it)))

  const remove = (id: string) => setItems((prev) => prev.filter((it) => it.id !== id))

  const addCustom = () => {
    if (!addLabel.trim() || !addUrl.trim()) return
    setItems((prev) => [
      ...prev,
      {
        id: randomUUID(),
        type: "custom",
        label: addLabel.trim(),
        url: addUrl.trim(),
        hidden: false,
      },
    ])
    setAddLabel("")
    setAddUrl("")
  }

  const save = async () => {
    setError(null)
    try {
      await saveNav()
      setSuccess(true)
      setTimeout(() => setSuccess(false), 2500)
    } catch (err) {
      setError((err as Error).message)
    }
  }

  return (
    <Layout admin>
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-50">Navigation</h1>
          <p className="mt-1 text-sm text-slate-500">
            Customise the links shown in the public site header.
          </p>
        </div>
        <button
          onClick={save}
          disabled={isSaving || !isNavDirty}
          className="rounded-lg bg-brand-600 px-5 py-2 text-sm font-semibold text-white
                     hover:bg-brand-700 disabled:opacity-40 transition-colors"
        >
          {isSaving ? "Saving…" : success ? "Saved ✓" : "Save"}
        </button>
      </div>

      {error && (
        <p className="mb-4 rounded-lg border border-red-800 bg-red-900/30 px-4 py-3 text-sm text-red-400">
          {error}
        </p>
      )}

      <div className="mb-8 space-y-2">
        {items.map((item, idx) => (
          <NavItemRow
            key={item.id}
            item={item}
            index={idx}
            total={items.length}
            onMove={move}
            onToggle={toggle}
            onRename={rename}
            onRemove={item.type === "custom" ? remove : undefined}
          />
        ))}

        {items.length === 0 && (
          <p className="py-8 text-center text-sm text-slate-600">
            No navigation items yet. Add a custom link below.
          </p>
        )}
      </div>

      <div className="rounded-xl border border-slate-800 bg-slate-900 p-5">
        <h2 className="mb-4 text-sm font-semibold text-slate-300">Add custom link</h2>
        <div className="flex items-end gap-3">
          <div className="flex-1">
            <label className="mb-1 block text-xs text-slate-500">Label</label>
            <input
              value={addLabel}
              onChange={(e) => setAddLabel(e.target.value)}
              placeholder="Contact"
              className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm
                         text-slate-200 placeholder-slate-600 focus:border-brand-500 focus:outline-none"
            />
          </div>
          <div className="flex-1">
            <label className="mb-1 block text-xs text-slate-500">URL</label>
            <input
              value={addUrl}
              onChange={(e) => setAddUrl(e.target.value)}
              placeholder="https://example.com"
              className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm
                         text-slate-200 placeholder-slate-600 focus:border-brand-500 focus:outline-none"
              onKeyDown={(e) => {
                if (e.key === "Enter") addCustom()
              }}
            />
          </div>
          <button
            onClick={addCustom}
            disabled={!addLabel.trim() || !addUrl.trim()}
            className="rounded-lg bg-slate-700 px-4 py-2 text-sm font-medium text-slate-200
                       hover:bg-slate-600 disabled:opacity-40 transition-colors"
          >
            + Add
          </button>
        </div>
      </div>
    </Layout>
  )
}

type RowProps = {
  item: NavItem
  index: number
  total: number
  onMove: (index: number, dir: -1 | 1) => void
  onToggle: (id: string) => void
  onRename: (id: string, label: string) => void
  onRemove?: (id: string) => void
}

const TYPE_BADGE: Record<string, string> = {
  blog: "bg-indigo-900/60 text-indigo-400",
  projects: "bg-purple-900/60 text-purple-400",
  page: "bg-teal-900/60 text-teal-400",
  custom: "bg-amber-900/60 text-amber-400",
}

const NavItemRow: React.FC<RowProps> = ({
  item,
  index,
  total,
  onMove,
  onToggle,
  onRename,
  onRemove,
}) => {
  const [editing, setEditing] = useState(false)
  const [label, setLabel] = useState(item.label)

  const commitRename = () => {
    if (label.trim()) onRename(item.id, label.trim())
    else setLabel(item.label)
    setEditing(false)
  }

  return (
    <div
      className={[
        "flex items-center gap-3 rounded-xl border px-4 py-3 transition-colors",
        item.hidden
          ? "border-slate-800 bg-slate-900/40 opacity-50"
          : "border-slate-800 bg-slate-900",
      ].join(" ")}
    >
      <div className="flex flex-col gap-0.5 shrink-0">
        <button
          onClick={() => onMove(index, -1)}
          disabled={index === 0}
          className="rounded px-1 py-0.5 text-[10px] text-slate-600 hover:text-slate-300 disabled:opacity-20"
          title="Move up"
        >
          ▲
        </button>
        <button
          onClick={() => onMove(index, 1)}
          disabled={index === total - 1}
          className="rounded px-1 py-0.5 text-[10px] text-slate-600 hover:text-slate-300 disabled:opacity-20"
          title="Move down"
        >
          ▼
        </button>
      </div>

      <span
        className={`shrink-0 rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${TYPE_BADGE[item.type] ?? ""}`}
      >
        {item.type}
      </span>

      <div className="flex-1 min-w-0">
        {editing ? (
          <input
            autoFocus
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            onBlur={commitRename}
            onKeyDown={(e) => {
              if (e.key === "Enter") commitRename()
              if (e.key === "Escape") {
                setLabel(item.label)
                setEditing(false)
              }
            }}
            className="w-full rounded border border-brand-500 bg-slate-800 px-2 py-0.5
                       text-sm text-slate-200 focus:outline-none"
          />
        ) : (
          <button
            onClick={() => setEditing(true)}
            className="group flex items-center gap-1.5 text-sm text-slate-200 hover:text-white"
            title="Click to rename"
          >
            <span className="truncate">{item.label}</span>
            <span className="text-xs text-slate-600 group-hover:text-slate-400">✎</span>
          </button>
        )}
        {(item.slug || item.url) && (
          <p className="mt-0.5 truncate text-xs text-slate-600">
            {item.type === "page" ? `/${item.slug}` : item.url}
          </p>
        )}
      </div>

      <div className="flex items-center gap-2 shrink-0">
        <button
          onClick={() => onToggle(item.id)}
          className={[
            "rounded-md px-2.5 py-1 text-xs font-medium transition-colors",
            item.hidden
              ? "bg-slate-700 text-slate-400 hover:bg-slate-600"
              : "bg-slate-800 text-slate-300 hover:bg-slate-700",
          ].join(" ")}
          title={item.hidden ? "Show in nav" : "Hide from nav"}
        >
          {item.hidden ? "Show" : "Hide"}
        </button>
        {onRemove && (
          <button
            onClick={() => onRemove(item.id)}
            className="rounded-md bg-red-900/30 px-2.5 py-1 text-xs font-medium
                       text-red-500 hover:bg-red-900/60 transition-colors"
          >
            Remove
          </button>
        )}
      </div>
    </div>
  )
}

export default NavigationAdmin
