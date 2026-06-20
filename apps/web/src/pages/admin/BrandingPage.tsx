import React, { useEffect, useRef, useState } from "react"
import { useTranslation } from "react-i18next"
import { Layout } from "../../components/common/Layout.js"
import { useTheme } from "../../context/ThemeContext.js"
import type { BrandConfig, BrandLocale, SocialLink, SocialPlatform } from "../../types/index.js"

const KNOWN_FLAGS: Record<string, string> = {
  en: "🇬🇧", "en-us": "🇺🇸", fr: "🇫🇷", de: "🇩🇪", es: "🇪🇸",
  it: "🇮🇹", pt: "🇵🇹", nl: "🇳🇱", ru: "🇷🇺", ja: "🇯🇵",
  ko: "🇰🇷", zh: "🇨🇳", ar: "🇸🇦", pl: "🇵🇱", tr: "🇹🇷",
}
const getLocaleFlag = (locale: string) => KNOWN_FLAGS[locale.toLowerCase()] ?? "🌐"
const COMMON_LOCALES = ["fr", "es", "de", "it", "pt", "nl", "ru", "ja", "ko", "zh", "ar", "pl", "tr"]

const DEFAULT_TAB = "__default__"

const Field: React.FC<{ label: string; hint?: string; children: React.ReactNode }> = ({
  label,
  hint,
  children,
}) => (
  <div>
    <label className="block mb-1 text-sm font-medium text-slate-300">{label}</label>
    {hint && <p className="mb-1.5 text-xs text-slate-500">{hint}</p>}
    {children}
  </div>
)

const inputCls =
  "w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-slate-100 " +
  "placeholder-slate-500 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"

const PLATFORM_LABELS: Record<SocialPlatform, string> = {
  github: "GitHub",
  linkedin: "LinkedIn",
  twitter: "Twitter / X",
  bluesky: "Bluesky",
  mastodon: "Mastodon",
  instagram: "Instagram",
  youtube: "YouTube",
  twitch: "Twitch",
  devto: "Dev.to",
  dribbble: "Dribbble",
  codepen: "CodePen",
  stackoverflow: "Stack Overflow",
  discord: "Discord",
  rss: "RSS",
}

const PLATFORMS = Object.keys(PLATFORM_LABELS) as SocialPlatform[]

type TranslatableKey = keyof BrandLocale

const getLocaleValues = (brand: BrandConfig, locale: string): Required<BrandLocale> => {
  if (locale === DEFAULT_TAB) {
    return {
      siteName: brand.siteName,
      tagline: brand.tagline,
      seoTitle: brand.seoTitle,
      seoDescription: brand.seoDescription,
    }
  }
  return {
    siteName: brand.locales?.[locale]?.siteName ?? "",
    tagline: brand.locales?.[locale]?.tagline ?? "",
    seoTitle: brand.locales?.[locale]?.seoTitle ?? "",
    seoDescription: brand.locales?.[locale]?.seoDescription ?? "",
  }
}

const applyLocaleField = (
  brand: BrandConfig,
  locale: string,
  key: TranslatableKey,
  value: string,
): BrandConfig => {
  if (locale === DEFAULT_TAB) {
    return { ...brand, [key]: value }
  }
  return {
    ...brand,
    locales: {
      ...brand.locales,
      [locale]: { ...brand.locales?.[locale], [key]: value },
    },
  }
}

