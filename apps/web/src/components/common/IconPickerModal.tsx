import React, { useMemo, useRef, useState } from "react"
import * as LucideAll from "lucide-react"
import type { LucideIcon } from "lucide-react"

// lucide-react v1.x: individual icon exports are React.forwardRef objects, not plain functions.
// The `icons` named export is a namespace of all canonical icons (no `Icon`-suffix aliases).
const rawIcons = (LucideAll as unknown as { icons: Record<string, LucideIcon> }).icons

function toKebab(name: string): string {
  return name
    .replace(/([a-z])([A-Z])/g, "$1-$2")
    .replace(/([A-Z]+)([A-Z][a-z])/g, "$1-$2")
    .replace(/([a-zA-Z])(\d)/g, "$1-$2")
    .replace(/(\d)([a-zA-Z])/g, "$1-$2")
    .toLowerCase()
}

function toPascal(slug: string): string {
  return slug
    .split("-")
    .map((s) => s.charAt(0).toUpperCase() + s.slice(1))
    .join("")
}

interface IconEntry {
  name: string
  slug: string
  Component: LucideIcon
}

const ICON_ENTRIES: IconEntry[] = Object.keys(rawIcons)
  .map((name) => ({ name, slug: toKebab(name), Component: rawIcons[name]! }))
  .sort((a, b) => a.slug.localeCompare(b.slug))

const PAGE_SIZE = 120

interface Props {
  selected: string
  onSelect: (slug: string) => void
  onClose: () => void
}

export const IconPickerModal: React.FC<Props> = ({ selected, onSelect, onClose }) => {
  const [search, setSearch] = useState("")
  const [page, setPage] = useState(0)
  const searchRef = useRef<HTMLInputElement>(null)

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return ICON_ENTRIES
    return ICON_ENTRIES.filter((e) => e.slug.includes(q))
  }, [search])

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE)
  const paged = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE)

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearch(e.target.value)
    setPage(0)
  }

  const handleOverlayClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) onClose()
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
      onClick={handleOverlayClick}
    >
      <div
        className="flex w-full max-w-2xl flex-col rounded-2xl border border-slate-700 bg-slate-900 shadow-2xl"
        style={{ maxHeight: "85vh" }}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-700 px-5 py-4">
          <h2 className="text-sm font-semibold text-slate-200">Choose an icon</h2>
          <button
            onClick={onClose}
            className="rounded p-1 text-slate-500 transition-colors hover:bg-slate-800 hover:text-slate-200"
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        {/* Search */}
        <div className="border-b border-slate-800 px-5 py-3">
          <input
            ref={searchRef}
            autoFocus
            value={search}
            onChange={handleSearch}
            placeholder="Search icons…"
            className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 placeholder-slate-500 focus:border-brand-500 focus:outline-none"
          />
          <p className="mt-1.5 text-xs text-slate-500">
            {filtered.length.toLocaleString()} icons
            {selected && (
              <span className="ml-3 text-brand-400">
                Selected: <span className="font-mono">{selected}</span>
              </span>
            )}
          </p>
        </div>

        {/* Grid */}
        <div className="grid grid-cols-8 gap-0.5 overflow-y-auto p-3">
          {paged.map(({ name, slug, Component }) => {
            const isSelected = slug === selected
            return (
              <button
                key={name}
                onClick={() => onSelect(slug)}
                title={slug}
                className={[
                  "flex flex-col items-center gap-1 rounded-lg px-1 py-2 text-center transition-colors",
                  isSelected
                    ? "bg-brand-600 text-white"
                    : "text-slate-400 hover:bg-slate-800 hover:text-slate-100",
                ].join(" ")}
              >
                <Component size={18} strokeWidth={1.5} />
                <span className="w-full truncate text-[9px] leading-tight">{slug}</span>
              </button>
            )
          })}

          {paged.length === 0 && (
            <div className="col-span-8 py-12 text-center text-sm text-slate-500">
              No icons found for &ldquo;{search}&rdquo;
            </div>
          )}
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between border-t border-slate-800 px-5 py-3">
            <button
              onClick={() => setPage((p) => Math.max(0, p - 1))}
              disabled={page === 0}
              className="rounded px-3 py-1 text-xs text-slate-400 transition-colors hover:bg-slate-800 hover:text-slate-200 disabled:opacity-30"
            >
              ← Prev
            </button>
            <span className="text-xs text-slate-500">
              {page + 1} / {totalPages}
            </span>
            <button
              onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
              disabled={page === totalPages - 1}
              className="rounded px-3 py-1 text-xs text-slate-400 transition-colors hover:bg-slate-800 hover:text-slate-200 disabled:opacity-30"
            >
              Next →
            </button>
          </div>
        )}

        {/* Footer: clear */}
        {selected && (
          <div className="border-t border-slate-800 px-5 py-3 text-right">
            <button
              onClick={() => onSelect("")}
              className="text-xs text-slate-500 underline hover:text-slate-300"
            >
              Remove icon
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

export { toPascal }
