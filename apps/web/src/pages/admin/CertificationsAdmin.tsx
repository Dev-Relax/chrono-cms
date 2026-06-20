import React, { useCallback, useEffect, useRef, useState } from "react"
import { useTranslation } from "react-i18next"
import { certificationsApi, ApiError } from "../../lib/api.js"
import type { Certification, TipTapDoc } from "../../types/index.js"
import { Layout } from "../../components/common/Layout.js"
import { SkeletonTableRows } from "../../components/common/Skeleton.js"
import { RichTextEditor } from "../../components/editor/RichTextEditor.js"

const EMPTY_DOC: TipTapDoc = { type: "doc", content: [{ type: "paragraph" }] }

const KNOWN_FLAGS: Record<string, string> = {
  en: "🇬🇧", "en-us": "🇺🇸", fr: "🇫🇷", de: "🇩🇪", es: "🇪🇸",
  it: "🇮🇹", pt: "🇵🇹", nl: "🇳🇱", ru: "🇷🇺", ja: "🇯🇵",
  ko: "🇰🇷", zh: "🇨🇳", ar: "🇸🇦", pl: "🇵🇱", tr: "🇹🇷",
}
const getLocaleFlag = (locale: string) => KNOWN_FLAGS[locale.toLowerCase()] ?? "🌐"
const COMMON_LOCALES = ["fr", "es", "de", "it", "pt", "nl", "ru", "ja", "ko", "zh", "ar", "pl", "tr"]

interface LocaleData {
  title: string
  description: TipTapDoc
}
const emptyLocale = (): LocaleData => ({ title: "", description: EMPTY_DOC })
type LocaleMap = Record<string, LocaleData>

