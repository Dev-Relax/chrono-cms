import React, { useEffect, useMemo, useRef, useState } from "react"
import * as LucideAll from "lucide-react"
import type { LucideIcon } from "lucide-react"
import type { SimpleIcon } from "simple-icons"

// ── Lucide (loaded eagerly, already part of the admin bundle) ─────────────────

const rawLucide = (LucideAll as unknown as { icons: Record<string, LucideIcon> }).icons

export function toKebab(name: string): string {
  return name
    .replace(/([a-z])([A-Z])/g, "$1-$2")
    .replace(/([A-Z]+)([A-Z][a-z])/g, "$1-$2")
    .replace(/([a-zA-Z])(\d)/g, "$1-$2")
    .replace(/(\d)([a-zA-Z])/g, "$1-$2")
    .toLowerCase()
}

export function toPascal(slug: string): string {
  return slug
    .split("-")
    .map((s) => s.charAt(0).toUpperCase() + s.slice(1))
    .join("")
}

interface LucideEntry {
  name: string
  slug: string
  Component: LucideIcon
}

const LUCIDE_ENTRIES: LucideEntry[] = Object.keys(rawLucide)
  .map((name) => ({ name, slug: toKebab(name), Component: rawLucide[name]! }))
  .sort((a, b) => a.slug.localeCompare(b.slug))

// ── Simple Icons (lazy-loaded on first "Brands" tab open) ─────────────────────

export type SiMap = Record<string, SimpleIcon>

let siCache: SiMap | null = null
let siLoadPromise: Promise<SiMap> | null = null

export function loadSimpleIcons(): Promise<SiMap> {
  if (siCache) return Promise.resolve(siCache)
  if (!siLoadPromise) {
    siLoadPromise = import("simple-icons").then((mod) => {
      const map: SiMap = {}
      for (const key of Object.keys(mod)) {
        if (!key.startsWith("si")) continue
        const val = (mod as Record<string, unknown>)[key]
        if (val && typeof val === "object" && "slug" in val && "path" in val) {
          const icon = val as SimpleIcon
          map[icon.slug] = icon
        }
      }
      siCache = map
      return map
    })
  }
  return siLoadPromise
}

// ── Picker modal ──────────────────────────────────────────────────────────────

type Tab = "lucide" | "brands"
const PAGE_SIZE = 120

interface Props {
  selected: string
  onSelect: (slug: string) => void
  onClose: () => void
}

