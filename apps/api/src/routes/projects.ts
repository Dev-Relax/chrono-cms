import type { FastifyInstance } from "fastify"
import { z } from "zod"
import { prisma, Prisma } from "@chronos/db"
import { slugify } from "../utils/slugify.js"
import { requireRole } from "../utils/requireRole.js"
import { transformContent, type ContentFormat } from "../utils/contentTransformer.js"
import { dispatchWebhook } from "../utils/webhookDispatcher.js"
import { logActivity } from "../utils/activityLogger.js"

const parseFormat = (q: Record<string, string | undefined>): ContentFormat => {
  const f = q["format"]
  return f === "html" || f === "markdown" ? f : "json"
}

const parseLang = (q: Record<string, string | undefined>): string | undefined =>
  q["lang"] || undefined

const projectWithTranslationsSelect = {
  id: true,
  defaultLocale: true,
  status: true,
  featured: true,
  order: true,
  coverImage: true,
  techStack: true,
  githubUrl: true,
  liveUrl: true,
  blogUrl: true,
  postId: true,
  createdAt: true,
  updatedAt: true,
  author: { select: { id: true, name: true, email: true } },
  // Used to resolve the internal blog link to /posts/:slug at read time.
  post: {
    select: {
      defaultLocale: true,
      translations: { select: { locale: true, slug: true } },
    },
  },
  translations: {
    select: {
      id: true,
      locale: true,
      title: true,
      slug: true,
      summary: true,
      content: true,
      metaTitle: true,
      metaDescription: true,
    },
  },
} as const

type ProjectWithTranslations = Prisma.ProjectGetPayload<{
  select: typeof projectWithTranslationsSelect
}>

const projectTranslationSchema = z.object({
  title: z.string().min(1).max(255),
  slug: z.string().optional(),
  summary: z.string().max(1000).optional(),
  content: z.record(z.unknown()).default({}),
  metaTitle: z.string().max(255).optional(),
  metaDescription: z.string().max(500).optional(),
})

const projectBodySchema = z.object({
  defaultLocale: z.string().default("en"),
  status: z.enum(["DRAFT", "PUBLISHED"]).default("DRAFT"),
  featured: z.boolean().optional(),
  order: z.number().int().optional(),
  coverImage: z.string().optional(),
  techStack: z.array(z.string()).optional(),
  githubUrl: z.string().optional(),
  liveUrl: z.string().optional(),
  blogUrl: z.string().optional(),
  postId: z.string().nullable().optional(),
  /** Multi-locale payload: keyed by locale ("en", "fr", …) */
  translations: z.record(projectTranslationSchema).optional(),
})

// Resolves the blog link: internal post slug wins over a stored external URL.
const resolveBlogUrl = (project: ProjectWithTranslations, locale: string): string | null => {
  if (project.postId && project.post) {
    const ptr =
      project.post.translations.find((t) => t.locale === locale) ??
      project.post.translations.find((t) => t.locale === project.post?.defaultLocale) ??
      project.post.translations[0]
    if (ptr) return `/posts/${ptr.slug}`
  }
  return project.blogUrl ?? null
}

// Promotes one translation's fields to the top-level response and adds hreflang.
const flattenProject = (
  project: ProjectWithTranslations,
  locale: string,
  format: ContentFormat,
) => {
  const tr =
    project.translations.find((t) => t.locale === locale) ??
    project.translations.find((t) => t.locale === project.defaultLocale) ??
    project.translations[0]

  if (!tr) return null

  const hreflang = project.translations.map((t) => ({
    locale: t.locale,
    slug: t.slug,
  }))

  return {
    id: project.id,
    defaultLocale: project.defaultLocale,
    locale: tr.locale,
    title: tr.title,
    slug: tr.slug,
    summary: tr.summary ?? null,
    content: transformContent(tr.content, format),
    metaTitle: tr.metaTitle,
    metaDescription: tr.metaDescription,
    coverImage: project.coverImage,
    techStack: project.techStack,
    githubUrl: project.githubUrl,
    liveUrl: project.liveUrl,
    blogUrl: resolveBlogUrl(project, tr.locale),
    postId: project.postId,
    featured: project.featured,
    order: project.order,
    status: project.status,
    createdAt: project.createdAt,
    updatedAt: project.updatedAt,
    author: project.author,
    hreflang,
  }
}

