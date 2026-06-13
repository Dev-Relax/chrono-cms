import type { FastifyInstance } from "fastify"
import { z } from "zod"
import { prisma, Prisma } from "@chronos/db"
import { requireRole } from "../utils/requireRole.js"
import { logActivity } from "../utils/activityLogger.js"

const educationTranslationSchema = z.object({
  degree: z.string().min(1).max(255),
  description: z.record(z.unknown()).default({}),
})

const educationBodySchema = z.object({
  institution: z.string().min(1).max(255),
  field: z.string().max(255).optional(),
  startDate: z.string().datetime({ offset: true }).or(z.string().regex(/^\d{4}-\d{2}-\d{2}$/)),
  endDate: z
    .string()
    .datetime({ offset: true })
    .or(z.string().regex(/^\d{4}-\d{2}-\d{2}$/))
    .nullable()
    .optional(),
  url: z.string().max(500).optional(),
  logoUrl: z.string().max(500).optional(),
  order: z.number().int().optional(),
  translations: z.record(educationTranslationSchema).optional(),
})

const educationWithTranslationsSelect = {
  id: true,
  institution: true,
  field: true,
  startDate: true,
  endDate: true,
  url: true,
  logoUrl: true,
  order: true,
  createdAt: true,
  updatedAt: true,
  translations: {
    select: { id: true, locale: true, degree: true, description: true },
  },
} as const

type EducationWithTranslations = Prisma.EducationGetPayload<{
  select: typeof educationWithTranslationsSelect
}>

const flattenEducation = (edu: EducationWithTranslations, locale: string) => {
  const tr = edu.translations.find((t) => t.locale === locale) ?? edu.translations[0]

  return {
    id: edu.id,
    institution: edu.institution,
    field: edu.field,
    startDate: edu.startDate,
    endDate: edu.endDate,
    url: edu.url,
    logoUrl: edu.logoUrl,
    order: edu.order,
    createdAt: edu.createdAt,
    updatedAt: edu.updatedAt,
    locale: tr?.locale ?? locale,
    degree: tr?.degree ?? "",
    description: tr?.description ?? {},
    translationCount: edu.translations.length,
    hreflang: edu.translations.map((t) => ({ locale: t.locale })),
    translations: edu.translations,
  }
}

const getUserId = (request: { user: unknown }): string =>
  (request.user as { id?: string; sub?: string }).id ??
  (request.user as { sub?: string }).sub ??
  ""