const emptyShared = {
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
  const { t } = useTranslation()
  const [certs, setCerts] = useState<Certification[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [dragId, setDragId] = useState<string | null>(null)
  const [savingOrder, setSavingOrder] = useState(false)
  const [editingId, setEditingId] = useState<string | "new" | null>(null)
  const [shared, setShared] = useState(emptyShared)
  const [locales, setLocales] = useState<LocaleMap>({ en: emptyLocale() })
  const [activeLocale, setActiveLocale] = useState("en")
  const [addingLocale, setAddingLocale] = useState(false)
  const [newLocaleInput, setNewLocaleInput] = useState("")
  const [saving, setSaving] = useState(false)
  const addLocaleRef = useRef<HTMLInputElement>(null)

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
    if (addingLocale) addLocaleRef.current?.focus()
  }, [addingLocale])

  const resetForm = () => {
    setShared(emptyShared)
    setLocales({ en: emptyLocale() })
    setActiveLocale("en")
    setAddingLocale(false)
    setNewLocaleInput("")
  }

  const openNew = () => {
    resetForm()
    setEditingId("new")
  }

  const openEdit = (c: Certification) => {
    setShared({
      issuer: c.issuer,
      issuedAt: toInputDate(c.issuedAt),
      expiresAt: toInputDate(c.expiresAt),
      credentialUrl: c.credentialUrl ?? "",
      logoUrl: c.logoUrl ?? "",
    })
    const map: LocaleMap = {}
    if (c.translations && c.translations.length > 0) {
      for (const tr of c.translations) {
        map[tr.locale] = {
          title: tr.title,
          description: (tr.description as TipTapDoc | null) ?? EMPTY_DOC,
        }
      }
    } else {
      map["en"] = { title: c.title, description: EMPTY_DOC }
    }
    setLocales(map)
    setActiveLocale(Object.keys(map)[0] ?? "en")
    setEditingId(c.id)
  }

  const closeForm = () => { setEditingId(null); resetForm() }

  const setSharedField = <K extends keyof typeof emptyShared>(key: K, value: string) =>
    setShared((f) => ({ ...f, [key]: value }))

  const setLocaleField = <K extends keyof LocaleData>(key: K, value: LocaleData[K]) => {
    setLocales((prev) => ({
      ...prev,
      [activeLocale]: { ...emptyLocale(), ...prev[activeLocale], [key]: value },
    }))
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
  }

  const removeLocale = (locale: string) => {
    if (Object.keys(locales).length === 1) return
    const next = { ...locales }
    delete next[locale]
    setLocales(next)
    if (activeLocale === locale) setActiveLocale(Object.keys(next)[0] ?? "en")
  }

  const handleDescriptionChange = useCallback(
    (doc: TipTapDoc) => {
      setLocales((prev) => ({
        ...prev,
        [activeLocale]: { ...emptyLocale(), ...prev[activeLocale], description: doc },
      }))
    },
    [activeLocale],
  )

  const handleSave = async () => {
    if (!shared.issuer.trim()) { setError(t("certifications.issuerRequired")); return }
    if (!shared.issuedAt) { setError(t("certifications.issuedAtRequired")); return }
    if (!Object.values(locales).some((l) => l.title.trim())) {
      setError(t("certifications.titleRequired"))
      return
    }

    setSaving(true)
    setError(null)
    try {
      const translations: Record<string, { title: string; description: Record<string, unknown> }> = {}
      for (const [locale, data] of Object.entries(locales)) {
        if (data.title.trim()) {
          translations[locale] = {
            title: data.title.trim(),
            description: data.description as Record<string, unknown>,
          }
        }
      }
      const payload = {
        issuer: shared.issuer.trim(),
        issuedAt: new Date(shared.issuedAt).toISOString(),
        expiresAt: shared.expiresAt ? new Date(shared.expiresAt).toISOString() : null,
        credentialUrl: shared.credentialUrl.trim() || null,
        logoUrl: shared.logoUrl.trim() || null,
        translations,
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
      setError(err instanceof ApiError ? err.message : t("certifications.saveFailed"))
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (c: Certification) => {
    if (!confirm(t("certifications.deleteConfirm", { title: c.title }))) return
    try {
      await certificationsApi.delete(c.id)
      setCerts((prev) => prev.filter((x) => x.id !== c.id))
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t("certifications.saveFailed"))
    }
  }

  const persistOrder = async (ordered: Certification[]) => {
    setSavingOrder(true)
    try {
      await certificationsApi.reorder(ordered.map((c) => c.id))
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t("certifications.saveFailed"))
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

  const localeKeys = Object.keys(locales)
  const currentLocale = locales[activeLocale] ?? emptyLocale()

  return (
    <Layout admin>
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-50">{t("certifications.title")}</h1>
          <p className="mt-1 text-sm text-slate-500">
            {t("certifications.dragHint")}{savingOrder ? ` · ${t("certifications.savingOrder")}` : ""}
          </p>
        </div>
        <button
          onClick={openNew}
          className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-500 transition-colors"
        >
          + {t("certifications.newCert")}
        </button>
      </div>

      {error && (
        <div className="mb-4 rounded-lg border border-red-800 bg-red-950 px-4 py-3 text-sm text-red-300">
          {error}
          <button onClick={() => setError(null)} className="ml-2 underline">{t("common.close")}</button>
        </div>
      )}

      {/* Inline form */}
      {editingId !== null && (
        <div className="mb-6 rounded-xl border border-slate-700 bg-slate-900 p-6">
          <h2 className="mb-5 text-sm font-semibold text-slate-300">
            {editingId === "new" ? t("certifications.newCert") : t("certifications.editCert")}
          </h2>

          {/* Locale tabs + per-locale content */}
          <div className="mb-5 rounded-xl border border-slate-800 bg-slate-950 overflow-hidden">
            <div className="flex items-center gap-0.5 border-b border-slate-800 px-4 pt-3 overflow-x-auto">
              {localeKeys.map((locale) => {
                const hasTitle = Boolean(locales[locale]?.title.trim())
                return (
                  <button
                    key={locale}
                    onClick={() => setActiveLocale(locale)}
                    className={[
                      "flex items-center gap-1.5 rounded-t-lg px-3 py-2 text-xs font-medium whitespace-nowrap transition-colors",
                      activeLocale === locale
                        ? "border border-b-0 border-slate-700 bg-slate-900 text-slate-100"
                        : "text-slate-500 hover:text-slate-300",
                    ].join(" ")}
                  >
                    <span>{getLocaleFlag(locale)}</span>
                    {locale.toUpperCase()}
                    {!hasTitle && (
                      <span className="h-1.5 w-1.5 rounded-full bg-amber-500" title="Title missing" />
                    )}
                    {localeKeys.length > 1 && (
                      <span
                        onClick={(e) => { e.stopPropagation(); removeLocale(locale) }}
                        className="ml-0.5 cursor-pointer text-slate-600 hover:text-red-400"
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
                  {t("certifications.addLocale")}
                </button>
              ) : (
                <div className="ml-1 flex items-center gap-1">
                  <input
                    ref={addLocaleRef}
                    value={newLocaleInput}
                    onChange={(e) => setNewLocaleInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") commitAddLocale(newLocaleInput)
                      if (e.key === "Escape") { setAddingLocale(false); setNewLocaleInput("") }
                    }}
                    list="common-locales-cert"
                    placeholder="fr"
                    className="w-16 rounded border border-slate-700 bg-slate-800 px-2 py-1 text-xs text-slate-100 focus:outline-none"
                  />
                  <datalist id="common-locales-cert">
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

            <div className="p-4 space-y-4">
              <div>
                <label className="mb-1 block text-xs text-slate-400">{t("certifications.titleLabel")}</label>
                <input
                  value={currentLocale.title}
                  onChange={(e) => setLocaleField("title", e.target.value)}
                  className={inputCls}
                  placeholder={t("certifications.titlePlaceholder")}
                  maxLength={200}
                />
              </div>
              <div>
                <label className="mb-2 block text-xs text-slate-400">{t("certifications.descriptionLabel")}</label>
                <div className="min-h-[140px] rounded-lg border border-slate-700 bg-slate-900">
                  <RichTextEditor
                    key={activeLocale}
                    content={currentLocale.description}
                    onChange={handleDescriptionChange}
                    placeholder={t("certifications.descriptionPlaceholder")}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Shared (locale-agnostic) fields */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs text-slate-400">{t("certifications.issuerLabel")}</label>
              <input
                value={shared.issuer}
                onChange={(e) => setSharedField("issuer", e.target.value)}
                className={inputCls}
                placeholder={t("certifications.issuerPlaceholder")}
                maxLength={200}
              />
            </div>
            <div>
              <label className="mb-1 block text-xs text-slate-400">{t("certifications.issuedAtLabel")}</label>
              <input
                type="date"
                value={shared.issuedAt}
                onChange={(e) => setSharedField("issuedAt", e.target.value)}
                className={inputCls}
              />
            </div>
            <div>
              <label className="mb-1 block text-xs text-slate-400">{t("certifications.expiresAtLabel")}</label>
              <input
                type="date"
                value={shared.expiresAt}
                onChange={(e) => setSharedField("expiresAt", e.target.value)}
                className={inputCls}
              />
            </div>
            <div>
              <label className="mb-1 block text-xs text-slate-400">{t("certifications.credentialUrlLabel")}</label>
              <input
                type="url"
                value={shared.credentialUrl}
                onChange={(e) => setSharedField("credentialUrl", e.target.value)}
                className={inputCls}
                placeholder="https://…"
                maxLength={500}
              />
            </div>
            <div className="sm:col-span-2">
              <label className="mb-1 block text-xs text-slate-400">{t("certifications.logoUrlLabel")}</label>
              <input
                type="url"
                value={shared.logoUrl}
                onChange={(e) => setSharedField("logoUrl", e.target.value)}
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
              {saving ? t("editor.saving") : t("common.save")}
            </button>
            <button
              onClick={closeForm}
              className="rounded-lg border border-slate-700 px-4 py-2 text-sm text-slate-400 hover:text-slate-200 transition-colors"
            >
              {t("common.cancel")}
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
              <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-slate-500">{t("certifications.colCertification")}</th>
              <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-slate-500">{t("certifications.colIssuer")}</th>
              <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-slate-500">{t("certifications.colIssued")}</th>
              <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-slate-500">{t("certifications.colExpires")}</th>
              <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-slate-500">{t("certifications.colTranslations")}</th>
              <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-slate-500">{t("common.actions")}</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <SkeletonTableRows cols={7} rows={4} />
            ) : certs.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-12 text-center text-slate-500">
                  {t("certifications.noCerts", { button: t("certifications.newCert") })}
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
                            {t("certifications.viewCredential")}
                          </a>
                        )}
                      </div>
                    </div>
                  </td>

                  <td className="px-4 py-4 text-slate-400">{c.issuer}</td>

                  <td className="px-4 py-4 text-slate-400 whitespace-nowrap">{fmtDate(c.issuedAt)}</td>

                  <td className="px-4 py-4 whitespace-nowrap">
                    {c.expiresAt ? (
                      <span className={isExpired(c.expiresAt) ? "text-red-400" : "text-slate-400"}>
                        {isExpired(c.expiresAt) ? `${t("certifications.expired")} ` : ""}{fmtDate(c.expiresAt)}
                      </span>
                    ) : (
                      <span className="text-emerald-500 text-xs">{t("certifications.noExpiry")}</span>
                    )}
                  </td>

                  {/* Translation count */}
                  <td className="px-4 py-4">
                    <span className="rounded-full bg-slate-800 px-2 py-0.5 text-xs text-slate-400">
                      {c.translationCount ?? c.translations?.length ?? 0} lang
                    </span>
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
                        {t("common.edit")}
                      </button>
                      <button
                        onClick={() => void handleDelete(c)}
                        className="text-red-500 hover:text-red-400 transition-colors"
                      >
                        {t("common.delete")}
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
