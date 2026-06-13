import React, { useEffect, useState } from "react"
import { Layout } from "../../components/common/Layout.js"
import { useTheme } from "../../context/ThemeContext.js"
import type { BrandConfig, SocialLink, SocialPlatform } from "../../types/index.js"

const Field: React.FC<{
  label: string
  hint?: string
  children: React.ReactNode
}> = ({ label, hint, children }) => (
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

const BrandingPage: React.FC = () => {
  const { savedBrand, draftBrand, setDraftBrand, saveBrand, isSaving, isBrandDirty } = useTheme()

  const [saved, setSaved] = useState(false)
  const [newPlatform, setNewPlatform] = useState<SocialPlatform>("github")
  const [newUrl, setNewUrl] = useState("")

  useEffect(() => {
    setDraftBrand(savedBrand)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const socialLinks: SocialLink[] = draftBrand.socialLinks ?? []

  const addLink = () => {
    if (!newUrl.trim()) return
    const updated: SocialLink[] = [...socialLinks, { platform: newPlatform, url: newUrl.trim() }]
    setDraftBrand({ ...draftBrand, socialLinks: updated })
    setNewUrl("")
  }

  const removeLink = (index: number) => {
    const updated = socialLinks.filter((_, i) => i !== index)
    setDraftBrand({ ...draftBrand, socialLinks: updated })
  }

  const updateLink = (index: number, field: keyof SocialLink, value: string) => {
    const updated = socialLinks.map((l, i) =>
      i === index ? { ...l, [field]: value } : l,
    )
    setDraftBrand({ ...draftBrand, socialLinks: updated })
  }

  const set = <K extends keyof BrandConfig>(key: K, value: BrandConfig[K]) =>
    setDraftBrand({ ...draftBrand, [key]: value })

  const handleSave = async () => {
    await saveBrand()
    setSaved(true)
    setTimeout(() => setSaved(false), 2500)
  }

  return (
    <Layout admin>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-100">Branding &amp; SEO</h1>
          <p className="mt-1 text-sm text-slate-500">
            Customise your site's identity, logo, and search-engine metadata.
          </p>
        </div>

        <button
          onClick={handleSave}
          disabled={isSaving || !isBrandDirty}
          className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white
                     hover:bg-brand-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {isSaving ? "Saving…" : saved ? "Saved ✓" : "Save changes"}
        </button>
      </div>

      <div className="grid gap-8 lg:grid-cols-2">
        <section className="rounded-xl border border-slate-800 bg-slate-900 p-6 space-y-5">
          <h2 className="text-sm font-semibold uppercase tracking-widest text-slate-500">
            Identity
          </h2>

          <Field label="Site name" hint="Replaces 'Chronos CMS' in headers and the browser tab.">
            <input
              type="text"
              className={inputCls}
              value={draftBrand.siteName}
              onChange={(e) => set("siteName", e.target.value)}
              placeholder="My Awesome Blog"
              maxLength={100}
            />
          </Field>

          <Field
            label="Tagline"
            hint="Short line shown below the blog heading. Leave empty to hide."
          >
            <input
              type="text"
              className={inputCls}
              value={draftBrand.tagline}
              onChange={(e) => set("tagline", e.target.value)}
              placeholder="Thoughts on code, design & life"
              maxLength={200}
            />
          </Field>

          <Field
            label="Logo URL"
            hint="Optional. Paste an image URL to use as a logo instead of the text name. Recommended height: 32 px."
          >
            <input
              type="url"
              className={inputCls}
              value={draftBrand.logoUrl}
              onChange={(e) => set("logoUrl", e.target.value)}
              placeholder="https://example.com/logo.svg"
              maxLength={500}
            />
            {draftBrand.logoUrl && (
              <img
                src={draftBrand.logoUrl}
                alt="Logo preview"
                className="mt-2 h-8 w-auto rounded object-contain bg-slate-800 p-1"
                onError={(e) => {
                  ;(e.target as HTMLImageElement).style.display = "none"
                }}
              />
            )}
          </Field>
        </section>

        <section className="rounded-xl border border-slate-800 bg-slate-900 p-6 space-y-5">
          <h2 className="text-sm font-semibold uppercase tracking-widest text-slate-500">
            SEO &amp; Social
          </h2>

          <Field label="SEO title" hint="Sets the browser <title> for your site (max 100 chars).">
            <input
              type="text"
              className={inputCls}
              value={draftBrand.seoTitle}
              onChange={(e) => set("seoTitle", e.target.value)}
              placeholder="My Blog — code, design & life"
              maxLength={100}
            />
            <p className="mt-1 text-xs text-slate-600">{draftBrand.seoTitle.length} / 100</p>
          </Field>

          <Field
            label="SEO description"
            hint="Global meta description (max 300 chars). Individual posts can override this."
          >
            <textarea
              className={`${inputCls} resize-none`}
              rows={3}
              value={draftBrand.seoDescription}
              onChange={(e) => set("seoDescription", e.target.value)}
              placeholder="A developer-focused blog about software, design, and the open web."
              maxLength={300}
            />
            <p className="mt-1 text-xs text-slate-600">{draftBrand.seoDescription.length} / 300</p>
          </Field>

          <Field
            label="Default Open Graph image"
            hint="Shown when someone shares your homepage on social media. Recommended: 1200×630 px."
          >
            <input
              type="url"
              className={inputCls}
              value={draftBrand.ogImage}
              onChange={(e) => set("ogImage", e.target.value)}
              placeholder="https://example.com/og-image.png"
              maxLength={500}
            />
            {draftBrand.ogImage && (
              <img
                src={draftBrand.ogImage}
                alt="OG image preview"
                className="mt-2 w-full max-w-xs rounded object-cover aspect-video bg-slate-800"
                onError={(e) => {
                  ;(e.target as HTMLImageElement).style.display = "none"
                }}
              />
            )}
          </Field>
        </section>
      </div>

      {/* Social Links */}
      <section className="mt-8 rounded-xl border border-slate-800 bg-slate-900 p-6">
        <h2 className="mb-1 text-sm font-semibold uppercase tracking-widest text-slate-500">
          Social Links
        </h2>
        <p className="mb-5 text-xs text-slate-600">
          Returned via <code className="text-slate-500">GET /settings → brandConfig.socialLinks</code>. Use these in your headless front-end.
        </p>

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
            + Add
          </button>
        </div>
      </section>

      <section className="mt-8 rounded-xl border border-slate-800 bg-slate-900 p-6">
        <h2 className="mb-4 text-sm font-semibold uppercase tracking-widest text-slate-500">
          Browser tab preview
        </h2>
        <div className="inline-flex items-center gap-2 rounded-lg border border-slate-700 bg-slate-950 px-4 py-2 text-sm text-slate-300">
          <span className="h-3 w-3 rounded-full bg-slate-600" />
          <span className="truncate max-w-xs">
            {draftBrand.seoTitle || draftBrand.siteName || "Chronos CMS"}
          </span>
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
