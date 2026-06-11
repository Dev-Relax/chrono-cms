// NOTE: Several queries use (prisma as any) because the Prisma client types
// reflect the old schema until `prisma generate` is re-run after migration.

import type { FastifyInstance } from "fastify"
import { readdirSync } from "node:fs"
import { prisma } from "@chronos/db"
import { UPLOADS_DIR } from "./media.js"

export const statsRoutes = async (fastify: FastifyInstance): Promise<void> => {
  fastify.get("/admin/stats", { preHandler: [fastify.authenticate] }, async (request, reply) => {
    const payload = request.user as { sub: string; role: string }
    const postWhere = payload.role === "AUTHOR" ? { authorId: payload.sub } : {}

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const db = prisma as any

    const [
      totalPosts,
      publishedPosts,
      totalPages,
      publishedPages,
      totalProjects,
      publishedProjects,
      totalUsers,
      recentPostsRaw,
      recentPagesRaw,
      recentProjectsRaw,
    ] = await Promise.all([
      prisma.post.count({ where: postWhere }),
      prisma.post.count({ where: { ...postWhere, status: "PUBLISHED" } }),
      prisma.page.count(),
      prisma.page.count({ where: { status: "PUBLISHED" } }),
      prisma.project.count(),
      prisma.project.count({ where: { status: "PUBLISHED" } }),
      payload.role === "ADMIN" ? prisma.user.count() : Promise.resolve(null),
      db.post.findMany({
        where: postWhere,
        orderBy: { updatedAt: "desc" },
        take: 5,
        select: {
          id: true,
          defaultLocale: true,
          status: true,
          featured: true,
          publishedAt: true,
          updatedAt: true,
          author: { select: { name: true, email: true } },
          translations: { select: { locale: true, title: true, slug: true } },
        },
      }),
      db.page.findMany({
        orderBy: { updatedAt: "desc" },
        take: 5,
        select: {
          id: true,
          defaultLocale: true,
          status: true,
          updatedAt: true,
          translations: { select: { locale: true, title: true, slug: true } },
        },
      }),
      db.project.findMany({
        orderBy: { updatedAt: "desc" },
        take: 5,
        select: {
          id: true,
          defaultLocale: true,
          status: true,
          featured: true,
          updatedAt: true,
          translations: { select: { locale: true, title: true, slug: true } },
        },
      }),
    ])

    // Derive title/slug from the defaultLocale translation for each post
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const recentPosts = (recentPostsRaw as any[]).map((p) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const def =
        p.translations?.find((t: any) => t.locale === p.defaultLocale) ?? p.translations?.[0]
      return {
        id: p.id,
        title: def?.title ?? "",
        slug: def?.slug ?? "",
        status: p.status,
        featured: p.featured,
        publishedAt: p.publishedAt,
        updatedAt: p.updatedAt,
        author: p.author,
      }
    })

    // Derive title/slug from the defaultLocale translation for each page
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const recentPages = (recentPagesRaw as any[]).map((p) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const def =
        p.translations?.find((t: any) => t.locale === p.defaultLocale) ?? p.translations?.[0]
      return {
        id: p.id,
        title: def?.title ?? "",
        slug: def?.slug ?? "",
        status: p.status,
        updatedAt: p.updatedAt,
      }
    })

    // Derive title/slug from the defaultLocale translation for each project
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const recentProjects = (recentProjectsRaw as any[]).map((p) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const def =
        p.translations?.find((t: any) => t.locale === p.defaultLocale) ?? p.translations?.[0]
      return {
        id: p.id,
        title: def?.title ?? "",
        slug: def?.slug ?? "",
        status: p.status,
        featured: p.featured,
        updatedAt: p.updatedAt,
      }
    })

    let totalMedia = 0
    try {
      totalMedia = readdirSync(UPLOADS_DIR).length
    } catch {
      /* dir may not exist yet */
    }

    return reply.send({
      data: {
        posts: {
          total: totalPosts,
          published: publishedPosts,
          draft: totalPosts - publishedPosts,
        },
        pages: {
          total: totalPages,
          published: publishedPages,
          draft: totalPages - publishedPages,
        },
        projects: {
          total: totalProjects,
          published: publishedProjects,
          draft: totalProjects - publishedProjects,
        },
        media: { total: totalMedia },
        users: { total: totalUsers },
        recentPosts,
        recentPages,
        recentProjects,
      },
    })
  })
}