export const educationRoutes = async (fastify: FastifyInstance) => {
  // Public: list all education entries ordered by start date desc
  fastify.get("/education", async (request, reply) => {
    const q = request.query as Record<string, string | undefined>
    const lang = q["lang"] || "en"

    const entries = await prisma.education.findMany({
      select: educationWithTranslationsSelect,
      orderBy: [{ order: "asc" }, { startDate: "desc" }],
    })

    return reply.send({ data: entries.map((e) => flattenEducation(e, lang)) })
  })

  // Admin: list all
  fastify.get(
    "/admin/education",
    { preHandler: [fastify.authenticate] },
    async (request, reply) => {
      if (!(await requireRole(request, reply, "EDITOR"))) return
      const entries = await prisma.education.findMany({
        select: educationWithTranslationsSelect,
        orderBy: [{ order: "asc" }, { startDate: "desc" }],
      })
      return reply.send({ data: entries.map((e) => flattenEducation(e, "en")) })
    },
  )

  // Admin: get single
  fastify.get<{ Params: { id: string } }>(
    "/admin/education/:id",
    { preHandler: [fastify.authenticate] },
    async (request, reply) => {
      if (!(await requireRole(request, reply, "EDITOR"))) return
      const edu = await prisma.education.findUnique({
        where: { id: request.params.id },
        select: educationWithTranslationsSelect,
      })
      if (!edu) return reply.status(404).send({ error: "Education entry not found" })
      return reply.send({ data: flattenEducation(edu, "en") })
    },
  )

  // Admin: create
  fastify.post(
    "/admin/education",
    { preHandler: [fastify.authenticate] },
    async (request, reply) => {
      if (!(await requireRole(request, reply, "EDITOR"))) return
      const parsed = educationBodySchema.safeParse(request.body)
      if (!parsed.success)
        return reply.status(400).send({ error: parsed.error.issues[0]?.message })
      const { translations = {}, ...shared } = parsed.data

      const edu = await prisma.education.create({
        data: {
          institution: shared.institution,
          field: shared.field ?? null,
          startDate: new Date(shared.startDate),
          endDate: shared.endDate ? new Date(shared.endDate) : null,
          url: shared.url ?? null,
          logoUrl: shared.logoUrl ?? null,
          order: shared.order ?? 0,
          translations: {
            create: Object.entries(translations).map(([locale, tr]) => ({
              locale,
              degree: tr.degree,
              description: tr.description as Prisma.InputJsonValue,
            })),
          },
        },
        select: educationWithTranslationsSelect,
      })

      logActivity({
        userId: getUserId(request),
        action: "education.created",
        entityType: "education",
        entityId: edu.id,
        entityTitle: edu.institution,
      })
      return reply.status(201).send({ data: flattenEducation(edu, "en") })
    },
  )

  // Admin: reorder (must be before :id)
  fastify.put(
    "/admin/education/reorder",
    { preHandler: [fastify.authenticate] },
    async (request, reply) => {
      if (!(await requireRole(request, reply, "EDITOR"))) return
      const { ids } = request.body as { ids: string[] }
      if (!Array.isArray(ids)) return reply.status(400).send({ error: "ids must be an array" })
      await prisma.$transaction(
        ids.map((id, index) => prisma.education.update({ where: { id }, data: { order: index } })),
      )
      return reply.status(204).send()
    },
  )

  // Admin: update
  fastify.put<{ Params: { id: string } }>(
    "/admin/education/:id",
    { preHandler: [fastify.authenticate] },
    async (request, reply) => {
      if (!(await requireRole(request, reply, "EDITOR"))) return
      const parsed = educationBodySchema.partial().safeParse(request.body)
      if (!parsed.success)
        return reply.status(400).send({ error: parsed.error.issues[0]?.message })
      const { translations, ...shared } = parsed.data

      const updateData: Prisma.EducationUpdateInput = {
        ...(shared.institution !== undefined && { institution: shared.institution }),
        ...(shared.field !== undefined && { field: shared.field }),
        ...(shared.startDate !== undefined && { startDate: new Date(shared.startDate) }),
        ...(shared.endDate !== undefined && {
          endDate: shared.endDate ? new Date(shared.endDate) : null,
        }),
        ...(shared.url !== undefined && { url: shared.url }),
        ...(shared.logoUrl !== undefined && { logoUrl: shared.logoUrl }),
        ...(shared.order !== undefined && { order: shared.order }),
      }

      if (translations) {
        updateData.translations = {
          upsert: Object.entries(translations).map(([locale, tr]) => ({
            where: { educationId_locale: { educationId: request.params.id, locale } },
            update: {
              degree: tr.degree,
              description: tr.description as Prisma.InputJsonValue,
            },
            create: {
              locale,
              degree: tr.degree,
              description: tr.description as Prisma.InputJsonValue,
            },
          })),
        }
      }

      const edu = await prisma.education.update({
        where: { id: request.params.id },
        data: updateData,
        select: educationWithTranslationsSelect,
      })

      logActivity({
        userId: getUserId(request),
        action: "education.updated",
        entityType: "education",
        entityId: edu.id,
        entityTitle: edu.institution,
      })
      return reply.send({ data: flattenEducation(edu, "en") })
    },
  )

  // Admin: delete
  fastify.delete<{ Params: { id: string } }>(
    "/admin/education/:id",
    { preHandler: [fastify.authenticate] },
    async (request, reply) => {
      if (!(await requireRole(request, reply, "EDITOR"))) return
      const edu = await prisma.education.findUnique({
        where: { id: request.params.id },
        select: { id: true, institution: true },
      })
      if (!edu) return reply.status(404).send({ error: "Education entry not found" })
      await prisma.education.delete({ where: { id: request.params.id } })
      logActivity({
        userId: getUserId(request),
        action: "education.deleted",
        entityType: "education",
        entityId: edu.id,
        entityTitle: edu.institution,
      })
      return reply.status(204).send()
    },
  )
}
