import type { FastifyInstance } from "fastify"
import { prisma } from "@chronos/db"

const esc = (s: string): string =>
  s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;")

const toW3C = (d: Date): string => d.toISOString().split("T")[0] ?? ""

const url = (
  loc: string,
  lastmod: Date,
  priority: string,
  changefreq = "weekly",
): string => `  <url>
    <loc>${esc(loc)}</loc>
    <lastmod>${toW3C(lastmod)}</lastmod>
    <changefreq>${changefreq}</changefreq>
    <priority>${priority}</priority>
  </url>`

export const sitemapRoutes = async (fastify: FastifyInstance): Promise<void> => {
  fastify.get("/sitemap.xml", async (_req, reply) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const settings = await (prisma.siteSettings.findUnique as any)({
      where: { id: "singleton" },
    })

    const brand = (settings?.brandConfig ?? {}) as Record<string, unknown>
    const siteUrl = (typeof brand["siteUrl"] === "string" ? brand["siteUrl"] : "").replace(/\/$/, "")

    // Fetch all published content in parallel
    const [posts, pages, projects] = await Promise.all([
      prisma.postTranslation.findMany({
        where: { post: { status: "PUBLISHED" } },
        select: { locale: true, slug: true, post: { select: { updatedAt: true } } },
      }),
      prisma.pageTranslation.findMany({
        where: { page: { status: "PUBLISHED" } },
        select: { locale: true, slug: true, page: { select: { updatedAt: true } } },
      }),
      prisma.projectTranslation.findMany({
        where: { project: { status: "PUBLISHED" } },
        select: { locale: true, slug: true, project: { select: { updatedAt: true } } },
      }),
    ])

    const urls: string[] = []

    // Homepage
    urls.push(url(`${siteUrl}/`, new Date(), "1.0", "daily"))

    // Posts → /posts/:slug
    for (const t of posts) {
      urls.push(url(`${siteUrl}/posts/${t.slug}`, t.post.updatedAt, "0.8"))
    }

    // Projects → /projects/:slug
    for (const t of projects) {
      urls.push(url(`${siteUrl}/projects/${t.slug}`, t.project.updatedAt, "0.7"))
    }

    // Pages → /:slug
    for (const t of pages) {
      urls.push(url(`${siteUrl}/${t.slug}`, t.page.updatedAt, "0.6", "monthly"))
    }

    const xml = [
      '<?xml version="1.0" encoding="UTF-8"?>',
      '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"',
      '        xmlns:xhtml="http://www.w3.org/1999/xhtml">',
      ...urls,
      "</urlset>",
    ].join("\n")

    return reply
      .header("Content-Type", "application/xml; charset=utf-8")
      .header("Cache-Control", "public, max-age=3600")
      .send(xml)
  })
}
