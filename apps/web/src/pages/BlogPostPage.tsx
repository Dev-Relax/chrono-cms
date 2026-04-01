import React, { useEffect, useRef, useState } from "react"
import { useParams, Link, useNavigate } from "react-router-dom"
const { startTransition } = React
import { postsApi } from "../lib/api.js"
import type { Post } from "../types/index.js"
import { Layout } from "../components/common/Layout.js"
import { PostRenderer } from "../components/editor/PostRenderer.js"
import { CommentSection } from "../components/comments/CommentSection.js"
import { readingTimeLabel } from "../lib/readingTime.js"

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
  ro: "🇷🇴",
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
}
const getLocaleFlag = (locale: string) => KNOWN_FLAGS[locale.toLowerCase()] ?? "🌐"

const BlogPostPage: React.FC = () => {
  const { slug } = useParams<{ slug: string }>()
  const navigate = useNavigate()
  const [post, setPost] = useState<Post | null>(null)
  const [loading, setLoading] = useState(true)
  const [showSkeleton, setShowSkeleton] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [langOpen, setLangOpen] = useState(false)
  const langRef = useRef<HTMLDivElement>(null)

  // Show skeleton only after 150 ms — fast API responses skip it entirely.
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
    // Don't clear `post` — keep previous content visible while the next one loads.
    postsApi
      .getBySlug(slug)
      .then(({ data }) => setPost(data))
      .catch((err: Error) => setError(err.message))
      .finally(() => setLoading(false))
  }, [slug])

  useEffect(() => {
    if (!langOpen) return
    const handler = (e: MouseEvent) => {
      if (langRef.current && !langRef.current.contains(e.target as Node)) {
        setLangOpen(false)
      }
    }
    document.addEventListener("mousedown", handler)
    return () => document.removeEventListener("mousedown", handler)
  }, [langOpen])

  useEffect(() => {
    if (!post) return
    const prev = document.title
    document.title = post.metaTitle ?? post.title

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

    const desc = post.metaDescription ?? post.excerpt ?? ""
    const descEl = desc ? setMeta("description", desc) : null
    const ogTitle = setOg("og:title", post.metaTitle ?? post.title)
    const ogDesc = desc ? setOg("og:description", desc) : null
    const ogImg = post.ogImage ? setOg("og:image", post.ogImage) : null

    return () => {
      document.title = prev
      descEl?.remove()
      ogTitle.remove()
      ogDesc?.remove()
      ogImg?.remove()
    }
  }, [post])

  return (
    <Layout>
      {!post && showSkeleton && (
        <div className="mx-auto max-w-3xl space-y-6 animate-pulse">
          <div className="h-3.5 w-16 rounded bg-slate-800" />
          <div className="space-y-3">
            <div className="h-9 w-3/4 rounded bg-slate-800" />
            <div className="flex gap-3">
              <div className="h-3.5 w-24 rounded bg-slate-800" />
              <div className="h-3.5 w-32 rounded bg-slate-800" />
              <div className="h-3.5 w-20 rounded bg-slate-800" />
            </div>
          </div>
          <div className="h-px bg-slate-800" />
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
          <p className="font-medium">Post not found</p>
          <p className="mt-1 text-sm">{error}</p>
          <Link to="/" className="mt-3 inline-block text-sm text-brand-400 hover:underline">
            ← Back to blog
          </Link>
        </div>
      )}

      {post && (
        <article
          key={post.slug}
          className={`mx-auto max-w-3xl admin-page-enter transition-opacity duration-200 ${
            loading ? "opacity-50 pointer-events-none" : "opacity-100"
          }`}
        >
          <header className="mb-10">
            <Link
              to="/"
              onClick={(e) => {
                e.preventDefault()
                startTransition(() => navigate("/"))
              }}
              className="mb-6 inline-flex items-center gap-1.5 text-sm text-slate-500
                         hover:text-slate-300 transition-colors"
            >
              ← All posts
            </Link>

            <h1 className="text-4xl font-bold leading-tight text-slate-50">{post.title}</h1>

            <div className="mt-4 flex flex-wrap items-center gap-3 text-sm text-slate-500">
              <span>{post.author.name ?? post.author.email}</span>
              <span>·</span>
              <time dateTime={post.publishedAt ?? post.createdAt}>
                {new Date(post.publishedAt ?? post.createdAt).toLocaleDateString("en-US", {
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                })}
              </time>
              <span>·</span>
              <span>{readingTimeLabel(post.content)}</span>

              {post.tags.length > 0 && (
                <>
                  <span>·</span>
                  <div className="flex flex-wrap gap-1.5">
                    {post.tags.map(({ tag }) => (
                      <span
                        key={tag.id}
                        className="rounded-full bg-slate-800 px-2.5 py-0.5 text-xs text-slate-400"
                      >
                        {tag.name}
                      </span>
                    ))}
                  </div>
                </>
              )}

              {(post.hreflang?.length ?? 0) > 1 && (
                <>
                  <span>·</span>
                  <div ref={langRef} className="relative">
                    <button
                      onClick={() => setLangOpen((o) => !o)}
                      className={[
                        "flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs",
                        "font-medium transition-colors",
                        langOpen
                          ? "border-brand-500 bg-brand-900/30 text-brand-300"
                          : "border-slate-700 bg-slate-800/60 text-slate-400 hover:border-slate-500 hover:text-slate-200",
                      ].join(" ")}
                    >
                      <span>{getLocaleFlag(post.locale)}</span>
                      <span className="font-mono">{post.locale.toUpperCase()}</span>
                      <span
                        className="flex h-4 w-4 items-center justify-center rounded-full
                                       bg-brand-600/80 text-[9px] font-bold text-white"
                      >
                        {post.hreflang?.length}
                      </span>
                    </button>

                    {langOpen && (
                      <div
                        className="absolute left-0 top-full z-30 mt-1.5 min-w-[130px]
                                      rounded-xl border border-slate-700 bg-slate-900 shadow-xl"
                      >
                        <p
                          className="px-3 pt-2.5 pb-1 text-[9px] font-semibold uppercase
                                      tracking-widest text-slate-600"
                        >
                          Available languages
                        </p>
                        {post.hreflang?.map(({ locale, slug: localeSlug }) => {
                          const isActive = locale === post.locale
                          return (
                            <button
                              key={locale}
                              onClick={() => {
                                setLangOpen(false)
                                if (!isActive)
                                  startTransition(() => navigate(`/posts/${localeSlug}`))
                              }}
                              className={[
                                "flex w-full items-center gap-2.5 px-3 py-2 text-sm transition-colors",
                                isActive
                                  ? "text-brand-300 bg-brand-900/20 cursor-default"
                                  : "text-slate-300 hover:bg-slate-800",
                              ].join(" ")}
                            >
                              <span className="text-base leading-none">
                                {getLocaleFlag(locale)}
                              </span>
                              <span className="font-mono text-xs font-bold">
                                {locale.toUpperCase()}
                              </span>
                              {isActive && (
                                <span className="ml-auto text-[9px] text-brand-500">✓</span>
                              )}
                            </button>
                          )
                        })}
                        <div className="h-1.5" />
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>

            {post.excerpt && (
              <p className="mt-5 text-lg text-slate-400 leading-relaxed border-l-2 border-brand-500 pl-4">
                {post.excerpt}
              </p>
            )}
          </header>

          <hr className="mb-10 border-slate-800" />

          <PostRenderer doc={post.content} />

          <CommentSection postId={post.id} />
        </article>
      )}
    </Layout>
  )
}

export default BlogPostPage
