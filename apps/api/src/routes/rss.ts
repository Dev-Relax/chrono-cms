// NOTE: Queries use (prisma as any) because the Prisma client types
// reflect the old schema until `prisma generate` is re-run after migration.

import type { FastifyInstance } from "fastify"
import { prisma } from "@chronos/db"

const esc = (s: string): string =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;")

const siteUrl = (origin: string | undefined): string =>
  origin?.replace(/\/$/, "") ??
  (process.env["CORS_ORIGIN"] ?? "http://localhost:5173").split(",")[0]!.trim()

/** BCP-47 tag → RSS <language> value (e.g. "fr" → "fr", "zh-tw" → "zh-tw"). */
const toRssLang = (locale: string) => locale.toLowerCase().replace("_", "-")

type BrandConfig = { siteName?: string; seoDescription?: string }

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const buildRssFeed = async (locale: string | null, base: string): Promise<string> => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = prisma as any

  const [postsRaw, siteSettings] = await Promise.all([
    db.post.findMany({
      where: { status: "PUBLISHED" },
      orderBy: [{ featured: "desc" }, { publishedAt: "desc" }],
      take: 20,
      select: {
        defaultLocale: true,
        publishedAt: true,
        author: { select: { name: true, email: true } },
        tags: { select: { tag: { select: { name: true } } } },
        translations: {
          select: {
            locale: true,
            title: true,
            slug: true,
            excerpt: true,
            metaDescription: true,
          },
        },
      },
    }),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (prisma.siteSettings.findUnique as any)({ where: { id: "singleton" } }),
  ])

  const brand = (siteSettings?.brandConfig ?? {}) as BrandConfig
  const channelTitle = brand.siteName ?? "Chronos CMS Blog"
  const channelDesc = brand.seoDescription ?? `Latest posts from ${channelTitle}`

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const items = (postsRaw as any[])
    .map((p) => {
      // Pick the requested locale, fall back to defaultLocale, then first available
      const tr = locale
        ? // eslint-disable-next-line @typescript-eslint/no-explicit-any
          (p.translations?.find((t: any) => t.locale === locale) ??
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          p.translations?.find((t: any) => t.locale === p.defaultLocale) ??
          p.translations?.[0])
        : // eslint-disable-next-line @typescript-eslint/no-explicit-any
          (p.translations?.find((t: any) => t.locale === p.defaultLocale) ?? p.translations?.[0])

      if (!tr) return ""

      const url = `${base}/posts/${tr.slug}`
      const desc = tr.metaDescription ?? tr.excerpt ?? ""
      const date = (p.publishedAt ?? new Date()).toUTCString()
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const cats = (p.tags ?? [])
        .map(({ tag }: any) => `    <category>${esc(tag.name)}</category>`)
        .join("\n")

      return `  <item>
    <title>${esc(tr.title)}</title>
    <link>${url}</link>
    <guid isPermaLink="true">${url}</guid>
    <description>${esc(desc)}</description>
    <pubDate>${date}</pubDate>
    <author>${esc(p.author.email)} (${esc(p.author.name ?? p.author.email)})</author>
${cats}
  </item>`
    })
    .filter(Boolean)
    .join("\n")

  const feedLocale = locale ?? "en"
  const selfHref = locale ? `${base}/rss/${locale}.xml` : `${base}/rss.xml`

  return `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>${esc(channelTitle)}</title>
    <link>${base}</link>
    <description>${esc(channelDesc)}</description>
    <language>${toRssLang(feedLocale)}</language>
    <lastBuildDate>${new Date().toUTCString()}</lastBuildDate>
    <atom:link href="${selfHref}" rel="self" type="application/rss+xml" />
${items}
  </channel>
</rss>`
}

export const rssRoutes = async (fastify: FastifyInstance): Promise<void> => {
  // Supports ?lang=fr to select a locale. Defaults to each post's defaultLocale.
  fastify.get("/rss.xml", async (request, reply) => {
    const query = request.query as { lang?: string }
    const lang = query.lang?.trim().slice(0, 10) ?? null
    const base = siteUrl(request.headers["origin"] as string | undefined)
    const xml = await buildRssFeed(lang, base)

    return reply
      .header("Content-Type", "application/rss+xml; charset=utf-8")
      .header("Cache-Control", "public, max-age=600")
      .send(xml)
  })

  // Clean per-locale RSS URL, e.g. /rss/fr.xml, /rss/es.xml
  fastify.get("/rss/:lang.xml", async (request, reply) => {
    const { lang } = request.params as { lang: string }
    const base = siteUrl(request.headers["origin"] as string | undefined)
    const xml = await buildRssFeed(lang.trim().slice(0, 10), base)

    return reply
      .header("Content-Type", "application/rss+xml; charset=utf-8")
      .header("Cache-Control", "public, max-age=600")
      .send(xml)
  })

  // Emits one <url> per locale translation (posts + pages + projects).
  fastify.get("/sitemap.xml", async (request, reply) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const db = prisma as any

    const [postsRaw, pagesRaw, projectsRaw, siteSettings] = await Promise.all([
      db.post.findMany({
        where: { status: "PUBLISHED" },
        orderBy: { publishedAt: "desc" },
        select: { updatedAt: true, translations: { select: { locale: true, slug: true } } },
      }),
      db.page.findMany({
        where: { status: "PUBLISHED" },
        orderBy: { updatedAt: "desc" },
        select: { updatedAt: true, translations: { select: { locale: true, slug: true } } },
      }),
      db.project.findMany({
        where: { status: "PUBLISHED" },
        orderBy: { order: "asc" },
        select: { updatedAt: true, translations: { select: { locale: true, slug: true } } },
      }),
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (prisma.siteSettings.findUnique as any)({ where: { id: "singleton" } }),
    ])

    const brand = (siteSettings?.brandConfig ?? {}) as Record<string, unknown>
    const configuredUrl = typeof brand["siteUrl"] === "string" ? brand["siteUrl"].replace(/\/$/, "") : ""
    const base = configuredUrl || siteUrl(request.headers["origin"] as string | undefined)

    const u = (loc: string, lastmod: string, freq: string, priority: string) =>
      `  <url>\n    <loc>${loc}</loc>\n    <lastmod>${lastmod}</lastmod>\n    <changefreq>${freq}</changefreq>\n    <priority>${priority}</priority>\n  </url>`

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const postUrls = (postsRaw as any[]).flatMap((p) =>
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (p.translations ?? []).map((t: any) =>
        u(`${base}/posts/${t.slug}`, (p.updatedAt as Date).toISOString().split("T")[0]!, "weekly", "0.8"),
      ),
    )

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const projectUrls = (projectsRaw as any[]).flatMap((p) =>
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (p.translations ?? []).map((t: any) =>
        u(`${base}/projects/${t.slug}`, (p.updatedAt as Date).toISOString().split("T")[0]!, "weekly", "0.7"),
      ),
    )

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const pageUrls = (pagesRaw as any[]).flatMap((p) =>
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (p.translations ?? []).map((t: any) =>
        u(`${base}/${t.slug}`, (p.updatedAt as Date).toISOString().split("T")[0]!, "monthly", "0.6"),
      ),
    )

    const urls = [
      u(`${base}/`, new Date().toISOString().split("T")[0]!, "daily", "1.0"),
      ...postUrls,
      ...projectUrls,
      ...pageUrls,
    ].join("\n")

    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:xhtml="http://www.w3.org/1999/xhtml">
${urls}
</urlset>`

    return reply
      .header("Content-Type", "application/xml; charset=utf-8")
      .header("Cache-Control", "public, max-age=3600")
      .send(xml)
  })
}
