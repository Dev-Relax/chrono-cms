import type { FastifyInstance } from "fastify"
import { z } from "zod"
import { prisma, Prisma } from "@chronos/db"
import { requireRole } from "../utils/requireRole.js"
import { logActivity } from "../utils/activityLogger.js"

const experienceTranslationSchema = z.object({
  role: z.string().min(1).max(255),
  description: z.record(z.unknown()).default({}),
})

const experienceBodySchema = z.object({
  company: z.string().min(1).max(255),
  location: z.string().max(255).optional(),
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
  translations: z.record(experienceTranslationSchema).optional(),
})

const experienceWithTranslationsSelect = {
  id: true,
  company: true,
  location: true,
  startDate: true,
  endDate: true,
  url: true,
  logoUrl: true,
  order: true,
  createdAt: true,
  updatedAt: true,
  translations: {
    select: { id: true, locale: true, role: true, description: true },
  },
} as const

type ExperienceWithTranslations = Prisma.ExperienceGetPayload<{
  select: typeof experienceWithTranslationsSelect
}>

const flattenExperience = (exp: ExperienceWithTranslations, locale: string) => {
  const tr =
    exp.translations.find((t) => t.locale === locale) ?? exp.translations[0]

  return {
    id: exp.id,
    company: exp.company,
    location: exp.location,
    startDate: exp.startDate,
    endDate: exp.endDate,
    url: exp.url,
    logoUrl: exp.logoUrl,
    order: exp.order,
    createdAt: exp.createdAt,
    updatedAt: exp.updatedAt,
    locale: tr?.locale ?? locale,
    role: tr?.role ?? "",
    description: tr?.description ?? {},
    translationCount: exp.translations.length,
    hreflang: exp.translations.map((t) => ({ locale: t.locale })),
    translations: exp.translations,
  }
}

const getUserId = (request: { user: unknown }): string =>
  (request.user as { id?: string; sub?: string }).id ??
  (request.user as { sub?: string }).sub ??
  ""

