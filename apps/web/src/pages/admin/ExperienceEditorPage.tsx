import React, { useCallback, useEffect, useRef, useState } from "react"
import { useNavigate, useParams } from "react-router-dom"
import { experiencesApi, ApiError } from "../../lib/api.js"
import type { TipTapDoc } from "../../types/index.js"
import { RichTextEditor } from "../../components/editor/RichTextEditor.js"
import { Layout } from "../../components/common/Layout.js"
import { SkeletonEditorForm, SkeletonPageHeader } from "../../components/common/Skeleton.js"

const EMPTY_DOC: TipTapDoc = { type: "doc", content: [{ type: "paragraph" }] }

const KNOWN_FLAGS: Record<string, string> = {
  en: "🇬🇧", "en-us": "🇺🇸", fr: "🇫🇷", de: "🇩🇪", es: "🇪🇸",
  it: "🇮🇹", pt: "🇵🇹", nl: "🇳🇱", ru: "🇷🇺", ja: "🇯🇵",
  ko: "🇰🇷", zh: "🇨🇳", ar: "🇸🇦", pl: "🇵🇱", tr: "🇹🇷",
}
const getLocaleFlag = (locale: string) => KNOWN_FLAGS[locale.toLowerCase()] ?? "🌐"
const COMMON_LOCALES = ["es", "de", "it", "pt", "nl", "ru", "ja", "ko", "zh", "ar", "pl", "tr"]

interface LocaleData {
  role: string
  description: TipTapDoc
}

const emptyLocale = (): LocaleData => ({ role: "", description: EMPTY_DOC })

type LocaleMap = Record<string, LocaleData>

const inputCls =
  "w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm " +
  "text-slate-100 placeholder-slate-600 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"