const BrandingPage: React.FC = () => {
  const { t } = useTranslation()
  const { savedBrand, draftBrand, setDraftBrand, saveBrand, isSaving, isBrandDirty } = useTheme()

  const [saved, setSaved] = useState(false)
  const [activeLocale, setActiveLocale] = useState(DEFAULT_TAB)
  const [addingLocale, setAddingLocale] = useState(false)
  const [newLocaleInput, setNewLocaleInput] = useState("")
  const [newPlatform, setNewPlatform] = useState<SocialPlatform>("github")
  const [newUrl, setNewUrl] = useState("")
  const addLocaleRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    setDraftBrand(savedBrand)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    if (addingLocale) addLocaleRef.current?.focus()
  }, [addingLocale])

  const localeKeys = Object.keys(draftBrand.locales ?? {})

  const current = getLocaleValues(draftBrand, activeLocale)

  const set = (key: TranslatableKey, value: string) =>
    setDraftBrand(applyLocaleField(draftBrand, activeLocale, key, value))

  const setShared = <K extends "logoUrl" | "siteUrl" | "ogImage">(key: K, value: string) =>
    setDraftBrand({ ...draftBrand, [key]: value })

  const commitAddLocale = (code: string) => {
    const normalized = code.trim().toLowerCase().slice(0, 10)
    if (!normalized || normalized === DEFAULT_TAB || (draftBrand.locales ?? {})[normalized]) {
      setAddingLocale(false)
      setNewLocaleInput("")
      return
    }
    setDraftBrand({
      ...draftBrand,
      locales: { ...draftBrand.locales, [normalized]: {} },
    })
    setActiveLocale(normalized)
    setAddingLocale(false)
    setNewLocaleInput("")
  }

  const removeLocale = (locale: string) => {
    const next = { ...draftBrand.locales }
    delete next[locale]
    setDraftBrand({ ...draftBrand, locales: next })
    if (activeLocale === locale) setActiveLocale(DEFAULT_TAB)
  }

  const socialLinks: SocialLink[] = draftBrand.socialLinks ?? []

  const addLink = () => {
    if (!newUrl.trim()) return
    setDraftBrand({ ...draftBrand, socialLinks: [...socialLinks, { platform: newPlatform, url: newUrl.trim() }] })
    setNewUrl("")
  }

  const removeLink = (index: number) =>
    setDraftBrand({ ...draftBrand, socialLinks: socialLinks.filter((_, i) => i !== index) })

  const updateLink = (index: number, field: keyof SocialLink, value: string) =>
    setDraftBrand({
      ...draftBrand,
      socialLinks: socialLinks.map((l, i) => (i === index ? { ...l, [field]: value } : l)),
    })

  const handleSave = async () => {
    await saveBrand()
    setSaved(true)
    setTimeout(() => setSaved(false), 2500)
  }

  const previewTitle =
    activeLocale === DEFAULT_TAB
      ? (draftBrand.seoTitle || draftBrand.siteName || "Chronos CMS")
      : (current.seoTitle || current.siteName || draftBrand.seoTitle || draftBrand.siteName || "Chronos CMS")

  return (
    <Layout admin>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-100">{t("branding.title")}</h1>
          <p className="mt-1 text-sm text-slate-500">{t("branding.subtitle")}</p>
        </div>
        <button
          onClick={() => void handleSave()}
          disabled={isSaving || !isBrandDirty}
          className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white
                     hover:bg-brand-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {isSaving ? t("branding.saving") : saved ? t("branding.saved") : t("branding.saveChanges")}
        </button>
      </div>

      {/* Locale tabs */}
      <div className="mb-6 rounded-xl border border-slate-800 bg-slate-900 overflow-hidden">
        <div className="flex items-center gap-0.5 border-b border-slate-800 px-4 pt-3 overflow-x-auto">
          {/* Default tab */}
          <button
            onClick={() => setActiveLocale(DEFAULT_TAB)}
            className={[
              "flex items-center gap-1.5 rounded-t-lg px-3 py-2 text-xs font-medium whitespace-nowrap transition-colors",
              activeLocale === DEFAULT_TAB
                ? "border border-b-0 border-slate-700 bg-slate-950 text-slate-100"
                : "text-slate-500 hover:text-slate-300",
            ].join(" ")}
          >
            🌐 {t("branding.defaultLocale")}
          </button>

          {/* Per-locale tabs */}
          {localeKeys.map((locale) => {
            const vals = draftBrand.locales?.[locale] ?? {}
            const hasContent = Object.values(vals).some((v) => v?.trim())
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
                {!hasContent && (
                  <span className="h-1.5 w-1.5 rounded-full bg-amber-500" title="No content yet" />
                )}
                <span
                  onClick={(e) => { e.stopPropagation(); removeLocale(locale) }}
                  className="ml-0.5 cursor-pointer text-slate-600 hover:text-red-400"
                >
                  ✕
                </span>
              </button>
            )
          })}

          {/* Add locale */}
          {!addingLocale ? (
            <button
              onClick={() => setAddingLocale(true)}
              className="ml-1 rounded px-2 py-1 text-xs text-slate-600 hover:text-slate-300 transition-colors"
            >
              {t("branding.addLocale")}
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
                list="common-locales-brand"
                placeholder="fr"
                className="w-16 rounded border border-slate-700 bg-slate-800 px-2 py-1 text-xs text-slate-100 focus:outline-none"
              />
              <datalist id="common-locales-brand">
                {COMMON_LOCALES.filter((l) => !(draftBrand.locales ?? {})[l]).map((l) => (
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

        {/* Per-locale hint for non-default tabs */}
        {activeLocale !== DEFAULT_TAB && (
          <p className="px-4 pt-2 pb-0 text-xs text-slate-600">{t("branding.localeFallback")}</p>
        )}

        {/* Translatable fields */}
        <div className="p-6 grid gap-6 lg:grid-cols-2">
          <section className="space-y-5">
            <h2 className="text-sm font-semibold uppercase tracking-widest text-slate-500">
              {t("branding.identitySection")}
            </h2>

            <Field label={t("branding.siteNameLabel")} hint={activeLocale === DEFAULT_TAB ? t("branding.siteNameHint") : undefined}>
              <input
                type="text"
                className={inputCls}
                value={current.siteName}
                onChange={(e) => set("siteName", e.target.value)}
                placeholder={activeLocale === DEFAULT_TAB ? "My Awesome Blog" : draftBrand.siteName}
                maxLength={100}
              />
            </Field>

            <Field label={t("branding.taglineLabel")} hint={activeLocale === DEFAULT_TAB ? t("branding.taglineHint") : undefined}>
              <input
                type="text"
                className={inputCls}
                value={current.tagline}
                onChange={(e) => set("tagline", e.target.value)}
                placeholder={activeLocale === DEFAULT_TAB ? "Thoughts on code, design & life" : draftBrand.tagline || ""}
                maxLength={200}
              />
            </Field>
          </section>

          <section className="space-y-5">
            <h2 className="text-sm font-semibold uppercase tracking-widest text-slate-500">
              {t("branding.seoSection")}
            </h2>

            <Field label={t("branding.seoTitleLabel")} hint={activeLocale === DEFAULT_TAB ? t("branding.seoTitleHint") : undefined}>
              <input
                type="text"
                className={inputCls}
                value={current.seoTitle}
                onChange={(e) => set("seoTitle", e.target.value)}
                placeholder={activeLocale === DEFAULT_TAB ? "My Blog — code, design & life" : draftBrand.seoTitle}
                maxLength={100}
              />
              <p className="mt-1 text-xs text-slate-600">{current.seoTitle.length} / 100</p>
            </Field>

            <Field label={t("branding.seoDescLabel")} hint={activeLocale === DEFAULT_TAB ? t("branding.seoDescHint") : undefined}>
              <textarea
                className={`${inputCls} resize-none`}
                rows={3}
                value={current.seoDescription}
                onChange={(e) => set("seoDescription", e.target.value)}
                placeholder={
                  activeLocale === DEFAULT_TAB
                    ? "A developer-focused blog about software, design, and the open web."
                    : draftBrand.seoDescription || ""
                }
                maxLength={300}
              />
              <p className="mt-1 text-xs text-slate-600">{current.seoDescription.length} / 300</p>
            </Field>
          </section>
        </div>
      </div>

      {/* Shared (locale-agnostic) fields */}
      <div className="grid gap-8 lg:grid-cols-2">
        <section className="rounded-xl border border-slate-800 bg-slate-900 p-6 space-y-5">
          <h2 className="text-sm font-semibold uppercase tracking-widest text-slate-500">
            {t("branding.sharedSection")}
          </h2>

          <Field label={t("branding.logoUrlLabel")} hint={t("branding.logoUrlHint")}>
            <input
              type="url"
              className={inputCls}
              value={draftBrand.logoUrl}
              onChange={(e) => setShared("logoUrl", e.target.value)}
              placeholder="https://example.com/logo.svg"
              maxLength={500}
            />
            {draftBrand.logoUrl && (
              <img
                src={draftBrand.logoUrl}
                alt="Logo preview"
                className="mt-2 h-8 w-auto rounded object-contain bg-slate-800 p-1"
                onError={(e) => { ;(e.target as HTMLImageElement).style.display = "none" }}
              />
            )}
          </Field>

          <Field label={t("branding.siteUrlLabel")} hint={t("branding.siteUrlHint")}>
            <input
              type="url"
              className={inputCls}
              value={draftBrand.siteUrl ?? ""}
              onChange={(e) => setShared("siteUrl", e.target.value)}
              placeholder="https://example.com"
              maxLength={500}
            />
          </Field>
        </section>

        <section className="rounded-xl border border-slate-800 bg-slate-900 p-6 space-y-5">
          <h2 className="text-sm font-semibold uppercase tracking-widest text-slate-500">OG Image</h2>

          <Field label={t("branding.ogImageLabel")} hint={t("branding.ogImageHint")}>
            <input
              type="url"
              className={inputCls}
              value={draftBrand.ogImage}
              onChange={(e) => setShared("ogImage", e.target.value)}
              placeholder="https://example.com/og-image.png"
              maxLength={500}
            />
            {draftBrand.ogImage && (
              <img
                src={draftBrand.ogImage}
                alt="OG image preview"
                className="mt-2 w-full max-w-xs rounded object-cover aspect-video bg-slate-800"
                onError={(e) => { ;(e.target as HTMLImageElement).style.display = "none" }}
              />
            )}
          </Field>
        </section>
      </div>

      {/* Social Links */}
      <section className="mt-8 rounded-xl border border-slate-800 bg-slate-900 p-6">
        <h2 className="mb-1 text-sm font-semibold uppercase tracking-widest text-slate-500">
          {t("branding.socialSection")}
        </h2>
        <p className="mb-5 text-xs text-slate-600">{t("branding.socialHint")}</p>

        {socialLinks.length > 0 && (
          <ul className="mb-4 space-y-2">
            {socialLinks.map((link, i) => (
              <li key={i} className="flex items-center gap-2">
                <select
                  value={link.platform}
                  onChange={(e) => updateLink(i, "platform", e.target.value)}
                  className="rounded-lg border border-slate-700 bg-slate-800 px-2 py-1.5 text-sm text-slate-100 focus:border-brand-500 focus:outline-none"
                >
                  {PLATFORMS.map((p) => (
                    <option key={p} value={p}>{PLATFORM_LABELS[p]}</option>
                  ))}
                </select>
                <input
                  type="url"
                  value={link.url}
                  onChange={(e) => updateLink(i, "url", e.target.value)}
                  className={`${inputCls} flex-1`}
                  placeholder="https://…"
                />
                <button
                  onClick={() => removeLink(i)}
                  className="shrink-0 rounded-lg border border-slate-700 px-2 py-1.5 text-xs text-red-500 hover:border-red-700 hover:bg-red-950 transition-colors"
                >
                  ✕
                </button>
              </li>
            ))}
          </ul>
        )}

        <div className="flex items-center gap-2">
          <select
            value={newPlatform}
            onChange={(e) => setNewPlatform(e.target.value as SocialPlatform)}
            className="rounded-lg border border-slate-700 bg-slate-800 px-2 py-1.5 text-sm text-slate-100 focus:border-brand-500 focus:outline-none"
          >
            {PLATFORMS.map((p) => (
              <option key={p} value={p}>{PLATFORM_LABELS[p]}</option>
            ))}
          </select>
          <input
            type="url"
            value={newUrl}
            onChange={(e) => setNewUrl(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && addLink()}
            className={`${inputCls} flex-1`}
            placeholder="https://github.com/username"
          />
          <button
            onClick={addLink}
            disabled={!newUrl.trim()}
            className="shrink-0 rounded-lg bg-brand-600 px-3 py-1.5 text-sm font-semibold text-white hover:bg-brand-500 disabled:opacity-40 transition-colors"
          >
            {t("branding.addLink")}
          </button>
        </div>
      </section>

      {/* Browser tab preview */}
      <section className="mt-8 rounded-xl border border-slate-800 bg-slate-900 p-6">
        <h2 className="mb-4 text-sm font-semibold uppercase tracking-widest text-slate-500">
          {t("branding.browserPreview")}
        </h2>
        <div className="inline-flex items-center gap-2 rounded-lg border border-slate-700 bg-slate-950 px-4 py-2 text-sm text-slate-300">
          <span className="h-3 w-3 rounded-full bg-slate-600" />
          <span className="truncate max-w-xs">{previewTitle}</span>
        </div>
        <p className="mt-3 text-xs text-slate-600">
          Powered by{" "}
          <a
            href="https://github.com/anthropics/chronos-cms"
            target="_blank"
            rel="noopener noreferrer"
            className="text-slate-500 hover:text-slate-400 underline"
          >
            Chronos-CMS
          </a>
        </p>
      </section>
    </Layout>
  )
}

export default BrandingPage
