import type { FastifyInstance } from "fastify"
import { z } from "zod"
import { prisma, Prisma } from "@chronos/db"
import { requireRole } from "../utils/requireRole.js"
import { logActivity } from "../utils/activityLogger.js"

const getUserId = (request: import("fastify").FastifyRequest): string =>
  (request.user as { id?: string; sub?: string }).id ??
  (request.user as { sub?: string }).sub ??
  ""

const certTranslationSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.record(z.unknown()).default({}),
})

const certSchema = z.object({
  issuer: z.string().min(1).max(200),
  issuedAt: z.string().datetime(),
  expiresAt: z.string().datetime().nullable().optional(),
  credentialUrl: z.string().url().max(500).nullable().optional(),
  logoUrl: z.string().max(500).nullable().optional(),
  order: z.number().int().optional(),
  translations: z.record(certTranslationSchema),
})

const reorderSchema = z.object({
  ids: z.array(z.string()).min(1),
})

const certWithTranslationsSelect = {
  id: true,
  title: true,
  issuer: true,
  issuedAt: true,
  expiresAt: true,
  credentialUrl: true,
  logoUrl: true,
  order: true,
  createdAt: true,
  updatedAt: true,
  translations: {
    select: { id: true, locale: true, title: true, description: true },
  },
} as const

type CertWithTranslations = Prisma.CertificationGetPayload<{
  select: typeof certWithTranslationsSelect
}>

const flattenCert = (cert: CertWithTranslations, locale: string) => {
  const tr = cert.translations.find((t) => t.locale === locale) ?? cert.translations[0]
  return {
    id: cert.id,
    issuer: cert.issuer,
    issuedAt: cert.issuedAt,
    expiresAt: cert.expiresAt,
    credentialUrl: cert.credentialUrl,
    logoUrl: cert.logoUrl,
    order: cert.order,
    createdAt: cert.createdAt,
    updatedAt: cert.updatedAt,
    locale: tr?.locale ?? locale,
    title: tr?.title ?? cert.title,
    description: tr?.description ?? {},
    translationCount: cert.translations.length,
    hreflang: cert.translations.map((t) => ({ locale: t.locale })),
    translations: cert.translations,
  }
}