const ExperienceEditorPage: React.FC = () => {
  const { id } = useParams<{ id?: string }>()
  const isEditing = Boolean(id)
  const navigate = useNavigate()

  // Shared fields
  const [company, setCompany] = useState("")
  const [location, setLocation] = useState("")
  const [startDate, setStartDate] = useState("")
  const [endDate, setEndDate] = useState("")
  const [isCurrent, setIsCurrent] = useState(false)
  const [url, setUrl] = useState("")
  const [logoUrl, setLogoUrl] = useState("")

  // Locale tabs
  const [locales, setLocales] = useState<LocaleMap>({ en: emptyLocale() })
  const [activeLocale, setActiveLocale] = useState("en")
  const [addingLocale, setAddingLocale] = useState(false)
  const [newLocaleInput, setNewLocaleInput] = useState("")
  const addInputRef = useRef<HTMLInputElement>(null)

  const [loading, setLoading] = useState(isEditing)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [saved, setSaved] = useState(true)

  const current = locales[activeLocale] ?? emptyLocale()

  const setCurrentField = <K extends keyof LocaleData>(field: K, value: LocaleData[K]) => {
    setLocales((prev) => ({
      ...prev,
      [activeLocale]: { ...emptyLocale(), ...prev[activeLocale], [field]: value },
    }))
    setSaved(false)
  }

  useEffect(() => {
    if (!isEditing || !id) return
    experiencesApi
      .adminGet(id)
      .then(({ data }) => {
        setCompany(data.company)
        setLocation(data.location ?? "")
        setStartDate(data.startDate ? data.startDate.slice(0, 10) : "")
        if (data.endDate) {
          setEndDate(data.endDate.slice(0, 10))
          setIsCurrent(false)
        } else {
          setIsCurrent(true)
        }
        setUrl(data.url ?? "")
        setLogoUrl(data.logoUrl ?? "")

        const map: LocaleMap = {}
        for (const tr of data.translations ?? []) {
          map[tr.locale] = {
            role: tr.role,
            description: tr.description as TipTapDoc,
          }
        }
        if (Object.keys(map).length === 0) map["en"] = emptyLocale()
        setLocales(map)
        setActiveLocale(Object.keys(map)[0] ?? "en")
        setSaved(true)
      })
      .catch((err: Error) => setError(err.message))
      .finally(() => setLoading(false))
  }, [id, isEditing])

  useEffect(() => {
    if (addingLocale) addInputRef.current?.focus()
  }, [addingLocale])

  const handleDescriptionChange = useCallback(
    (doc: TipTapDoc) => {
      setLocales((prev) => ({
        ...prev,
        [activeLocale]: { ...emptyLocale(), ...prev[activeLocale], description: doc },
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
    if (Object.keys(locales).length === 1) return
    const next = { ...locales }
    delete next[locale]
    setLocales(next)
    if (activeLocale === locale) setActiveLocale(Object.keys(next)[0] ?? "en")
    setSaved(false)
  }

  const handleSave = async () => {
    if (!company.trim()) { setError("Company is required"); return }
    if (!startDate) { setError("Start date is required"); return }
    const hasTr = Object.values(locales).some((l) => l.role.trim())
    if (!hasTr) { setError("At least one locale with a role is required"); return }

    setSaving(true)
    setError(null)
    try {
      const payload = {
        company: company.trim(),
        location: location.trim() || undefined,
        startDate,
        endDate: isCurrent ? null : (endDate || undefined),
        url: url.trim() || undefined,
        logoUrl: logoUrl.trim() || undefined,
        translations: Object.fromEntries(
          Object.entries(locales)
            .filter(([, l]) => l.role.trim())
            .map(([locale, l]) => [locale, {
              role: l.role,
              description: l.description as Record<string, unknown>,
            }]),
        ),
      }

      if (isEditing && id) {
        await experiencesApi.update(id, payload)
      } else {
        await experiencesApi.create(payload)
      }
      setSaved(true)
      void navigate("/admin/experiences")
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

  const localeKeys = Object.keys(locales)

  return (
    <Layout admin>
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <button
            onClick={() => navigate("/admin/experiences")}
            className="mb-1 text-xs text-slate-500 hover:text-slate-300 transition-colors"
          >
            ← Work Experience
          </button>
          <h1 className="text-2xl font-bold text-slate-50">
            {isEditing ? "Edit experience" : "New experience"}
          </h1>
        </div>
        <div className="flex items-center gap-3">
          {!saved && <span className="text-xs text-amber-400">● Unsaved changes</span>}
          <button
            onClick={() => void handleSave()}
            disabled={saving}
            className="rounded-lg bg-brand-600 px-5 py-2 text-sm font-semibold text-white hover:bg-brand-500 disabled:opacity-50 transition-colors"
          >
            {saving ? "Saving…" : isEditing ? "Update" : "Create"}
          </button>
        </div>
      </div>

      {error && (
        <div className="mb-4 rounded-lg border border-red-800 bg-red-950 px-4 py-3 text-sm text-red-300">
          {error}
          <button onClick={() => setError(null)} className="ml-2 underline">dismiss</button>
        </div>
      )}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Left — shared fields */}
        <div className="space-y-4 lg:col-span-1">
          <section className="rounded-xl border border-slate-800 bg-slate-900 p-5 space-y-4">
            <h2 className="text-xs font-semibold uppercase tracking-widest text-slate-500">Company</h2>

            <div>
              <label className="mb-1 block text-xs text-slate-400">Company *</label>
              <input
                value={company}
                onChange={(e) => { setCompany(e.target.value); setSaved(false) }}
                className={inputCls}
                placeholder="Acme Corp"
              />
            </div>

            <div>
              <label className="mb-1 block text-xs text-slate-400">Location</label>
              <input
                value={location}
                onChange={(e) => { setLocation(e.target.value); setSaved(false) }}
                className={inputCls}
                placeholder="Paris, France · Remote"
              />
            </div>

            <div>
              <label className="mb-1 block text-xs text-slate-400">Company URL</label>
              <input
                type="url"
                value={url}
                onChange={(e) => { setUrl(e.target.value); setSaved(false) }}
                className={inputCls}
                placeholder="https://acme.com"
              />
            </div>

            <div>
              <label className="mb-1 block text-xs text-slate-400">Logo URL</label>
              <input
                type="url"
                value={logoUrl}
                onChange={(e) => { setLogoUrl(e.target.value); setSaved(false) }}
                className={inputCls}
                placeholder="https://acme.com/logo.png"
              />
              {logoUrl && (
                <img
                  src={logoUrl}
                  alt="Logo"
                  className="mt-2 h-10 w-10 rounded object-contain bg-slate-800 p-1"
                  onError={(e) => { (e.target as HTMLImageElement).style.display = "none" }}
                />
              )}
            </div>
          </section>

          <section className="rounded-xl border border-slate-800 bg-slate-900 p-5 space-y-4">
            <h2 className="text-xs font-semibold uppercase tracking-widest text-slate-500">Period</h2>

            <div>
              <label className="mb-1 block text-xs text-slate-400">Start date *</label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => { setStartDate(e.target.value); setSaved(false) }}
                className={inputCls}
              />
            </div>

            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={isCurrent}
                onChange={(e) => { setIsCurrent(e.target.checked); setSaved(false) }}
                className="h-4 w-4 rounded border-slate-600 bg-slate-800 accent-brand-500"
              />
              <span className="text-sm text-slate-300">Currently working here</span>
            </label>

            {!isCurrent && (
              <div>
                <label className="mb-1 block text-xs text-slate-400">End date</label>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => { setEndDate(e.target.value); setSaved(false) }}
                  className={inputCls}
                />
              </div>
            )}
          </section>
        </div>

        {/* Right — locale tabs */}
        <div className="lg:col-span-2">
          <div className="rounded-xl border border-slate-800 bg-slate-900 overflow-hidden">
            {/* Locale tabs */}
            <div className="flex items-center gap-0.5 border-b border-slate-800 px-4 pt-3 overflow-x-auto">
              {localeKeys.map((locale) => {
                const hasRole = Boolean(locales[locale]?.role.trim())
                return (
                  <button
                    key={locale}
                    onClick={() => setActiveLocale(locale)}
                    className={[
                      "flex items-center gap-1.5 rounded-t-lg px-3 py-2 text-xs font-medium whitespace-nowrap transition-colors",
                      activeLocale === locale
                        ? "border border-b-0 border-slate-700 bg-slate-950 text-slate-100"
                        : "text-slate-500 hover:text-slate-300",
                    ].join(" ")}
                  >
                    <span>{getLocaleFlag(locale)}</span>
                    {locale.toUpperCase()}
                    {!hasRole && (
                      <span className="h-1.5 w-1.5 rounded-full bg-amber-500" title="Role missing" />
                    )}
                    {localeKeys.length > 1 && (
                      <span
                        onClick={(e) => { e.stopPropagation(); removeLocale(locale) }}
                        className="ml-0.5 text-slate-600 hover:text-red-400 cursor-pointer"
                      >
                        ✕
                      </span>
                    )}
                  </button>
                )
              })}

              {/* Add locale */}
              {!addingLocale ? (
                <button
                  onClick={() => setAddingLocale(true)}
                  className="ml-1 rounded px-2 py-1 text-xs text-slate-600 hover:text-slate-300 transition-colors"
                >
                  + Add
                </button>
              ) : (
                <div className="ml-1 flex items-center gap-1">
                  <input
                    ref={addInputRef}
                    value={newLocaleInput}
                    onChange={(e) => setNewLocaleInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") commitAddLocale(newLocaleInput)
                      if (e.key === "Escape") { setAddingLocale(false); setNewLocaleInput("") }
                    }}
                    list="common-locales"
                    placeholder="fr"
                    className="w-16 rounded border border-slate-700 bg-slate-800 px-2 py-1 text-xs text-slate-100 focus:outline-none"
                  />
                  <datalist id="common-locales">
                    {COMMON_LOCALES.filter((l) => !locales[l]).map((l) => (
                      <option key={l} value={l} />
                    ))}
                  </datalist>
                  <button
                    onClick={() => commitAddLocale(newLocaleInput)}
                    className="text-xs text-brand-400 hover:text-brand-300"
                  >✓</button>
                </div>
              )}
            </div>

            {/* Locale content */}
            <div className="p-5 space-y-5">
              <div>
                <label className="mb-1 block text-xs text-slate-400">Job title / Role *</label>
                <input
                  value={current.role}
                  onChange={(e) => setCurrentField("role", e.target.value)}
                  className={inputCls}
                  placeholder="Senior Software Engineer"
                />
              </div>

              <div>
                <label className="mb-2 block text-xs text-slate-400">Description</label>
                <div className="min-h-[200px] rounded-lg border border-slate-700 bg-slate-950">
                  <RichTextEditor
                    key={activeLocale}
                    content={current.description}
                    onChange={handleDescriptionChange}
                    placeholder="Describe your role, achievements, and responsibilities…"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  )
}

export default ExperienceEditorPage
