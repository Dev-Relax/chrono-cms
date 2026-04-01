import React, { useCallback, useEffect, useRef, useState } from "react"
import { useNavigate, useParams } from "react-router-dom"
import { pagesApi, ApiError } from "../../lib/api.js"
import type {
  PageStatus,
  TipTapDoc,
  PageConfig,
  HeroContent,
  PageLayout,
} from "../../types/index.js"
import { DEFAULT_PAGE_CONFIG } from "../../types/index.js"
import type { PageTranslationPayload } from "../../lib/api.js"
import { RichTextEditor } from "../../components/editor/RichTextEditor.js"
import { PostRenderer } from "../../components/editor/PostRenderer.js"
import { TableOfContents } from "../../components/editor/TableOfContents.js"
import { Layout } from "../../components/common/Layout.js"
import { SkeletonEditorForm, SkeletonPageHeader } from "../../components/common/Skeleton.js"

const slugify = (text: string): string =>
  text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "")
    .replace(/[\s_-]+/g, "-")
    .replace(/^-+|-+$/g, "")

const EMPTY_DOC: TipTapDoc = { type: "doc", content: [{ type: "paragraph" }] }

const KNOWN_FLAGS: Record<string, string> = {
  en: "🇬🇧",
  "en-us": "🇺🇸",
  "en-gb": "🇬🇧",
  "en-au": "🇦🇺",
  "en-ca": "🇨🇦",
  fr: "🇫🇷",
  "fr-be": "🇧🇪",
  "fr-ch": "🇨🇭",
  "fr-ca": "🇨🇦",
  de: "🇩🇪",
  "de-at": "🇦🇹",
  "de-ch": "🇨🇭",
  es: "🇪🇸",
  "es-mx": "🇲🇽",
  "es-ar": "🇦🇷",
  "es-co": "🇨🇴",
  it: "🇮🇹",
  pt: "🇵🇹",
  "pt-br": "🇧🇷",
  nl: "🇳🇱",
  "nl-be": "🇧🇪",
  ru: "🇷🇺",
  uk: "🇺🇦",
  pl: "🇵🇱",
  cs: "🇨🇿",
  sk: "🇸🇰",
  ro: "🇷🇴",
  sv: "🇸🇪",
  no: "🇳🇴",
  da: "🇩🇰",
  fi: "🇫🇮",
  nb: "🇳🇴",
  ja: "🇯🇵",
  ko: "🇰🇷",
  zh: "🇨🇳",
  "zh-tw": "🇹🇼",
  "zh-hk": "🇭🇰",
  ar: "🇸🇦",
  he: "🇮🇱",
  tr: "🇹🇷",
  fa: "🇮🇷",
  hi: "🇮🇳",
  bn: "🇧🇩",
  vi: "🇻🇳",
  th: "🇹🇭",
  id: "🇮🇩",
  ms: "🇲🇾",
  el: "🇬🇷",
  hu: "🇭🇺",
  bg: "🇧🇬",
  hr: "🇭🇷",
  sr: "🇷🇸",
  ca: "🏳️",
  eu: "🏳️",
  gl: "🏳️",
}
const getLocaleFlag = (locale: string) => KNOWN_FLAGS[locale.toLowerCase()] ?? "🌐"

const COMMON_LOCALES = ["es", "de", "it", "pt", "nl", "ru", "ja", "ko", "zh", "ar", "pl", "tr"]

interface LocaleData {
  title: string
  slug: string
  content: TipTapDoc
  metaTitle: string
  metaDescription: string
  ogImage: string
  heroSubtitle: string
  heroImage: string
  heroCtaText: string
  heroCtaUrl: string
}

const emptyLocale = (): LocaleData => ({
  title: "",
  slug: "",
  content: EMPTY_DOC,
  metaTitle: "",
  metaDescription: "",
  ogImage: "",
  heroSubtitle: "",
  heroImage: "",
  heroCtaText: "",
  heroCtaUrl: "",
})

type LocaleMap = Record<string, LocaleData>

