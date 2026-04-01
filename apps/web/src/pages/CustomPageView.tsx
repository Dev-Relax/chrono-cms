import React, { useEffect, useRef, useState } from "react"
import { useParams, Link, useNavigate } from "react-router-dom"
import { pagesApi } from "../lib/api.js"
import type { Page, PageConfig, HeroContent } from "../types/index.js"
import { DEFAULT_PAGE_CONFIG } from "../types/index.js"
import { Layout } from "../components/common/Layout.js"
import { PostRenderer } from "../components/editor/PostRenderer.js"
import { TableOfContents } from "../components/editor/TableOfContents.js"

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
  ru: "🇷🇺",
  uk: "🇺🇦",
  pl: "🇵🇱",
  cs: "🇨🇿",
  sv: "🇸🇪",
  no: "🇳🇴",
  da: "🇩🇰",
  fi: "🇫🇮",
  ja: "🇯🇵",
  ko: "🇰🇷",
  zh: "🇨🇳",
  "zh-tw": "🇹🇼",
  ar: "🇸🇦",
  he: "🇮🇱",
  tr: "🇹🇷",
  hi: "🇮🇳",
  vi: "🇻🇳",
  th: "🇹🇭",
  id: "🇮🇩",
  el: "🇬🇷",
  hu: "🇭🇺",
  bg: "🇧🇬",
  hr: "🇭🇷",
}
const getLocaleFlag = (locale: string) => KNOWN_FLAGS[locale.toLowerCase()] ?? "🌐"

const layoutMaxWidth: Record<string, string> = {
  default: "max-w-3xl",
  wide: "max-w-5xl",
  "full-width": "max-w-none",
}

const HeroSection: React.FC<{
  title: string
  hero: HeroContent
  cfg: PageConfig
}> = ({ title, hero, cfg }) => {
  if (!cfg.showHero) return null

  return (
    <div
      className="relative w-full py-20 px-6"
      style={{
        background: hero.image
          ? `linear-gradient(rgba(2,6,23,0.6), rgba(2,6,23,0.85)), url(${hero.image}) center/cover no-repeat`
          : "linear-gradient(135deg, rgb(var(--color-primary-rgb) / 0.3), rgb(var(--color-surface-rgb) / 0.95))",
      }}
    >
      <div className={`mx-auto ${layoutMaxWidth[cfg.layout ?? "default"]}`}>
        <h1 className="text-4xl sm:text-5xl font-bold text-white leading-tight">{title}</h1>
        {hero.subtitle && <p className="mt-4 text-lg text-slate-300 max-w-2xl">{hero.subtitle}</p>}
        {hero.ctaText && (
          <a
            href={hero.ctaUrl ?? "#"}
            className="mt-6 inline-block rounded-lg px-6 py-3 text-sm font-semibold text-white transition-opacity hover:opacity-90"
            style={{ backgroundColor: "var(--color-primary)" }}
          >
            {hero.ctaText}
          </a>
        )}
      </div>
    </div>
  )
}