export const experiencesRoutes = async (fastify: FastifyInstance) => {
  // Public: list all experiences ordered by start date desc
  fastify.get("/experiences", async (request, reply) => {
    const q = request.query as Record<string, string | undefined>
    const lang = q["lang"] || "en"

    const experiences = await prisma.experience.findMany({
      select: experienceWithTranslationsSelect,
      orderBy: [{ order: "asc" }, { startDate: "desc" }],
    })

    const data = experiences.map((e) => flattenExperience(e, lang))
    return reply.send({ data })
  })

  // Admin: list all experiences
  fastify.get(
    "/admin/experiences",
    { preHandler: [fastify.authenticate] },
    async (request, reply) => {
      if (!(await requireRole(request, reply, "EDITOR"))) return
      const experiences = await prisma.experience.findMany({
        select: experienceWithTranslationsSelect,
        orderBy: [{ order: "asc" }, { startDate: "desc" }],
      })
      return reply.send({ data: experiences.map((e) => flattenExperience(e, "en")) })
    },
  )

  // Admin: get single experience
  fastify.get<{ Params: { id: string } }>(
    "/admin/experiences/:id",
    { preHandler: [fastify.authenticate] },
    async (request, reply) => {
      if (!(await requireRole(request, reply, "EDITOR"))) return
      const exp = await prisma.experience.findUnique({
        where: { id: request.params.id },
        select: experienceWithTranslationsSelect,
      })
      if (!exp) return reply.status(404).send({ error: "Experience not found" })
      return reply.send({ data: flattenExperience(exp, "en") })
    },
  )

  // Admin: create
  fastify.post(
    "/admin/experiences",
    { preHandler: [fastify.authenticate] },
    async (request, reply) => {
      if (!(await requireRole(request, reply, "EDITOR"))) return
      const parsed = experienceBodySchema.safeParse(request.body)
      if (!parsed.success)
        return reply.status(400).send({ error: parsed.error.issues[0]?.message })
      const { translations = {}, ...shared } = parsed.data

      const exp = await prisma.experience.create({
        data: {
          company: shared.company,
          location: shared.location ?? null,
          startDate: new Date(shared.startDate),
          endDate: shared.endDate ? new Date(shared.endDate) : null,
          url: shared.url ?? null,
          logoUrl: shared.logoUrl ?? null,
          order: shared.order ?? 0,
          translations: {
            create: Object.entries(translations).map(([locale, tr]) => ({
              locale,
              role: tr.role,
              description: tr.description as Prisma.InputJsonValue,
            })),
          },
        },
        select: experienceWithTranslationsSelect,
      })

      logActivity({
        userId: getUserId(request),
        action: "experience.created",
        entityType: "experience",
        entityId: exp.id,
        entityTitle: exp.company,
      })
      return reply.status(201).send({ data: flattenExperience(exp, "en") })
    },
  )

  // Admin: update (reorder must be before :id)
  fastify.put(
    "/admin/experiences/reorder",
    { preHandler: [fastify.authenticate] },
    async (request, reply) => {
      if (!(await requireRole(request, reply, "EDITOR"))) return
      const { ids } = request.body as { ids: string[] }
      if (!Array.isArray(ids)) return reply.status(400).send({ error: "ids must be an array" })
      await prisma.$transaction(
        ids.map((id, index) => prisma.experience.update({ where: { id }, data: { order: index } })),
      )
      return reply.status(204).send()
    },
  )

  fastify.put<{ Params: { id: string } }>(
    "/admin/experiences/:id",
    { preHandler: [fastify.authenticate] },
    async (request, reply) => {
      if (!(await requireRole(request, reply, "EDITOR"))) return
      const parsed = experienceBodySchema.partial().safeParse(request.body)
      if (!parsed.success)
        return reply.status(400).send({ error: parsed.error.issues[0]?.message })
      const { translations, ...shared } = parsed.data

      const updateData: Prisma.ExperienceUpdateInput = {
        ...(shared.company !== undefined && { company: shared.company }),
        ...(shared.location !== undefined && { location: shared.location }),
        ...(shared.startDate !== undefined && { startDate: new Date(shared.startDate) }),
        ...(shared.endDate !== undefined && { endDate: shared.endDate ? new Date(shared.endDate) : null }),
        ...(shared.url !== undefined && { url: shared.url }),
        ...(shared.logoUrl !== undefined && { logoUrl: shared.logoUrl }),
        ...(shared.order !== undefined && { order: shared.order }),
      }

      if (translations) {
        updateData.translations = {
          upsert: Object.entries(translations).map(([locale, tr]) => ({
            where: { experienceId_locale: { experienceId: request.params.id, locale } },
            update: {
              role: tr.role,
              description: tr.description as Prisma.InputJsonValue,
            },
            create: {
              locale,
              role: tr.role,
              description: tr.description as Prisma.InputJsonValue,
            },
          })),
        }
      }

      const exp = await prisma.experience.update({
        where: { id: request.params.id },
        data: updateData,
        select: experienceWithTranslationsSelect,
      })

      logActivity({
        userId: getUserId(request),
        action: "experience.updated",
        entityType: "experience",
        entityId: exp.id,
        entityTitle: exp.company,
      })
      return reply.send({ data: flattenExperience(exp, "en") })
    },
  )

  // Admin: delete
  fastify.delete<{ Params: { id: string } }>(
    "/admin/experiences/:id",
    { preHandler: [fastify.authenticate] },
    async (request, reply) => {
      if (!(await requireRole(request, reply, "EDITOR"))) return
      const exp = await prisma.experience.findUnique({
        where: { id: request.params.id },
        select: { id: true, company: true },
      })
      if (!exp) return reply.status(404).send({ error: "Experience not found" })
      await prisma.experience.delete({ where: { id: request.params.id } })
      logActivity({
        userId: getUserId(request),
        action: "experience.deleted",
        entityType: "experience",
        entityId: exp.id,
        entityTitle: exp.company,
      })
      return reply.status(204).send()
    },
  )
}
