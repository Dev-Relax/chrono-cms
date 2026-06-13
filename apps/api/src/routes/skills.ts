import type { FastifyInstance } from "fastify"
import { z } from "zod"
import { prisma } from "@chronos/db"
import { slugify } from "../utils/slugify.js"
import { requireRole } from "../utils/requireRole.js"
import { logActivity } from "../utils/activityLogger.js"

const skillSchema = z.object({
  name: z.string().min(1).max(100),
  slug: z.string().optional(),
  category: z.string().min(1).max(100),
  level: z.enum(["BEGINNER", "INTERMEDIATE", "ADVANCED", "EXPERT"]).optional(),
  icon: z.string().max(200).optional(),
  order: z.number().int().optional(),
  visible: z.boolean().optional(),
})

export const skillsRoutes = async (fastify: FastifyInstance) => {
  // Public: list visible skills, optionally filtered by category
  fastify.get<{ Querystring: { category?: string } }>("/skills", async (request, reply) => {
    const { category } = request.query
    const skills = await prisma.skill.findMany({
      where: {
        visible: true,
        ...(category ? { category } : {}),
      },
      orderBy: [{ order: "asc" }, { name: "asc" }],
    })
    return reply.send({ data: skills })
  })

  // Admin: list all skills (including hidden)
  fastify.get(
    "/admin/skills",
    { preHandler: fastify.authenticate },
    async (request, reply) => {
      await requireRole(request, reply, "EDITOR")
      const skills = await prisma.skill.findMany({
        orderBy: [{ order: "asc" }, { name: "asc" }],
      })
      return reply.send({ data: skills })
    },
  )

  // Admin: create skill
  fastify.post(
    "/admin/skills",
    { preHandler: fastify.authenticate },
    async (request, reply) => {
      await requireRole(request, reply, "EDITOR")
      const parsed = skillSchema.safeParse(request.body)
      if (!parsed.success) return reply.status(400).send({ error: parsed.error.issues[0]?.message })
      const data = parsed.data
      const slug = data.slug ?? slugify(data.name)
      const skill = await prisma.skill.create({
        data: {
          name: data.name,
          slug,
          category: data.category,
          level: data.level ?? "INTERMEDIATE",
          icon: data.icon ?? null,
          order: data.order ?? 0,
          visible: data.visible ?? true,
        },
      })
      const user = request.user as { id: string }
      logActivity({ userId: user.id, action: "skill.created", entityType: "skill", entityId: skill.id, entityTitle: skill.name })
      return reply.status(201).send({ data: skill })
    },
  )

  // Admin: update skill
  fastify.put<{ Params: { id: string } }>(
    "/admin/skills/:id",
    { preHandler: fastify.authenticate },
    async (request, reply) => {
      await requireRole(request, reply, "EDITOR")
      const parsed = skillSchema.partial().safeParse(request.body)
      if (!parsed.success) return reply.status(400).send({ error: parsed.error.issues[0]?.message })
      const data = parsed.data
      if (data.name && !data.slug) data.slug = slugify(data.name)
      const skill = await prisma.skill.update({
        where: { id: request.params.id },
        data,
      })
      const user = request.user as { id: string }
      logActivity({ userId: user.id, action: "skill.updated", entityType: "skill", entityId: skill.id, entityTitle: skill.name })
      return reply.send({ data: skill })
    },
  )

  // Admin: reorder skills
  fastify.put(
    "/admin/skills/reorder",
    { preHandler: fastify.authenticate },
    async (request, reply) => {
      await requireRole(request, reply, "EDITOR")
      const { ids } = request.body as { ids: string[] }
      if (!Array.isArray(ids)) return reply.status(400).send({ error: "ids must be an array" })
      await prisma.$transaction(
        ids.map((id, index) => prisma.skill.update({ where: { id }, data: { order: index } })),
      )
      return reply.status(204).send()
    },
  )

  // Admin: delete skill
  fastify.delete<{ Params: { id: string } }>(
    "/admin/skills/:id",
    { preHandler: fastify.authenticate },
    async (request, reply) => {
      await requireRole(request, reply, "EDITOR")
      const skill = await prisma.skill.findUnique({ where: { id: request.params.id } })
      if (!skill) return reply.status(404).send({ error: "Skill not found" })
      await prisma.skill.delete({ where: { id: request.params.id } })
      const user = request.user as { id: string }
      logActivity({ userId: user.id, action: "skill.deleted", entityType: "skill", entityId: skill.id, entityTitle: skill.name })
      return reply.status(204).send()
    },
  )
}
