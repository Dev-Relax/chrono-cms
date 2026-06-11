import React, { useCallback, useEffect, useRef, useState } from "react"
import { useNavigate, useParams } from "react-router-dom"
import { projectsApi, postsApi, resolveMediaUrl, ApiError } from "../../lib/api.js"
import type { ProjectStatus, TipTapDoc } from "../../types/index.js"
import type { ProjectTranslationPayload } from "../../lib/api.js"
import { RichTextEditor } from "../../components/editor/RichTextEditor.js"
import { PostRenderer } from "../../components/editor/PostRenderer.js"
import { MediaPickerModal } from "../../components/editor/MediaPickerModal.js"
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
  fr: "🇫🇷",
  "fr-be": "🇧🇪",
  "fr-ca": "🇨🇦",
  de: "🇩🇪",
  es: "🇪🇸",
  it: "🇮🇹",
  pt: "🇵🇹",
  "pt-br": "🇧🇷",
  nl: "🇳🇱",
  ru: "🇷🇺",
  uk: "🇺🇦",
  pl: "🇵🇱",
  ja: "🇯🇵",
  ko: "🇰🇷",
  zh: "🇨🇳",
  ar: "🇸🇦",
  tr: "🇹🇷",
}
const getLocaleFlag = (locale: string) => KNOWN_FLAGS[locale.toLowerCase()] ?? "🌐"

const COMMON_LOCALES = ["es", "de", "it", "pt", "nl", "ru", "ja", "ko", "zh", "ar", "pl", "tr"]

interface LocaleData {
  title: string
  slug: string
  summary: string
  content: TipTapDoc
  metaTitle: string
  metaDescription: string
}

const emptyLocale = (): LocaleData => ({
  title: "",
  slug: "",
  summary: "",
  content: EMPTY_DOC,
  metaTitle: "",
  metaDescription: "",
})

type LocaleMap = Record<string, LocaleData>
type ViewMode = "editor" | "preview" | "split"
type BlogMode = "post" | "url"

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

