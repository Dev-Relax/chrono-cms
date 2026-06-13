import React, { useCallback, useEffect, useRef, useState } from "react"
import { useNavigate, useParams } from "react-router-dom"
import { educationApi, ApiError } from "../../lib/api.js"
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
  degree: string
  description: TipTapDoc
}

const emptyLocale = (): LocaleData => ({ degree: "", description: EMPTY_DOC })
type LocaleMap = Record<string, LocaleData>

const inputCls =
  "w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm " +
  "text-slate-100 placeholder-slate-600 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"

const EducationEditorPage: React.FC = () => {
  const { id } = useParams<{ id?: string }>()
  const isEditing = Boolean(id)
  const navigate = useNavigate()

  // Shared fields
  const [institution, setInstitution] = useState("")
  const [field, setField] = useState("")
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
    educationApi
      .adminGet(id)
      .then(({ data }) => {
        setInstitution(data.institution)
        setField(data.field ?? "")
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
            degree: tr.degree,
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
    if (!institution.trim()) { setError("Institution is required"); return }
    if (!startDate) { setError("Start date is required"); return }
    const hasTr = Object.values(locales).some((l) => l.degree.trim())
    if (!hasTr) { setError("At least one locale with a degree name is required"); return }

    setSaving(true)
    setError(null)
    try {
      const payload = {
        institution: institution.trim(),
        field: field.trim() || undefined,
        startDate,
        endDate: isCurrent ? null : (endDate || undefined),
        url: url.trim() || undefined,
        logoUrl: logoUrl.trim() || undefined,
        translations: Object.fromEntries(
          Object.entries(locales)
            .filter(([, l]) => l.degree.trim())
            .map(([locale, l]) => [locale, {
              degree: l.degree,
              description: l.description as Record<string, unknown>,
            }]),
        ),
      }

      if (isEditing && id) {
        await educationApi.update(id, payload)
      } else {
        await educationApi.create(payload)
      }
      setSaved(true)
      void navigate("/admin/education")
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
            onClick={() => navigate("/admin/education")}
            className="mb-1 text-xs text-slate-500 hover:text-slate-300 transition-colors"
          >
            ← Education
          </button>
          <h1 className="text-2xl font-bold text-slate-50">
            {isEditing ? "Edit education entry" : "New education entry"}
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
            <h2 className="text-xs font-semibold uppercase tracking-widest text-slate-500">Institution</h2>

            <div>
              <label className="mb-1 block text-xs text-slate-400">Institution *</label>
              <input
                value={institution}
                onChange={(e) => { setInstitution(e.target.value); setSaved(false) }}
                className={inputCls}
                placeholder="MIT, Université Paris-Saclay…"
              />
            </div>

            <div>
              <label className="mb-1 block text-xs text-slate-400">Field of study</label>
              <input
                value={field}
                onChange={(e) => { setField(e.target.value); setSaved(false) }}
                className={inputCls}
                placeholder="Computer Science, Design…"
              />
            </div>

            <div>
              <label className="mb-1 block text-xs text-slate-400">Website URL</label>
              <input
                type="url"
                value={url}
                onChange={(e) => { setUrl(e.target.value); setSaved(false) }}
                className={inputCls}
                placeholder="https://mit.edu"
              />
            </div>

            <div>
              <label className="mb-1 block text-xs text-slate-400">Logo URL</label>
              <input
                type="url"
                value={logoUrl}
                onChange={(e) => { setLogoUrl(e.target.value); setSaved(false) }}
                className={inputCls}
                placeholder="https://mit.edu/logo.png"
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
              <span className="text-sm text-slate-300">Currently enrolled</span>
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
                const hasDegree = Boolean(locales[locale]?.degree.trim())
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
                    {!hasDegree && (
                      <span className="h-1.5 w-1.5 rounded-full bg-amber-500" title="Degree missing" />
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
                    list="common-locales-edu"
                    placeholder="fr"
                    className="w-16 rounded border border-slate-700 bg-slate-800 px-2 py-1 text-xs text-slate-100 focus:outline-none"
                  />
                  <datalist id="common-locales-edu">
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
                <label className="mb-1 block text-xs text-slate-400">Degree / Diploma *</label>
                <input
                  value={current.degree}
                  onChange={(e) => setCurrentField("degree", e.target.value)}
                  className={inputCls}
                  placeholder="Master's in Computer Science, Bachelor of Design…"
                />
              </div>

              <div>
                <label className="mb-2 block text-xs text-slate-400">Description</label>
                <div className="min-h-[200px] rounded-lg border border-slate-700 bg-slate-950">
                  <RichTextEditor
                    key={activeLocale}
                    content={current.description}
                    onChange={handleDescriptionChange}
                    placeholder="Relevant coursework, thesis, achievements…"
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

export default EducationEditorPage