const PROJECT_ORDER_BY = [
  { featured: "desc" as const },
  { order: "asc" as const },
  { createdAt: "desc" as const },
]

export const projectsRoutes = async (fastify: FastifyInstance): Promise<void> => {
  // Public listing of all published projects.
  // ?lang=fr          — prefer FR translations (falls back to defaultLocale)
  // ?lang=fr&strict=1 — only return projects that have an FR translation
  fastify.get("/projects", async (request, reply) => {
    const q = request.query as Record<string, string | undefined>
    const format = parseFormat(q)
    const lang = parseLang(q)
    const strict = q["strict"] === "1" || q["strict"] === "true"

    const where = {
      status: "PUBLISHED" as const,
      ...(strict && lang ? { translations: { some: { locale: lang } } } : {}),
    }

    const projects = await prisma.project.findMany({
      where,
      select: projectWithTranslationsSelect,
      orderBy: PROJECT_ORDER_BY,
    })

    const data = projects
      .map((p) => flattenProject(p, lang ?? p.defaultLocale, format))
      .filter(Boolean)

    return reply.send({ data })
  })

  // Looks up by translation slug (any locale), then applies lang preference.
  fastify.get("/projects/:slug", async (request, reply) => {
    const { slug } = request.params as { slug: string }
    const q = request.query as Record<string, string | undefined>
    const format = parseFormat(q)
    const lang = parseLang(q)

    const project = await prisma.project.findFirst({
      where: {
        status: "PUBLISHED",
        translations: { some: { slug } },
      },
      select: projectWithTranslationsSelect,
    })

    if (!project) return reply.status(404).send({ error: "Project not found" })

    // Prefer the slug's own locale, then requested lang, then defaultLocale
    const slugLocale = project.translations.find((t) => t.slug === slug)?.locale
    const resolvedLocale = lang ?? slugLocale ?? project.defaultLocale

    const flat = flattenProject(project, resolvedLocale, format)
    if (!flat) return reply.status(404).send({ error: "Project not found" })

    return reply.send({ data: flat })
  })

  fastify.get(
    "/admin/projects",
    { preHandler: [fastify.authenticate] },
    async (request, reply) => {
      if (!(await requireRole(request, reply, "EDITOR"))) return

      const projects = await prisma.project.findMany({
        select: projectWithTranslationsSelect,
        orderBy: [{ order: "asc" }, { updatedAt: "desc" }],
      })

      // Lightweight list: flatten to defaultLocale, include translation count.
      const data = projects.map((p) => {
        const defTr =
          p.translations.find((t) => t.locale === p.defaultLocale) ?? p.translations[0]
        return {
          id: p.id,
          defaultLocale: p.defaultLocale,
          locale: defTr?.locale ?? p.defaultLocale,
          title: defTr?.title ?? "",
          slug: defTr?.slug ?? "",
          status: p.status,
          featured: p.featured,
          order: p.order,
          coverImage: p.coverImage,
          techStack: p.techStack,
          createdAt: p.createdAt,
          updatedAt: p.updatedAt,
          author: p.author,
          translationCount: p.translations.length,
          hreflang: p.translations.map((t) => ({ locale: t.locale, slug: t.slug })),
        }
      })

      return reply.send({ data })
    },
  )

  // Reorder must be matched as a static route — declared before the :id handler.
  fastify.put(
    "/admin/projects/reorder",
    { preHandler: [fastify.authenticate] },
    async (request, reply) => {
      if (!(await requireRole(request, reply, "EDITOR"))) return

      const schema = z.object({ ids: z.array(z.string()) })
      const body = schema.safeParse(request.body)
      if (!body.success) {
        return reply.status(400).send({ error: "Validation failed", details: body.error.flatten() })
      }

      await prisma.$transaction(
        body.data.ids.map((id, index) =>
          prisma.project.updateMany({ where: { id }, data: { order: index } }),
        ),
      )

      return reply.send({ data: { reordered: body.data.ids.length } })
    },
  )

  fastify.get(
    "/admin/projects/:id",
    { preHandler: [fastify.authenticate] },
    async (request, reply) => {
      if (!(await requireRole(request, reply, "EDITOR"))) return

      const { id } = request.params as { id: string }
      const project = await prisma.project.findUnique({
        where: { id },
        select: projectWithTranslationsSelect,
      })

      if (!project) return reply.status(404).send({ error: "Project not found" })
      return reply.send({ data: project })
    },
  )

  fastify.post(
    "/admin/projects",
    { preHandler: [fastify.authenticate] },
    async (request, reply) => {
      if (!(await requireRole(request, reply, "EDITOR"))) return

      const body = projectBodySchema.safeParse(request.body)
      if (!body.success) {
        return reply.status(400).send({ error: "Validation failed", details: body.error.flatten() })
      }

      const userPayload = request.user as { sub: string }
      const {
        defaultLocale,
        status,
        featured,
        order,
        coverImage,
        techStack,
        githubUrl,
        liveUrl,
        blogUrl,
        postId,
        translations = {},
      } = body.data

      if (Object.keys(translations).length === 0) {
        return reply.status(400).send({ error: "At least one translation is required" })
      }

      // Internal post link wins — clear the free-form URL when a post is linked.
      const hasPost = postId !== undefined && postId !== null && postId !== ""

      const project = await prisma.project.create({
        data: {
          defaultLocale,
          status,
          authorId: userPayload.sub,
          ...(featured !== undefined && { featured }),
          ...(order !== undefined && { order }),
          ...(coverImage !== undefined && { coverImage }),
          ...(techStack !== undefined && { techStack }),
          ...(githubUrl !== undefined && { githubUrl }),
          ...(liveUrl !== undefined && { liveUrl }),
          blogUrl: hasPost ? null : (blogUrl ?? null),
          postId: hasPost ? postId : null,
          translations: {
            create: Object.entries(translations).map(([locale, tr]) => ({
              locale,
              title: tr.title,
              slug: tr.slug ?? slugify(tr.title),
              content: tr.content as Prisma.InputJsonValue,
              ...(tr.summary !== undefined && { summary: tr.summary }),
              ...(tr.metaTitle !== undefined && { metaTitle: tr.metaTitle }),
              ...(tr.metaDescription !== undefined && { metaDescription: tr.metaDescription }),
            })),
          },
        },
        select: projectWithTranslationsSelect,
      })

      const defTr =
        project.translations.find((t) => t.locale === defaultLocale) ?? project.translations[0]
      logActivity({
        userId: userPayload.sub,
        action: "project.created",
        entityType: "project",
        entityId: project.id,
        ...(defTr?.title !== undefined && { entityTitle: defTr.title }),
      })
      if (status === "PUBLISHED" && defTr) {
        dispatchWebhook("project.published", {
          id: project.id,
          defaultLocale: project.defaultLocale,
          title: defTr.title,
          slug: defTr.slug,
          translations: project.translations.map((t) => ({
            locale: t.locale,
            title: t.title,
            slug: t.slug,
          })),
        })
      }

      return reply.status(201).send({ data: project })
    },
  )

  fastify.put(
    "/admin/projects/:id",
    { preHandler: [fastify.authenticate] },
    async (request, reply) => {
      if (!(await requireRole(request, reply, "EDITOR"))) return

      const { id } = request.params as { id: string }
      const body = projectBodySchema.partial().safeParse(request.body)
      if (!body.success) {
        return reply.status(400).send({ error: "Validation failed", details: body.error.flatten() })
      }

      const existing = await prisma.project.findUnique({
        where: { id },
        select: { id: true, status: true, defaultLocale: true },
      })
      if (!existing) return reply.status(404).send({ error: "Project not found" })

      const {
        defaultLocale,
        status,
        featured,
        order,
        coverImage,
        techStack,
        githubUrl,
        liveUrl,
        blogUrl,
        postId,
        translations = {},
      } = body.data

      // Upsert each locale translation
      for (const [locale, tr] of Object.entries(translations)) {
        await prisma.projectTranslation.upsert({
          where: { projectId_locale: { projectId: id, locale } },
          create: {
            projectId: id,
            locale,
            title: tr.title,
            slug: tr.slug ?? slugify(tr.title),
            content: tr.content as Prisma.InputJsonValue,
            ...(tr.summary !== undefined && { summary: tr.summary }),
            ...(tr.metaTitle !== undefined && { metaTitle: tr.metaTitle }),
            ...(tr.metaDescription !== undefined && { metaDescription: tr.metaDescription }),
          },
          update: {
            title: tr.title,
            slug: tr.slug ?? slugify(tr.title),
            content: tr.content as Prisma.InputJsonValue,
            ...(tr.summary !== undefined && { summary: tr.summary }),
            ...(tr.metaTitle !== undefined && { metaTitle: tr.metaTitle }),
            ...(tr.metaDescription !== undefined && { metaDescription: tr.metaDescription }),
          },
        })
      }

      // Blog link: when postId is explicitly provided we honour the "one or the
      // other" rule; a non-empty postId clears blogUrl and vice versa.
      const blogLinkUpdate: Prisma.ProjectUpdateInput = {}
      if (postId !== undefined) {
        const hasPost = postId !== null && postId !== ""
        blogLinkUpdate.post = hasPost ? { connect: { id: postId } } : { disconnect: true }
        if (hasPost) blogLinkUpdate.blogUrl = null
        else if (blogUrl !== undefined) blogLinkUpdate.blogUrl = blogUrl || null
      } else if (blogUrl !== undefined) {
        blogLinkUpdate.blogUrl = blogUrl || null
      }

      const updated = await prisma.project.update({
        where: { id },
        data: {
          ...(defaultLocale !== undefined && { defaultLocale }),
          ...(status !== undefined && { status }),
          ...(featured !== undefined && { featured }),
          ...(order !== undefined && { order }),
          ...(coverImage !== undefined && { coverImage }),
          ...(techStack !== undefined && { techStack }),
          ...(githubUrl !== undefined && { githubUrl }),
          ...(liveUrl !== undefined && { liveUrl }),
          ...blogLinkUpdate,
        },
        select: projectWithTranslationsSelect,
      })

      const userPayload = request.user as { sub: string }
      const defTr =
        updated.translations.find((t) => t.locale === updated.defaultLocale) ??
        updated.translations[0]
      logActivity({
        userId: userPayload.sub,
        action: "project.updated",
        entityType: "project",
        entityId: id,
        ...(defTr?.title !== undefined && { entityTitle: defTr.title }),
      })

      const justPublished = status === "PUBLISHED" && existing.status !== "PUBLISHED"
      if (defTr) {
        const webhookBase = {
          id,
          defaultLocale: updated.defaultLocale,
          title: defTr.title,
          slug: defTr.slug,
          translations: updated.translations.map((t) => ({
            locale: t.locale,
            title: t.title,
            slug: t.slug,
          })),
        }
        if (justPublished) {
          dispatchWebhook("project.published", webhookBase)
          logActivity({
            userId: userPayload.sub,
            action: "project.published",
            entityType: "project",
            entityId: id,
            entityTitle: defTr.title,
          })
        } else if (status === "PUBLISHED") {
          dispatchWebhook("project.updated", webhookBase)
        }
      }

      return reply.send({ data: updated })
    },
  )

  fastify.delete(
    "/admin/projects/:id",
    { preHandler: [fastify.authenticate] },
    async (request, reply) => {
      if (!(await requireRole(request, reply, "EDITOR"))) return

      const { id } = request.params as { id: string }
      const existing = await prisma.project.findUnique({
        where: { id },
        select: {
          id: true,
          defaultLocale: true,
          translations: { select: { locale: true, title: true, slug: true } },
        },
      })
      if (!existing) return reply.status(404).send({ error: "Project not found" })

      await prisma.project.delete({ where: { id } })

      const defTr =
        existing.translations.find((t) => t.locale === existing.defaultLocale) ??
        existing.translations[0]
      const userPayload = request.user as { sub: string }
      logActivity({
        userId: userPayload.sub,
        action: "project.deleted",
        entityType: "project",
        entityId: id,
        ...(defTr?.title !== undefined && { entityTitle: defTr.title }),
      })
      if (defTr) {
        dispatchWebhook("project.deleted", {
          id,
          defaultLocale: existing.defaultLocale,
          title: defTr.title,
          slug: defTr.slug,
          translations: existing.translations.map((t) => ({
            locale: t.locale,
            title: t.title,
            slug: t.slug,
          })),
        })
      }

      return reply.status(204).send()
    },
  )
}
