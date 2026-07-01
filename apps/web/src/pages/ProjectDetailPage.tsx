import React, { useEffect, useRef, useState } from "react"
import { useParams, Link, useNavigate } from "react-router-dom"
import { useTranslation } from "react-i18next"
const { startTransition } = React
import { projectsApi, resolveMediaUrl } from "../lib/api.js"
import type { Project } from "../types/index.js"
import { Layout } from "../components/common/Layout.js"
import { trackPageView, trackEvent } from "../lib/analytics.js"
import { PostRenderer } from "../components/editor/PostRenderer.js"

const KNOWN_FLAGS: Record<string, string> = {
  en: "🇬🇧",
  "en-us": "🇺🇸",
  "en-gb": "🇬🇧",
  fr: "🇫🇷",
  "fr-ca": "🇨🇦",
  de: "🇩🇪",
  es: "🇪🇸",
  it: "🇮🇹",
  pt: "🇵🇹",
  "pt-br": "🇧🇷",
  nl: "🇳🇱",
  ru: "🇷🇺",
  ja: "🇯🇵",
  ko: "🇰🇷",
  zh: "🇨🇳",
  ar: "🇸🇦",
  tr: "🇹🇷",
}
const getLocaleFlag = (locale: string) => KNOWN_FLAGS[locale.toLowerCase()] ?? "🌐"

const hasContent = (project: Project): boolean =>
  Array.isArray(project.content?.content) &&
  project.content.content.some((n) => n.type !== "paragraph" || (n.content?.length ?? 0) > 0)