const LangSwitcher: React.FC<{
  page: Page
  onNavigate: (slug: string) => void
}> = ({ page, onNavigate }) => {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener("mousedown", handler)
    return () => document.removeEventListener("mousedown", handler)
  }, [open])

  if ((page.hreflang?.length ?? 0) <= 1) return null

  return (
    <div ref={ref} className="relative shrink-0">
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-1.5 rounded-full border border-slate-700 bg-slate-900
                   px-3 py-1.5 text-sm font-medium text-slate-300 hover:border-slate-500
                   hover:text-white transition-colors"
      >
        <span className="text-base leading-none">{getLocaleFlag(page.locale)}</span>
        <span className="font-mono text-xs">{page.locale.toUpperCase()}</span>
        <span
          className="flex h-4 w-4 items-center justify-center rounded-full
                         bg-brand-600/80 text-[9px] font-bold text-white"
        >
          {page.hreflang?.length}
        </span>
      </button>
      {open && (
        <div
          className="absolute right-0 top-full z-30 mt-2 min-w-[140px]
                        rounded-xl border border-slate-700 bg-slate-900 p-1.5 shadow-2xl"
        >
          {page.hreflang?.map(({ locale, slug: localeSlug }) => {
            const isActive = locale === page.locale
            return (
              <button
                key={locale}
                onClick={() => {
                  setOpen(false)
                  if (!isActive) onNavigate(localeSlug)
                }}
                className={[
                  "flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm transition-colors",
                  isActive
                    ? "bg-brand-600/20 text-brand-300 cursor-default"
                    : "text-slate-400 hover:bg-slate-800 hover:text-white",
                ].join(" ")}
              >
                <span className="text-base leading-none">{getLocaleFlag(locale)}</span>
                <span className="font-mono text-xs font-semibold">{locale.toUpperCase()}</span>
                {isActive && <span className="ml-auto text-[10px] text-brand-500">✓</span>}
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}

const CustomPageView: React.FC = () => {
  const { slug } = useParams<{ slug: string }>()
  const navigate = useNavigate()

  const [page, setPage] = useState<Page | null>(null)
  const [loading, setLoading] = useState(true)
  const [showSkeleton, setShowSkeleton] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!loading) {
      setShowSkeleton(false)
      return
    }
    const t = setTimeout(() => setShowSkeleton(true), 150)
    return () => clearTimeout(t)
  }, [loading])

  useEffect(() => {
    if (!slug) return
    setLoading(true)
    setError(null)
    // Don't clear `page` — keep previous content visible while the next one loads.
    pagesApi
      .getBySlug(slug)
      .then(({ data }) => setPage(data))
      .catch((err: Error) => setError(err.message))
      .finally(() => setLoading(false))
  }, [slug])

  useEffect(() => {
    if (!page) return
    const prev = document.title
    document.title = page.metaTitle ?? page.title

    const setMeta = (name: string, content: string) => {
      let el = document.querySelector<HTMLMetaElement>(`meta[name="${name}"]`)
      if (!el) {
        el = document.createElement("meta")
        el.name = name
        document.head.appendChild(el)
      }
      el.content = content
      return el
    }
    const setOg = (property: string, content: string) => {
      let el = document.querySelector<HTMLMetaElement>(`meta[property="${property}"]`)
      if (!el) {
        el = document.createElement("meta")
        el.setAttribute("property", property)
        document.head.appendChild(el)
      }
      el.content = content
      return el
    }

    const desc = page.metaDescription ?? ""
    const descEl = desc ? setMeta("description", desc) : null
    const ogTitle = setOg("og:title", page.metaTitle ?? page.title)
    const ogDesc = desc ? setOg("og:description", desc) : null
    const ogImg = page.ogImage ? setOg("og:image", page.ogImage) : null

    return () => {
      document.title = prev
      descEl?.remove()
      ogTitle.remove()
      ogDesc?.remove()
      ogImg?.remove()
    }
  }, [page])

  const cfg: PageConfig = page?.pageConfig
    ? { ...DEFAULT_PAGE_CONFIG, ...page.pageConfig }
    : DEFAULT_PAGE_CONFIG

  const hero: HeroContent = page?.heroContent ?? {}
  const maxW = layoutMaxWidth[cfg.layout] ?? "max-w-3xl"

  return (
    <Layout>
      {!page && showSkeleton && (
        <div className="mx-auto max-w-3xl space-y-6 animate-pulse">
          <div className="h-3.5 w-16 rounded bg-slate-800" />
          <div className="h-10 w-1/2 rounded bg-slate-800" />
          <div className="space-y-3">
            {Array.from({ length: 8 }).map((_, i) => (
              <div
                key={i}
                className={`h-4 rounded bg-slate-800 ${i % 3 === 2 ? "w-2/3" : "w-full"}`}
              />
            ))}
          </div>
        </div>
      )}

      {error && (
        <div className="rounded-lg bg-red-900/30 border border-red-800 px-4 py-3 text-red-400">
          <p className="font-medium">Page not found</p>
          <p className="mt-1 text-sm">{error}</p>
          <Link
            to="/"
            onClick={(e) => {
              e.preventDefault()
              React.startTransition(() => navigate("/"))
            }}
            className="mt-3 inline-block text-sm text-brand-400 hover:underline"
          >
            ← Back to blog
          </Link>
        </div>
      )}

      {page && (
        // For full-width pages we break out of the Layout's max-w-5xl container
        // by using negative margins; for others we simply apply the chosen width.
        <div
          key={page.slug}
          className={`admin-page-enter transition-opacity duration-200 ${
            loading ? "opacity-50 pointer-events-none" : "opacity-100"
          } ${cfg.layout === "full-width" ? "-mx-4" : ""}`}
        >
          <HeroSection title={page.title} hero={hero} cfg={cfg} />

          <div className={`mx-auto px-4 py-8 ${maxW}`}>
            <div className="mb-6 flex items-center justify-between gap-4">
              <Link
                to="/"
                onClick={(e) => {
                  e.preventDefault()
                  React.startTransition(() => navigate("/"))
                }}
                className="text-sm text-slate-500 hover:text-slate-300 transition-colors"
              >
                ← Home
              </Link>
              <LangSwitcher
                page={page}
                onNavigate={(s) => React.startTransition(() => navigate(`/${s}`))}
              />
            </div>

            {!cfg.showHero && (
              <h1 className="mb-8 text-4xl font-bold leading-tight text-slate-50">{page.title}</h1>
            )}

            {cfg.showToc && cfg.layout !== "full-width" && (
              <TableOfContents doc={page.content} className="mb-8" />
            )}

            {cfg.showToc && cfg.layout === "full-width" ? (
              <div className="flex gap-8 items-start">
                <aside className="hidden lg:block w-56 shrink-0 sticky top-24">
                  <TableOfContents doc={page.content} />
                </aside>
                <div className="flex-1 min-w-0">
                  <PostRenderer doc={page.content} />
                </div>
              </div>
            ) : (
              <PostRenderer doc={page.content} />
            )}
          </div>
        </div>
      )}
    </Layout>
  )
}

export default CustomPageView