export const IconPickerModal: React.FC<Props> = ({ selected, onSelect, onClose }) => {
  const isBrandSelected = selected.startsWith("si:")
  const [tab, setTab] = useState<Tab>(isBrandSelected ? "brands" : "lucide")
  const [search, setSearch] = useState("")
  const [page, setPage] = useState(0)
  const [siMap, setSiMap] = useState<SiMap | null>(siCache)
  const [siLoading, setSiLoading] = useState(false)
  const searchRef = useRef<HTMLInputElement>(null)

  const triggerSiLoad = () => {
    if (siCache) return
    setSiLoading(true)
    loadSimpleIcons().then((map) => {
      setSiMap(map)
      setSiLoading(false)
    })
  }

  useEffect(() => {
    if (tab === "brands") triggerSiLoad()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const handleTabSwitch = (t: Tab) => {
    setTab(t)
    setSearch("")
    setPage(0)
    if (t === "brands") triggerSiLoad()
  }

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearch(e.target.value)
    setPage(0)
  }

  // Lucide filtering
  const lucideFiltered = useMemo(() => {
    const q = search.trim().toLowerCase()
    return q ? LUCIDE_ENTRIES.filter((e) => e.slug.includes(q)) : LUCIDE_ENTRIES
  }, [search])

  // Brands filtering
  const siEntries = useMemo(
    () => (siMap ? Object.values(siMap).sort((a, b) => a.slug.localeCompare(b.slug)) : []),
    [siMap],
  )
  const siFiltered = useMemo(() => {
    const q = search.trim().toLowerCase()
    return q ? siEntries.filter((e) => e.slug.includes(q) || e.title.toLowerCase().includes(q)) : siEntries
  }, [siEntries, search])

  const totalCount = tab === "lucide" ? lucideFiltered.length : siFiltered.length
  const totalPages = Math.ceil(totalCount / PAGE_SIZE)
  const lucidePaged = lucideFiltered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE)
  const siPaged = siFiltered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE)

  const selectedLucideSlug = isBrandSelected ? "" : selected
  const selectedSiSlug = isBrandSelected ? selected.slice(3) : ""

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
          <div className="flex items-center gap-3">
            <h2 className="text-sm font-semibold text-slate-200">Choose an icon</h2>
            <div className="flex rounded-lg border border-slate-700 bg-slate-950 p-0.5">
              <button
                onClick={() => handleTabSwitch("lucide")}
                className={[
                  "rounded px-3 py-1 text-xs font-medium transition-colors",
                  tab === "lucide" ? "bg-brand-600 text-white" : "text-slate-400 hover:text-slate-200",
                ].join(" ")}
              >
                Icons
              </button>
              <button
                onClick={() => handleTabSwitch("brands")}
                className={[
                  "rounded px-3 py-1 text-xs font-medium transition-colors",
                  tab === "brands" ? "bg-brand-600 text-white" : "text-slate-400 hover:text-slate-200",
                ].join(" ")}
              >
                Brands & Tech
              </button>
            </div>
          </div>
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
            placeholder={tab === "lucide" ? "Search icons…" : "Search React, TypeScript, Docker…"}
            className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 placeholder-slate-500 focus:border-brand-500 focus:outline-none"
          />
          <p className="mt-1.5 text-xs text-slate-500">
            {siLoading && tab === "brands" ? "Loading…" : `${totalCount.toLocaleString()} icons`}
            {selected && (
              <span className="ml-3 text-brand-400">
                Selected: <span className="font-mono">{selected}</span>
              </span>
            )}
          </p>
        </div>

        {/* Grid */}
        <div className="grid grid-cols-8 gap-0.5 overflow-y-auto p-3">
          {siLoading && tab === "brands" ? (
            <div className="col-span-8 py-12 text-center text-sm text-slate-500">Loading brand icons…</div>
          ) : tab === "lucide" ? (
            <>
              {lucidePaged.map(({ name, slug, Component }) => (
                <button
                  key={name}
                  onClick={() => onSelect(slug)}
                  title={slug}
                  className={[
                    "flex flex-col items-center gap-1 rounded-lg px-1 py-2 text-center transition-colors",
                    slug === selectedLucideSlug
                      ? "bg-brand-600 text-white"
                      : "text-slate-400 hover:bg-slate-800 hover:text-slate-100",
                  ].join(" ")}
                >
                  <Component size={18} strokeWidth={1.5} />
                  <span className="w-full truncate text-[9px] leading-tight">{slug}</span>
                </button>
              ))}
              {lucidePaged.length === 0 && (
                <div className="col-span-8 py-12 text-center text-sm text-slate-500">
                  No icons found for &ldquo;{search}&rdquo;
                </div>
              )}
            </>
          ) : (
            <>
              {siPaged.map((icon) => (
                <button
                  key={icon.slug}
                  onClick={() => onSelect(`si:${icon.slug}`)}
                  title={icon.title}
                  className={[
                    "flex flex-col items-center gap-1 rounded-lg px-1 py-2 text-center transition-colors",
                    icon.slug === selectedSiSlug
                      ? "bg-brand-600 text-white"
                      : "text-slate-400 hover:bg-slate-800 hover:text-slate-100",
                  ].join(" ")}
                >
                  <svg role="img" viewBox="0 0 24 24" width={18} height={18} fill="currentColor" aria-hidden>
                    <path d={icon.path} />
                  </svg>
                  <span className="w-full truncate text-[9px] leading-tight">{icon.slug}</span>
                </button>
              ))}
              {siPaged.length === 0 && search && (
                <div className="col-span-8 py-12 text-center text-sm text-slate-500">
                  No brands found for &ldquo;{search}&rdquo;
                </div>
              )}
            </>
          )}
        </div>

        {/* Pagination */}
        {!siLoading && totalPages > 1 && (
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

        {/* Clear */}
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