const ProjectDetailPage: React.FC = () => {
  const { slug } = useParams<{ slug: string }>()
  const navigate = useNavigate()
  const { t, i18n } = useTranslation()
  const [project, setProject] = useState<Project | null>(null)
  const [loading, setLoading] = useState(true)
  const [showSkeleton, setShowSkeleton] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [langOpen, setLangOpen] = useState(false)
  const langRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!loading) {
      setShowSkeleton(false)
      return
    }
    const id = setTimeout(() => setShowSkeleton(true), 150)
    return () => clearTimeout(id)
  }, [loading])

  useEffect(() => {
    if (!slug) return
    setLoading(true)
    setError(null)
    projectsApi
      .getBySlug(slug, i18n.language)
      .then(({ data }) => setProject(data))
      .catch((err: Error) => setError(err.message))
      .finally(() => setLoading(false))
  }, [slug, i18n.language])

  useEffect(() => {
    if (!langOpen) return
    const handler = (e: MouseEvent) => {
      if (langRef.current && !langRef.current.contains(e.target as Node)) setLangOpen(false)
    }
    document.addEventListener("mousedown", handler)
    return () => document.removeEventListener("mousedown", handler)
  }, [langOpen])

  // Track page view once the project is resolved (so we can attach the projectId).
  useEffect(() => {
    if (!project) return
    trackPageView(window.location.pathname, { projectId: project.id })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [project?.id])

  useEffect(() => {
    if (!project) return
    const prev = document.title
    document.title = project.metaTitle ?? project.title

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

    const desc = project.metaDescription ?? project.summary ?? ""
    const descEl = desc ? setMeta("description", desc) : null

    return () => {
      document.title = prev
      descEl?.remove()
    }
  }, [project])

  return (
    <Layout>
      {!project && showSkeleton && (
        <div className="mx-auto max-w-3xl space-y-6 animate-pulse">
          <div className="h-3.5 w-20 rounded bg-slate-800" />
          <div className="h-9 w-3/4 rounded bg-slate-800" />
          <div className="h-56 w-full rounded-xl bg-slate-800" />
          <div className="space-y-3">
            {Array.from({ length: 6 }).map((_, i) => (
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
          <p className="font-medium">{t("projects.notFound")}</p>
          <p className="mt-1 text-sm">{error}</p>
          <Link
            to="/projects"
            className="mt-3 inline-block text-sm text-brand-400 hover:underline"
          >
            ← {t("projects.backToProjects")}
          </Link>
        </div>
      )}

      {project && (
        <article
          key={project.slug}
          className={`mx-auto max-w-3xl admin-page-enter transition-opacity duration-200 ${
            loading ? "opacity-50 pointer-events-none" : "opacity-100"
          }`}
        >
          <header className="mb-8">
            <Link
              to="/projects"
              onClick={(e) => {
                e.preventDefault()
                startTransition(() => navigate("/projects"))
              }}
              className="mb-6 inline-flex items-center gap-1.5 text-sm text-slate-500
                         hover:text-slate-300 transition-colors"
            >
              ← {t("projects.backToProjects")}
            </Link>

            <div className="flex items-start justify-between gap-4">
              <h1 className="text-4xl font-bold leading-tight text-slate-50">
                {project.featured && <span className="mr-2 text-amber-400">★</span>}
                {project.title}
              </h1>

              {(project.hreflang?.length ?? 0) > 1 && (
                <div ref={langRef} className="relative shrink-0">
                  <button
                    onClick={() => setLangOpen((o) => !o)}
                    className={[
                      "flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium transition-colors",
                      langOpen
                        ? "border-brand-500 bg-brand-900/30 text-brand-300"
                        : "border-slate-700 bg-slate-800/60 text-slate-400 hover:border-slate-500 hover:text-slate-200",
                    ].join(" ")}
                  >
                    <span>{getLocaleFlag(project.locale)}</span>
                    <span className="font-mono">{project.locale.toUpperCase()}</span>
                  </button>
                  {langOpen && (
                    <div className="absolute right-0 top-full z-30 mt-1.5 min-w-[130px] rounded-xl border border-slate-700 bg-slate-900 shadow-xl">
                      {project.hreflang?.map(({ locale, slug: localeSlug }) => {
                        const isActive = locale === project.locale
                        return (
                          <button
                            key={locale}
                            onClick={() => {
                              setLangOpen(false)
                              if (!isActive)
                                startTransition(() => navigate(`/projects/${localeSlug}`))
                            }}
                            className={[
                              "flex w-full items-center gap-2.5 px-3 py-2 text-sm transition-colors",
                              isActive
                                ? "text-brand-300 bg-brand-900/20 cursor-default"
                                : "text-slate-300 hover:bg-slate-800",
                            ].join(" ")}
                          >
                            <span className="text-base leading-none">{getLocaleFlag(locale)}</span>
                            <span className="font-mono text-xs font-bold">
                              {locale.toUpperCase()}
                            </span>
                            {isActive && <span className="ml-auto text-[9px] text-brand-500">✓</span>}
                          </button>
                        )
                      })}
                    </div>
                  )}
                </div>
              )}
            </div>

            {project.summary && (
              <p className="mt-4 text-lg text-slate-400 leading-relaxed">{project.summary}</p>
            )}

            {project.techStack.length > 0 && (
              <div className="mt-4 flex flex-wrap gap-2">
                {project.techStack.map((tech) => (
                  <span
                    key={tech}
                    className="rounded-full bg-slate-800 px-2.5 py-0.5 text-xs font-medium text-slate-400"
                  >
                    {tech}
                  </span>
                ))}
              </div>
            )}

            <div className="mt-5 flex flex-wrap items-center gap-3 text-sm">
              {project.liveUrl && (
                <a
                  href={project.liveUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={() => trackEvent("outbound_click", { target: project.liveUrl! })}
                  className="rounded-lg bg-brand-600 px-4 py-2 font-semibold text-white hover:bg-brand-700 transition-colors"
                >
                  {t("projects.liveDemo")} ↗
                </a>
              )}
              {project.githubUrl && (
                <a
                  href={project.githubUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={() => trackEvent("outbound_click", { target: project.githubUrl! })}
                  className="rounded-lg border border-slate-700 px-4 py-2 font-medium text-slate-300 hover:border-slate-500 hover:text-white transition-colors"
                >
                  GitHub ↗
                </a>
              )}
              {project.blogUrl &&
                (project.blogUrl.startsWith("/") ? (
                  <Link
                    to={project.blogUrl}
                    className="rounded-lg border border-slate-700 px-4 py-2 font-medium text-slate-300 hover:border-slate-500 hover:text-white transition-colors"
                  >
                    {t("projects.readMore")} →
                  </Link>
                ) : (
                  <a
                    href={project.blogUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={() => trackEvent("outbound_click", { target: project.blogUrl! })}
                    className="rounded-lg border border-slate-700 px-4 py-2 font-medium text-slate-300 hover:border-slate-500 hover:text-white transition-colors"
                  >
                    {t("projects.readMore")} ↗
                  </a>
                ))}
            </div>
          </header>

          {project.coverImage && (
            <img
              src={resolveMediaUrl(project.coverImage)}
              alt={project.title}
              className="mb-8 w-full rounded-xl border border-slate-800 object-cover"
            />
          )}

          {hasContent(project) && (
            <>
              <hr className="mb-8 border-slate-800" />
              <PostRenderer doc={project.content} />
            </>
          )}
        </article>
      )}
    </Layout>
  )
}

export default ProjectDetailPage