type ViewMode = "editor" | "preview" | "split"

const Collapsible: React.FC<{ title: string; children: React.ReactNode }> = ({
  title,
  children,
}) => {
  const [open, setOpen] = useState(false)
  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900/60">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center justify-between px-5 py-3 text-left"
      >
        <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
          {title}
        </span>
        <span className="text-slate-600 text-sm">{open ? "▲" : "▼"}</span>
      </button>
      {open && <div className="px-5 pb-5 border-t border-slate-800 pt-4">{children}</div>}
    </div>
  )
}

const inputCls =
  "w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm " +
  "text-slate-100 placeholder-slate-600 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"

const PageEditorPage: React.FC = () => {
  const { id } = useParams<{ id?: string }>()
  const isEditing = Boolean(id)
  const navigate = useNavigate()

  const [activeLocale, setActiveLocale] = useState<string>("en")
  const [locales, setLocales] = useState<LocaleMap>({ en: emptyLocale() })
  const [defaultLocale, setDefaultLocale] = useState<string>("en")

  const [addingLocale, setAddingLocale] = useState(false)
  const [newLocaleInput, setNewLocaleInput] = useState("")
  const addInputRef = useRef<HTMLInputElement>(null)

  const [status, setStatus] = useState<PageStatus>("DRAFT")
  const [pageConfig, setPageConfig] = useState<PageConfig>(DEFAULT_PAGE_CONFIG)
  const [loading, setLoading] = useState(isEditing)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [saved, setSaved] = useState(true)
  const [viewMode, setViewMode] = useState<ViewMode>("split")

  const slugTouched = useRef<Record<string, boolean>>({})

  const current = locales[activeLocale] ?? emptyLocale()

  const setCurrentField = <K extends keyof LocaleData>(field: K, value: LocaleData[K]) => {
    setLocales((prev) => ({
      ...prev,
      [activeLocale]: {
        ...emptyLocale(),
        ...prev[activeLocale],
        [field]: value,
      },
    }))
    setSaved(false)
  }

  useEffect(() => {
    if (!isEditing || !id) return
    pagesApi
      .adminGet(id)
      .then(({ data }) => {
        setStatus(data.status)
        if (data.defaultLocale) {
          setDefaultLocale(data.defaultLocale)
          setActiveLocale(data.defaultLocale)
        }
        if (data.pageConfig) {
          setPageConfig({
            ...DEFAULT_PAGE_CONFIG,
            ...(data.pageConfig as Partial<PageConfig>),
          })
        }
        const map: LocaleMap = {}
        for (const tr of data.translations ?? []) {
          const hero = tr.heroContent as HeroContent | null | undefined
          map[tr.locale] = {
            title: tr.title,
            slug: tr.slug,
            content: tr.content,
            metaTitle: tr.metaTitle ?? "",
            metaDescription: tr.metaDescription ?? "",
            ogImage: tr.ogImage ?? "",
            heroSubtitle: hero?.subtitle ?? "",
            heroImage: hero?.image ?? "",
            heroCtaText: hero?.ctaText ?? "",
            heroCtaUrl: hero?.ctaUrl ?? "",
          }
          slugTouched.current[tr.locale] = true
        }
        if (Object.keys(map).length === 0) map["en"] = emptyLocale()
        setLocales(map)
        setSaved(true)
      })
      .catch((err: Error) => setError(err.message))
      .finally(() => setLoading(false))
  }, [id, isEditing])

  // Focus add-locale input when it appears
  useEffect(() => {
    if (addingLocale) addInputRef.current?.focus()
  }, [addingLocale])

  const handleTitleChange = (value: string) => {
    setLocales((prev) => ({
      ...prev,
      [activeLocale]: {
        ...emptyLocale(),
        ...prev[activeLocale],
        title: value,
        slug: slugTouched.current[activeLocale] ? (prev[activeLocale]?.slug ?? "") : slugify(value),
      },
    }))
    setSaved(false)
  }

  const handleSlugChange = (value: string) => {
    slugTouched.current[activeLocale] = true
    setCurrentField("slug", slugify(value))
  }

  const handleContentChange = useCallback(
    (doc: TipTapDoc) => {
      setLocales((prev) => ({
        ...prev,
        [activeLocale]: {
          ...emptyLocale(),
          ...prev[activeLocale],
          content: doc,
        },
      }))
      setSaved(false)
    },
    [activeLocale],
  )

  const commitAddLocale = (code: string) => {
    const normalized = code.trim().toLowerCase().slice(0, 10)
    if (!normalized || locales[normalized]) {
      setAddingLocale(false)
      setNewLocaleInput("")
      return
    }
    setLocales((prev) => ({ ...prev, [normalized]: emptyLocale() }))
    setActiveLocale(normalized)
    setAddingLocale(false)
    setNewLocaleInput("")
    setSaved(false)
  }

  const removeLocale = (locale: string) => {
    if (locale === defaultLocale) return
    if (Object.keys(locales).length <= 1) return
    setLocales((prev) => {
      const next = { ...prev }
      delete next[locale]
      return next
    })
    if (activeLocale === locale) setActiveLocale(defaultLocale)
    setSaved(false)
  }

  const save = async (overrideStatus?: PageStatus) => {
    const defaultData = locales[defaultLocale]
    if (!defaultData?.title.trim()) {
      setError("Title is required")
      return
    }

    setSaving(true)
    setError(null)

    const translations: Record<string, PageTranslationPayload> = {}
    for (const loc of Object.keys(locales)) {
      const d = locales[loc]
      if (!d?.title.trim()) continue
      const heroContent: HeroContent | undefined =
        d.heroSubtitle || d.heroImage || d.heroCtaText || d.heroCtaUrl
          ? {
              subtitle: d.heroSubtitle || undefined,
              image: d.heroImage || undefined,
              ctaText: d.heroCtaText || undefined,
              ctaUrl: d.heroCtaUrl || undefined,
            }
          : undefined
      translations[loc] = {
        title: d.title.trim(),
        slug: d.slug || slugify(d.title),
        content: d.content as unknown as Record<string, unknown>,
        metaTitle: d.metaTitle.trim() || undefined,
        metaDescription: d.metaDescription.trim() || undefined,
        ogImage: d.ogImage.trim() || undefined,
        heroContent,
      }
    }

    const payload = {
      defaultLocale,
      translations,
      status: overrideStatus ?? status,
      pageConfig,
    }

    try {
      if (isEditing && id) {
        await pagesApi.update(id, payload)
      } else {
        const { data: created } = await pagesApi.create(payload)
        navigate(`/admin/pages/${created.id}/edit`, { replace: true })
      }
      setStatus(overrideStatus ?? status)
      setSaved(true)
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Save failed")
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <Layout admin>
        <SkeletonPageHeader />
        <SkeletonEditorForm />
      </Layout>
    )
  }

  const serpTitle = current.metaTitle.trim() || current.title.trim() || "Page title"
  const serpDesc = current.metaDescription.trim() || "No description."
  const serpSlug = current.slug || slugify(current.title) || "page-slug"
  const hasContent = current.title.trim().length > 0
  const activeLocaleKeys = Object.keys(locales)
  const localeHasContent = (l: string) => (locales[l]?.title ?? "").trim().length > 0
  const suggestions = COMMON_LOCALES.filter((l) => !locales[l])

  return (
    <Layout admin>
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <h1 className="text-xl font-semibold text-slate-100 mr-auto">
          {isEditing ? "Edit page" : "New page"}
        </h1>

        {!saved && <span className="text-xs text-amber-500 font-medium">● Unsaved changes</span>}

        <div className="flex rounded-lg border border-slate-700 overflow-hidden text-xs">
          {(["editor", "split", "preview"] as ViewMode[]).map((mode) => (
            <button
              key={mode}
              onClick={() => setViewMode(mode)}
              className={[
                "px-3 py-1.5 capitalize font-medium transition-colors",
                viewMode === mode
                  ? "bg-slate-700 text-white"
                  : "text-slate-400 hover:text-slate-200",
              ].join(" ")}
            >
              {mode}
            </button>
          ))}
        </div>

        <button
          onClick={() => save("DRAFT")}
          disabled={saving}
          className="rounded-lg border border-slate-700 px-4 py-1.5 text-sm font-medium
                     text-slate-300 hover:border-slate-500 hover:text-white disabled:opacity-50 transition-colors"
        >
          {saving ? "Saving…" : "Save draft"}
        </button>
        <button
          onClick={() => save("PUBLISHED")}
          disabled={saving}
          className="rounded-lg bg-brand-600 px-4 py-1.5 text-sm font-semibold text-white
                     hover:bg-brand-700 disabled:opacity-50 transition-colors"
        >
          {status === "PUBLISHED" ? "Update" : "Publish"}
        </button>
      </div>

      {error && (
        <p className="mb-4 rounded-lg bg-red-900/30 border border-red-800 px-4 py-3 text-sm text-red-400">
          {error}
        </p>
      )}

      <div className="mb-4 rounded-xl border border-slate-800 bg-slate-900/60 p-4 space-y-4">
        <div className="flex flex-wrap items-end gap-6">
          <div>
            <label className="block mb-1 text-xs font-medium uppercase tracking-wider text-slate-500">
              Default locale
            </label>
            <select
              value={defaultLocale}
              onChange={(e) => {
                setDefaultLocale(e.target.value)
                setSaved(false)
              }}
              className="rounded-lg border border-slate-700 bg-slate-800 px-3 py-1.5 text-sm text-slate-200
                         focus:border-brand-500 focus:outline-none"
            >
              {activeLocaleKeys.map((l) => (
                <option key={l} value={l}>
                  {getLocaleFlag(l)} {l.toUpperCase()}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block mb-1 text-xs font-medium uppercase tracking-wider text-slate-500">
              Layout
            </label>
            <div className="flex rounded-lg border border-slate-700 overflow-hidden text-xs">
              {(["default", "wide", "full-width"] as PageLayout[]).map((lay) => (
                <button
                  key={lay}
                  type="button"
                  onClick={() => {
                    setPageConfig((p) => ({ ...p, layout: lay }))
                    setSaved(false)
                  }}
                  className={[
                    "px-3 py-1.5 capitalize font-medium transition-colors",
                    pageConfig.layout === lay
                      ? "bg-brand-600 text-white"
                      : "text-slate-400 hover:text-slate-200",
                  ].join(" ")}
                >
                  {lay}
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-4">
            <label className="flex items-center gap-2 cursor-pointer select-none text-sm text-slate-400">
              <input
                type="checkbox"
                checked={pageConfig.showToc}
                onChange={(e) => {
                  setPageConfig((p) => ({ ...p, showToc: e.target.checked }))
                  setSaved(false)
                }}
                className="h-4 w-4 rounded border-slate-600 bg-slate-800 accent-brand-500"
              />
              Table of contents
            </label>

            <label className="flex items-center gap-2 cursor-pointer select-none text-sm text-slate-400">
              <input
                type="checkbox"
                checked={pageConfig.showHero}
                onChange={(e) => {
                  setPageConfig((p) => ({ ...p, showHero: e.target.checked }))
                  setSaved(false)
                }}
                className="h-4 w-4 rounded border-slate-600 bg-slate-800 accent-brand-500"
              />
              Hero section
            </label>
          </div>
        </div>
      </div>

      <div className="mb-0 flex items-end gap-1 flex-wrap">
        {activeLocaleKeys.map((locale) => {
          const isActive = activeLocale === locale
          const hasFilled = localeHasContent(locale)
          const isDefault = defaultLocale === locale
          const canRemove = !isDefault && activeLocaleKeys.length > 1
          return (
            <button
              key={locale}
              onClick={() => setActiveLocale(locale)}
              className={[
                "group relative flex items-center gap-1.5 rounded-t-lg border-l border-r border-t px-3 py-2",
                "font-mono text-xs font-bold tracking-wider transition-all duration-200",
                isActive
                  ? [
                      "border-brand-500/60 bg-slate-900/60 text-brand-300",
                      "shadow-[0_-2px_12px_var(--color-primary)_/_0.25]",
                      "after:absolute after:inset-x-0 after:bottom-[-1px] after:h-px after:bg-slate-900",
                    ].join(" ")
                  : "border-slate-700/50 bg-slate-950 text-slate-500 hover:text-slate-300 hover:border-slate-600",
              ].join(" ")}
            >
              <span className="text-[13px] leading-none">{getLocaleFlag(locale)}</span>
              <span>{locale.toUpperCase()}</span>
              {isDefault && (
                <span
                  title="Default locale"
                  className={[
                    "text-[9px] leading-none",
                    isActive ? "text-brand-400" : "text-slate-600",
                  ].join(" ")}
                >
                  ★
                </span>
              )}
              {!hasFilled && (
                <span
                  title="Translation missing"
                  className={[
                    "h-1.5 w-1.5 rounded-full",
                    isActive ? "bg-amber-400" : "bg-amber-600",
                  ].join(" ")}
                />
              )}
              {canRemove && (
                <span
                  role="button"
                  title={`Remove ${locale.toUpperCase()} translation`}
                  onClick={(e) => {
                    e.stopPropagation()
                    removeLocale(locale)
                  }}
                  className={[
                    "ml-0.5 flex h-3.5 w-3.5 items-center justify-center rounded-full text-[9px]",
                    "opacity-0 group-hover:opacity-100 transition-opacity",
                    isActive
                      ? "bg-brand-800 text-brand-300 hover:bg-red-800 hover:text-red-300"
                      : "bg-slate-800 text-slate-500 hover:bg-red-900 hover:text-red-400",
                  ].join(" ")}
                >
                  ✕
                </span>
              )}
            </button>
          )
        })}

        {addingLocale ? (
          <div
            className="relative flex items-end gap-1 rounded-t-lg border-l border-r border-t
                          border-slate-700/50 bg-slate-950 px-3 py-2"
          >
            <input
              ref={addInputRef}
              value={newLocaleInput}
              onChange={(e) => setNewLocaleInput(e.target.value.slice(0, 10))}
              onKeyDown={(e) => {
                if (e.key === "Enter") commitAddLocale(newLocaleInput)
                if (e.key === "Escape") {
                  setAddingLocale(false)
                  setNewLocaleInput("")
                }
              }}
              placeholder="e.g. es"
              className="w-20 bg-transparent font-mono text-xs text-slate-300 placeholder-slate-700
                         focus:outline-none uppercase"
            />
            <button
              onClick={() => commitAddLocale(newLocaleInput)}
              className="text-[10px] text-brand-400 hover:text-brand-300"
            >
              ✓
            </button>
            <button
              onClick={() => {
                setAddingLocale(false)
                setNewLocaleInput("")
              }}
              className="text-[10px] text-slate-600 hover:text-slate-400"
            >
              ✕
            </button>
            {suggestions.length > 0 && (
              <div
                className="absolute left-0 top-full z-20 mt-1 flex flex-wrap gap-1
                              rounded-lg border border-slate-700 bg-slate-900 p-2 shadow-xl min-w-[180px]"
              >
                {suggestions.slice(0, 8).map((s) => (
                  <button
                    key={s}
                    onClick={() => commitAddLocale(s)}
                    className="flex items-center gap-1 rounded-md border border-slate-700
                               bg-slate-800 px-2 py-1 font-mono text-[10px] font-bold text-slate-400
                               hover:border-brand-600 hover:text-brand-300 transition-colors"
                  >
                    <span>{getLocaleFlag(s)}</span>
                    <span>{s.toUpperCase()}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        ) : (
          <button
            onClick={() => setAddingLocale(true)}
            title="Add a translation"
            className="flex items-center gap-1 rounded-t-lg border-l border-r border-t
                       border-slate-700/50 bg-slate-950 px-3 py-2 text-xs text-slate-600
                       hover:border-slate-600 hover:text-slate-300 transition-all"
          >
            <span className="text-base leading-none">+</span>
          </button>
        )}
      </div>

      <div className="mb-4 rounded-b-xl rounded-tr-xl border border-slate-800 bg-slate-900/60 p-5">
        {!hasContent && activeLocale !== defaultLocale && (
          <div
            className="mb-4 flex items-center gap-2 rounded-lg border border-amber-800/50
                          bg-amber-900/20 px-4 py-2.5 text-xs text-amber-400"
          >
            <span>⚠</span>
            <span>
              Translation missing — fill in the{" "}
              <span className="font-mono font-bold">{defaultLocale.toUpperCase()}</span> tab first.
            </span>
          </div>
        )}

        <div className="mb-3 grid gap-3 sm:grid-cols-2">
          <div>
            <label className="block mb-1 text-xs font-medium uppercase tracking-wider text-slate-500">
              Title *
            </label>
            <input
              value={current.title}
              onChange={(e) => handleTitleChange(e.target.value)}
              placeholder="Page title"
              className={inputCls}
            />
          </div>
          <div>
            <label className="block mb-1 text-xs font-medium uppercase tracking-wider text-slate-500">
              Slug
            </label>
            <input
              value={current.slug}
              onChange={(e) => handleSlugChange(e.target.value)}
              placeholder="page-slug"
              className={inputCls + " font-mono text-slate-400"}
            />
          </div>
        </div>

        {pageConfig.showHero && (
          <div className="mt-3">
            <Collapsible title="Hero section">
              <div className="grid gap-3 md:grid-cols-2">
                <div>
                  <label className="block mb-1 text-xs font-medium uppercase tracking-wider text-slate-500">
                    Subtitle / tagline
                  </label>
                  <input
                    value={current.heroSubtitle}
                    onChange={(e) => {
                      setCurrentField("heroSubtitle", e.target.value)
                    }}
                    placeholder="Empowering developers worldwide"
                    className={inputCls}
                  />
                </div>
                <div>
                  <label className="block mb-1 text-xs font-medium uppercase tracking-wider text-slate-500">
                    Hero background image URL
                  </label>
                  <input
                    value={current.heroImage}
                    onChange={(e) => {
                      setCurrentField("heroImage", e.target.value)
                    }}
                    placeholder="https://…"
                    className={inputCls + " font-mono text-slate-400"}
                  />
                </div>
                <div>
                  <label className="block mb-1 text-xs font-medium uppercase tracking-wider text-slate-500">
                    CTA button text
                  </label>
                  <input
                    value={current.heroCtaText}
                    onChange={(e) => {
                      setCurrentField("heroCtaText", e.target.value)
                    }}
                    placeholder="Get started"
                    className={inputCls}
                  />
                </div>
                <div>
                  <label className="block mb-1 text-xs font-medium uppercase tracking-wider text-slate-500">
                    CTA button URL
                  </label>
                  <input
                    value={current.heroCtaUrl}
                    onChange={(e) => {
                      setCurrentField("heroCtaUrl", e.target.value)
                    }}
                    placeholder="/blog"
                    className={inputCls + " font-mono text-slate-400"}
                  />
                </div>
              </div>
            </Collapsible>
          </div>
        )}

        <div className="mt-3">
          <Collapsible title="SEO & Social">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-4">
                <div>
                  <label className="block mb-1 text-xs font-medium uppercase tracking-wider text-slate-500">
                    Meta title{" "}
                    <span className="text-slate-600">({current.metaTitle.length}/255)</span>
                  </label>
                  <input
                    value={current.metaTitle}
                    onChange={(e) => setCurrentField("metaTitle", e.target.value.slice(0, 255))}
                    placeholder={current.title || "Page title"}
                    className={inputCls}
                  />
                </div>
                <div>
                  <label className="block mb-1 text-xs font-medium uppercase tracking-wider text-slate-500">
                    Meta description{" "}
                    <span className="text-slate-600">({current.metaDescription.length}/500)</span>
                  </label>
                  <textarea
                    value={current.metaDescription}
                    onChange={(e) =>
                      setCurrentField("metaDescription", e.target.value.slice(0, 500))
                    }
                    rows={3}
                    className={inputCls + " resize-none"}
                  />
                </div>
                <div>
                  <label className="block mb-1 text-xs font-medium uppercase tracking-wider text-slate-500">
                    OG Image URL
                  </label>
                  <input
                    value={current.ogImage}
                    onChange={(e) => setCurrentField("ogImage", e.target.value)}
                    placeholder="https://…"
                    className={inputCls + " font-mono text-slate-400"}
                  />
                </div>
              </div>
              <div>
                <p className="mb-2 text-xs font-medium uppercase tracking-wider text-slate-500">
                  SERP Preview
                </p>
                <div className="rounded-lg border border-slate-700 bg-slate-950 p-4 space-y-1">
                  <div className="text-xs text-green-600 font-mono truncate">
                    example.com/{activeLocale}/{serpSlug}
                  </div>
                  <div className="text-base text-blue-400 line-clamp-1 font-medium">
                    {serpTitle}
                  </div>
                  <div className="text-xs text-slate-400 line-clamp-2">{serpDesc}</div>
                </div>
                {current.ogImage && (
                  <img
                    src={current.ogImage}
                    alt="OG preview"
                    className="mt-3 w-full rounded-lg border border-slate-700 object-cover max-h-40"
                    onError={(e) => {
                      ;(e.target as HTMLImageElement).style.display = "none"
                    }}
                  />
                )}
              </div>
            </div>
          </Collapsible>
        </div>
      </div>

      <div
        className={["gap-6", viewMode === "split" ? "grid md:grid-cols-2" : "flex flex-col"].join(
          " ",
        )}
      >
        {(viewMode === "editor" || viewMode === "split") && (
          <div className="rounded-xl border border-slate-800 bg-slate-900/60 overflow-hidden flex flex-col">
            <RichTextEditor
              key={activeLocale}
              content={current.content}
              onChange={handleContentChange}
              placeholder="Start writing…"
              className="min-h-[60vh]"
            />
          </div>
        )}
        {(viewMode === "preview" || viewMode === "split") && (
          <div className="rounded-xl border border-slate-800 bg-slate-900/40 overflow-hidden">
            <p className="px-6 pt-5 pb-3 text-xs font-medium uppercase tracking-wider text-slate-600">
              Preview
            </p>

            {pageConfig.showHero && (
              <div
                className="relative px-6 py-10 mb-4 flex flex-col gap-3"
                style={{
                  background: current.heroImage
                    ? `linear-gradient(rgba(2,6,23,0.65), rgba(2,6,23,0.85)), url(${current.heroImage}) center/cover`
                    : "linear-gradient(135deg, rgb(var(--color-primary-rgb)/0.35), rgb(var(--color-surface-rgb)/0.9))",
                }}
              >
                {current.title && (
                  <h1 className="text-3xl font-bold text-white leading-tight">{current.title}</h1>
                )}
                {current.heroSubtitle && (
                  <p className="text-slate-300 text-lg">{current.heroSubtitle}</p>
                )}
                {current.heroCtaText && (
                  <a
                    href={current.heroCtaUrl || "#"}
                    className="inline-block self-start rounded-lg bg-brand-600 px-5 py-2.5 text-sm font-semibold text-white"
                  >
                    {current.heroCtaText}
                  </a>
                )}
              </div>
            )}

            <div className="px-6 pb-6">
              {!pageConfig.showHero && current.title && (
                <h1 className="mb-6 text-3xl font-bold text-slate-50">{current.title}</h1>
              )}
              {pageConfig.showToc && <TableOfContents doc={current.content} className="mb-6" />}
              <PostRenderer doc={current.content} />
            </div>
          </div>
        )}
      </div>
    </Layout>
  )
}

export default PageEditorPage