const ProjectEditorPage: React.FC = () => {
  const { id } = useParams<{ id?: string }>()
  const isEditing = Boolean(id)
  const navigate = useNavigate()

  const [activeLocale, setActiveLocale] = useState<string>("en")
  const [locales, setLocales] = useState<LocaleMap>({ en: emptyLocale() })
  const [defaultLocale, setDefaultLocale] = useState<string>("en")

  const [addingLocale, setAddingLocale] = useState(false)
  const [newLocaleInput, setNewLocaleInput] = useState("")
  const addInputRef = useRef<HTMLInputElement>(null)

  const [status, setStatus] = useState<ProjectStatus>("DRAFT")
  const [featured, setFeatured] = useState(false)
  const [coverImage, setCoverImage] = useState("")
  const [techStack, setTechStack] = useState<string[]>([])
  const [techInput, setTechInput] = useState("")
  const [githubUrl, setGithubUrl] = useState("")
  const [liveUrl, setLiveUrl] = useState("")
  const [blogMode, setBlogMode] = useState<BlogMode>("url")
  const [postId, setPostId] = useState("")
  const [blogUrl, setBlogUrl] = useState("")

  const [postOptions, setPostOptions] = useState<Array<{ id: string; title: string }>>([])
  const [showMediaPicker, setShowMediaPicker] = useState(false)

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
      [activeLocale]: { ...emptyLocale(), ...prev[activeLocale], [field]: value },
    }))
    setSaved(false)
  }

  // Populate the internal-post dropdown.
  useEffect(() => {
    postsApi
      .adminList({ limit: 100 })
      .then(({ data }) => setPostOptions(data.map((p) => ({ id: p.id, title: p.title }))))
      .catch(() => {
        /* dropdown stays empty */
      })
  }, [])

  useEffect(() => {
    if (!isEditing || !id) return
    projectsApi
      .adminGet(id)
      .then(({ data }) => {
        setStatus(data.status)
        setFeatured(data.featured)
        setCoverImage(data.coverImage ?? "")
        setTechStack(data.techStack ?? [])
        setGithubUrl(data.githubUrl ?? "")
        setLiveUrl(data.liveUrl ?? "")
        if (data.postId) {
          setBlogMode("post")
          setPostId(data.postId)
        } else {
          setBlogMode("url")
          setBlogUrl(data.blogUrl ?? "")
        }
        if (data.defaultLocale) {
          setDefaultLocale(data.defaultLocale)
          setActiveLocale(data.defaultLocale)
        }
        const map: LocaleMap = {}
        for (const tr of data.translations ?? []) {
          map[tr.locale] = {
            title: tr.title,
            slug: tr.slug,
            summary: tr.summary ?? "",
            content: tr.content,
            metaTitle: tr.metaTitle ?? "",
            metaDescription: tr.metaDescription ?? "",
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
        [activeLocale]: { ...emptyLocale(), ...prev[activeLocale], content: doc },
      }))
      setSaved(false)
    },
    [activeLocale],
  )

  const addTechChip = () => {
    const value = techInput.trim()
    if (!value) return
    if (!techStack.includes(value)) {
      setTechStack((prev) => [...prev, value])
      setSaved(false)
    }
    setTechInput("")
  }

  const removeTechChip = (chip: string) => {
    setTechStack((prev) => prev.filter((c) => c !== chip))
    setSaved(false)
  }

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

  const save = async (overrideStatus?: ProjectStatus) => {
    const defaultData = locales[defaultLocale]
    if (!defaultData?.title.trim()) {
      setError("Title is required")
      return
    }

    setSaving(true)
    setError(null)

    const translations: Record<string, ProjectTranslationPayload> = {}
    for (const loc of Object.keys(locales)) {
      const d = locales[loc]
      if (!d?.title.trim()) continue
      translations[loc] = {
        title: d.title.trim(),
        slug: d.slug || slugify(d.title),
        summary: d.summary.trim() || undefined,
        content: d.content as unknown as Record<string, unknown>,
        metaTitle: d.metaTitle.trim() || undefined,
        metaDescription: d.metaDescription.trim() || undefined,
      }
    }

    const payload = {
      defaultLocale,
      translations,
      status: overrideStatus ?? status,
      featured,
      coverImage: coverImage.trim() || undefined,
      techStack,
      githubUrl: githubUrl.trim() || undefined,
      liveUrl: liveUrl.trim() || undefined,
      // Only one of the two blog-link fields is sent.
      ...(blogMode === "post"
        ? { postId: postId || null }
        : { postId: null, blogUrl: blogUrl.trim() || undefined }),
    }

    try {
      if (isEditing && id) {
        await projectsApi.update(id, payload)
      } else {
        const { data: created } = await projectsApi.create(payload)
        navigate(`/admin/projects/${created.id}/edit`, { replace: true })
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

  const serpTitle = current.metaTitle.trim() || current.title.trim() || "Project title"
  const serpDesc =
    current.metaDescription.trim() || current.summary.trim() || "No description."
  const serpSlug = current.slug || slugify(current.title) || "project-slug"
  const hasContent = current.title.trim().length > 0
  const activeLocaleKeys = Object.keys(locales)
  const localeHasContent = (l: string) => (locales[l]?.title ?? "").trim().length > 0
  const suggestions = COMMON_LOCALES.filter((l) => !locales[l])

  return (
    <Layout admin>
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <h1 className="text-xl font-semibold text-slate-100 mr-auto">
          {isEditing ? "Edit project" : "New project"}
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

      {/* Shared (locale-agnostic) project settings */}
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

          <label className="flex items-center gap-2 cursor-pointer select-none text-sm text-slate-400">
            <input
              type="checkbox"
              checked={featured}
              onChange={(e) => {
                setFeatured(e.target.checked)
                setSaved(false)
              }}
              className="h-4 w-4 rounded border-slate-600 bg-slate-800 accent-brand-500"
            />
            ★ Featured
          </label>
        </div>

        {/* Cover image */}
        <div>
          <label className="block mb-1 text-xs font-medium uppercase tracking-wider text-slate-500">
            Cover image
          </label>
          <div className="flex items-center gap-3">
            {coverImage ? (
              <img
                src={resolveMediaUrl(coverImage)}
                alt="Cover"
                className="h-16 w-28 rounded-lg border border-slate-700 object-cover"
                onError={(e) => {
                  ;(e.target as HTMLImageElement).style.display = "none"
                }}
              />
            ) : (
              <div
                className="h-16 w-28 rounded-lg border border-slate-800"
                style={{
                  background:
                    "linear-gradient(135deg, rgb(var(--color-primary-rgb) / 0.3), rgb(var(--color-surface-rgb) / 0.9))",
                }}
              />
            )}
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setShowMediaPicker(true)}
                className="rounded-lg border border-slate-700 px-3 py-1.5 text-sm font-medium
                           text-slate-300 hover:border-slate-500 hover:text-white transition-colors"
              >
                {coverImage ? "Change" : "Choose image"}
              </button>
              {coverImage && (
                <button
                  type="button"
                  onClick={() => {
                    setCoverImage("")
                    setSaved(false)
                  }}
                  className="rounded-lg px-3 py-1.5 text-sm text-slate-500 hover:text-red-400 transition-colors"
                >
                  Remove
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Tech stack chips */}
        <div>
          <label className="block mb-1 text-xs font-medium uppercase tracking-wider text-slate-500">
            Tech stack
          </label>
          <div className="flex flex-wrap items-center gap-2 rounded-lg border border-slate-700 bg-slate-800 px-3 py-2">
            {techStack.map((chip) => (
              <span
                key={chip}
                className="inline-flex items-center gap-1 rounded-full bg-brand-600/20 px-2.5 py-0.5
                           text-xs font-medium text-brand-300"
              >
                {chip}
                <button
                  type="button"
                  onClick={() => removeTechChip(chip)}
                  className="text-brand-400 hover:text-red-400"
                  title={`Remove ${chip}`}
                >
                  ✕
                </button>
              </span>
            ))}
            <input
              value={techInput}
              onChange={(e) => setTechInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault()
                  addTechChip()
                }
                if (e.key === "Backspace" && !techInput && techStack.length > 0) {
                  removeTechChip(techStack[techStack.length - 1]!)
                }
              }}
              onBlur={addTechChip}
              placeholder={techStack.length === 0 ? "Type a technology and press Enter" : "Add…"}
              className="flex-1 min-w-[120px] bg-transparent text-sm text-slate-100 placeholder-slate-600 focus:outline-none"
            />
          </div>
        </div>

        {/* Links */}
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label className="block mb-1 text-xs font-medium uppercase tracking-wider text-slate-500">
              GitHub URL
            </label>
            <input
              value={githubUrl}
              onChange={(e) => {
                setGithubUrl(e.target.value)
                setSaved(false)
              }}
              placeholder="https://github.com/…"
              className={inputCls + " font-mono text-slate-400"}
            />
          </div>
          <div>
            <label className="block mb-1 text-xs font-medium uppercase tracking-wider text-slate-500">
              Live demo URL
            </label>
            <input
              value={liveUrl}
              onChange={(e) => {
                setLiveUrl(e.target.value)
                setSaved(false)
              }}
              placeholder="https://…"
              className={inputCls + " font-mono text-slate-400"}
            />
          </div>
        </div>

        {/* Blog link — internal post or external URL */}
        <div>
          <label className="block mb-1 text-xs font-medium uppercase tracking-wider text-slate-500">
            Blog link
          </label>
          <div className="mb-2 flex rounded-lg border border-slate-700 overflow-hidden text-xs w-fit">
            {(["post", "url"] as BlogMode[]).map((mode) => (
              <button
                key={mode}
                type="button"
                onClick={() => {
                  setBlogMode(mode)
                  setSaved(false)
                }}
                className={[
                  "px-3 py-1.5 font-medium transition-colors",
                  blogMode === mode
                    ? "bg-brand-600 text-white"
                    : "text-slate-400 hover:text-slate-200",
                ].join(" ")}
              >
                {mode === "post" ? "Internal post" : "External URL"}
              </button>
            ))}
          </div>
          {blogMode === "post" ? (
            <select
              value={postId}
              onChange={(e) => {
                setPostId(e.target.value)
                setSaved(false)
              }}
              className={inputCls}
            >
              <option value="">— No linked post —</option>
              {postOptions.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.title}
                </option>
              ))}
            </select>
          ) : (
            <input
              value={blogUrl}
              onChange={(e) => {
                setBlogUrl(e.target.value)
                setSaved(false)
              }}
              placeholder="https://example.com/blog/article"
              className={inputCls + " font-mono text-slate-400"}
            />
          )}
        </div>
      </div>

      {/* Locale tabs */}
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

      {/* Per-locale fields */}
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
              placeholder="Project title"
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
              placeholder="project-slug"
              className={inputCls + " font-mono text-slate-400"}
            />
          </div>
        </div>

        <div className="mb-3">
          <label className="block mb-1 text-xs font-medium uppercase tracking-wider text-slate-500">
            Summary <span className="text-slate-600">(card blurb)</span>
          </label>
          <textarea
            value={current.summary}
            onChange={(e) => setCurrentField("summary", e.target.value)}
            rows={2}
            placeholder="Short description shown on the project card"
            className={inputCls + " resize-none"}
          />
        </div>

        <Collapsible title="SEO & Social">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-4">
              <div>
                <label className="block mb-1 text-xs font-medium uppercase tracking-wider text-slate-500">
                  Meta title <span className="text-slate-600">({current.metaTitle.length}/255)</span>
                </label>
                <input
                  value={current.metaTitle}
                  onChange={(e) => setCurrentField("metaTitle", e.target.value.slice(0, 255))}
                  placeholder={current.title || "Project title"}
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
                  onChange={(e) => setCurrentField("metaDescription", e.target.value.slice(0, 500))}
                  rows={3}
                  className={inputCls + " resize-none"}
                />
              </div>
            </div>
            <div>
              <p className="mb-2 text-xs font-medium uppercase tracking-wider text-slate-500">
                SERP Preview
              </p>
              <div className="rounded-lg border border-slate-700 bg-slate-950 p-4 space-y-1">
                <div className="text-xs text-green-600 font-mono truncate">
                  example.com/projects/{serpSlug}
                </div>
                <div className="text-base text-blue-400 line-clamp-1 font-medium">{serpTitle}</div>
                <div className="text-xs text-slate-400 line-clamp-2">{serpDesc}</div>
              </div>
            </div>
          </div>
        </Collapsible>
      </div>

      {/* Long description editor + preview */}
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
              placeholder="Long description (optional)…"
              className="min-h-[50vh]"
            />
          </div>
        )}
        {(viewMode === "preview" || viewMode === "split") && (
          <div className="rounded-xl border border-slate-800 bg-slate-900/40 overflow-hidden">
            <p className="px-6 pt-5 pb-3 text-xs font-medium uppercase tracking-wider text-slate-600">
              Preview
            </p>
            <div className="px-6 pb-6">
              {current.title && (
                <h1 className="mb-2 text-3xl font-bold text-slate-50">{current.title}</h1>
              )}
              {current.summary && <p className="mb-6 text-slate-400">{current.summary}</p>}
              <PostRenderer doc={current.content} />
            </div>
          </div>
        )}
      </div>

      {showMediaPicker && (
        <MediaPickerModal
          imagesOnly
          onSelectImage={(sel) => {
            setCoverImage(sel.url)
            setSaved(false)
          }}
          onClose={() => setShowMediaPicker(false)}
        />
      )}
    </Layout>
  )
}

export default ProjectEditorPage