export const certificationsRoutes = async (fastify: FastifyInstance): Promise<void> => {
  // ── Public: list ──────────────────────────────────────────────────────────

  fastify.get("/certifications", async (req, reply) => {
    const q = req.query as Record<string, string | undefined>
    const lang = q["lang"] ?? "en"
    const certs = await prisma.certification.findMany({
      orderBy: { order: "asc" },
      select: certWithTranslationsSelect,
    })
    return reply.send({ data: certs.map((c) => flattenCert(c, lang)) })
  })

  // ── Admin: list ───────────────────────────────────────────────────────────

  fastify.get("/admin/certifications", { preHandler: fastify.authenticate }, async (req, reply) => {
    if (!(await requireRole(req, reply, "EDITOR"))) return
    const certs = await prisma.certification.findMany({
      orderBy: { order: "asc" },
      select: certWithTranslationsSelect,
    })
    return reply.send({ data: certs.map((c) => flattenCert(c, "en")) })
  })

  // ── Admin: reorder (must be before /:id routes) ───────────────────────────

  fastify.put(
    "/admin/certifications/reorder",
    { preHandler: fastify.authenticate },
    async (req, reply) => {
      if (!(await requireRole(req, reply, "EDITOR"))) return
      const parse = reorderSchema.safeParse(req.body)
      if (!parse.success) return reply.status(400).send({ error: "Invalid ids array" })

      await prisma.$transaction(
        parse.data.ids.map((id, index) =>
          prisma.certification.update({ where: { id }, data: { order: index } }),
        ),
      )
      return reply.status(204).send()
    },
  )

  // ── Admin: create ─────────────────────────────────────────────────────────

  fastify.post("/admin/certifications", { preHandler: fastify.authenticate }, async (req, reply) => {
    if (!(await requireRole(req, reply, "EDITOR"))) return
    const parse = certSchema.safeParse(req.body)
    if (!parse.success) {
      return reply.status(400).send({ error: parse.error.issues[0]?.message ?? "Invalid input" })
    }
    if (Object.keys(parse.data.translations).length === 0) {
      return reply.status(400).send({ error: "At least one translation is required" })
    }

    const maxOrder = await prisma.certification.aggregate({ _max: { order: true } })
    const nextOrder = (maxOrder._max.order ?? -1) + 1
    const defaultTitle = Object.values(parse.data.translations)[0]?.title ?? ""

    const cert = await prisma.certification.create({
      data: {
        title: defaultTitle,
        issuer: parse.data.issuer,
        issuedAt: new Date(parse.data.issuedAt),
        expiresAt: parse.data.expiresAt ? new Date(parse.data.expiresAt) : null,
        credentialUrl: parse.data.credentialUrl ?? null,
        logoUrl: parse.data.logoUrl ?? null,
        order: parse.data.order ?? nextOrder,
        translations: {
          create: Object.entries(parse.data.translations).map(([locale, tr]) => ({
            locale,
            title: tr.title,
            description: tr.description as Prisma.InputJsonValue,
          })),
        },
      },
      select: certWithTranslationsSelect,
    })

    logActivity({
      userId: getUserId(req),
      action: "certification.created",
      entityType: "certification",
      entityId: cert.id,
      entityTitle: defaultTitle,
    })

    return reply.status(201).send({ data: flattenCert(cert, "en") })
  })

  // ── Admin: update ─────────────────────────────────────────────────────────

  fastify.put<{ Params: { id: string } }>(
    "/admin/certifications/:id",
    { preHandler: fastify.authenticate },
    async (req, reply) => {
      if (!(await requireRole(req, reply, "EDITOR"))) return
      const parse = certSchema.partial().safeParse(req.body)
      if (!parse.success) {
        return reply.status(400).send({ error: parse.error.issues[0]?.message ?? "Invalid input" })
      }

      const existing = await prisma.certification.findUnique({ where: { id: req.params.id } })
      if (!existing) return reply.status(404).send({ error: "Certification not found" })

      const { translations, ...sharedFields } = parse.data
      const defaultTitle = translations
        ? (Object.values(translations)[0]?.title ?? existing.title)
        : existing.title

      const updateData: Prisma.CertificationUpdateInput = {
        title: defaultTitle,
        ...(sharedFields.issuer !== undefined && { issuer: sharedFields.issuer }),
        ...(sharedFields.issuedAt !== undefined && { issuedAt: new Date(sharedFields.issuedAt) }),
        ...(sharedFields.expiresAt !== undefined && {
          expiresAt: sharedFields.expiresAt ? new Date(sharedFields.expiresAt) : null,
        }),
        ...(sharedFields.credentialUrl !== undefined && { credentialUrl: sharedFields.credentialUrl }),
        ...(sharedFields.logoUrl !== undefined && { logoUrl: sharedFields.logoUrl }),
        ...(sharedFields.order !== undefined && { order: sharedFields.order }),
      }

      if (translations) {
        updateData.translations = {
          upsert: Object.entries(translations).map(([locale, tr]) => ({
            where: { certificationId_locale: { certificationId: req.params.id, locale } },
            update: {
              title: tr.title,
              description: tr.description as Prisma.InputJsonValue,
            },
            create: {
              locale,
              title: tr.title,
              description: tr.description as Prisma.InputJsonValue,
            },
          })),
        }
      }

      const cert = await prisma.certification.update({
        where: { id: req.params.id },
        data: updateData,
        select: certWithTranslationsSelect,
      })

      logActivity({
        userId: getUserId(req),
        action: "certification.updated",
        entityType: "certification",
        entityId: cert.id,
        entityTitle: defaultTitle,
      })

      return reply.send({ data: flattenCert(cert, "en") })
    },
  )

  // ── Admin: delete ─────────────────────────────────────────────────────────

  fastify.delete<{ Params: { id: string } }>(
    "/admin/certifications/:id",
    { preHandler: fastify.authenticate },
    async (req, reply) => {
      if (!(await requireRole(req, reply, "EDITOR"))) return

      const existing = await prisma.certification.findUnique({ where: { id: req.params.id } })
      if (!existing) return reply.status(404).send({ error: "Certification not found" })

      await prisma.certification.delete({ where: { id: req.params.id } })

      logActivity({
        userId: getUserId(req),
        action: "certification.deleted",
        entityType: "certification",
        entityId: existing.id,
        entityTitle: existing.title,
      })

      return reply.status(204).send()
    },
  )
}
