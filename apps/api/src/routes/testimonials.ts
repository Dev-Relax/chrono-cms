import type { FastifyInstance } from "fastify"
import { z } from "zod"
import { prisma } from "@chronos/db"
import { requireRole } from "../utils/requireRole.js"
import { logActivity } from "../utils/activityLogger.js"

const testimonialSchema = z.object({
  author: z.string().min(1).max(255),
  role: z.string().max(255).optional(),
  company: z.string().max(255).optional(),
  avatarUrl: z.string().max(500).optional(),
  content: z.string().min(1).max(2000),
  rating: z.number().int().min(1).max(5).optional(),
  featured: z.boolean().optional(),
  visible: z.boolean().optional(),
  order: z.number().int().optional(),
})

const getUserId = (request: { user: unknown }): string =>
  (request.user as { id?: string; sub?: string }).id ??
  (request.user as { sub?: string }).sub ??
  ""

export const testimonialsRoutes = async (fastify: FastifyInstance) => {
  // Public: list visible testimonials, optionally filtered by featured
  fastify.get("/testimonials", async (request, reply) => {
    const q = request.query as Record<string, string | undefined>
    const featuredOnly = q["featured"] === "true" || q["featured"] === "1"

    const testimonials = await prisma.testimonial.findMany({
      where: {
        visible: true,
        ...(featuredOnly ? { featured: true } : {}),
      },
      orderBy: [{ featured: "desc" }, { order: "asc" }, { createdAt: "desc" }],
    })
    return reply.send({ data: testimonials })
  })

  // Admin: list all (including hidden)
  fastify.get(
    "/admin/testimonials",
    { preHandler: [fastify.authenticate] },
    async (request, reply) => {
      if (!(await requireRole(request, reply, "EDITOR"))) return
      const testimonials = await prisma.testimonial.findMany({
        orderBy: [{ order: "asc" }, { createdAt: "desc" }],
      })
      return reply.send({ data: testimonials })
    },
  )

  // Admin: create
  fastify.post(
    "/admin/testimonials",
    { preHandler: [fastify.authenticate] },
    async (request, reply) => {
      if (!(await requireRole(request, reply, "EDITOR"))) return
      const parsed = testimonialSchema.safeParse(request.body)
      if (!parsed.success)
        return reply.status(400).send({ error: parsed.error.issues[0]?.message })
      const d = parsed.data
      const t = await prisma.testimonial.create({
        data: {
          author: d.author,
          role: d.role ?? null,
          company: d.company ?? null,
          avatarUrl: d.avatarUrl ?? null,
          content: d.content,
          rating: d.rating ?? 5,
          featured: d.featured ?? false,
          visible: d.visible ?? true,
          order: d.order ?? 0,
        },
      })
      logActivity({
        userId: getUserId(request),
        action: "testimonial.created",
        entityType: "testimonial",
        entityId: t.id,
        entityTitle: t.author,
      })
      return reply.status(201).send({ data: t })
    },
  )

  // Admin: reorder (before :id)
  fastify.put(
    "/admin/testimonials/reorder",
    { preHandler: [fastify.authenticate] },
    async (request, reply) => {
      if (!(await requireRole(request, reply, "EDITOR"))) return
      const { ids } = request.body as { ids: string[] }
      if (!Array.isArray(ids)) return reply.status(400).send({ error: "ids must be an array" })
      await prisma.$transaction(
        ids.map((id, index) =>
          prisma.testimonial.update({ where: { id }, data: { order: index } }),
        ),
      )
      return reply.status(204).send()
    },
  )

  // Admin: update
  fastify.put<{ Params: { id: string } }>(
    "/admin/testimonials/:id",
    { preHandler: [fastify.authenticate] },
    async (request, reply) => {
      if (!(await requireRole(request, reply, "EDITOR"))) return
      const parsed = testimonialSchema.partial().safeParse(request.body)
      if (!parsed.success)
        return reply.status(400).send({ error: parsed.error.issues[0]?.message })
      const t = await prisma.testimonial.update({
        where: { id: request.params.id },
        data: {
          ...(parsed.data.author !== undefined && { author: parsed.data.author }),
          ...(parsed.data.role !== undefined && { role: parsed.data.role }),
          ...(parsed.data.company !== undefined && { company: parsed.data.company }),
          ...(parsed.data.avatarUrl !== undefined && { avatarUrl: parsed.data.avatarUrl }),
          ...(parsed.data.content !== undefined && { content: parsed.data.content }),
          ...(parsed.data.rating !== undefined && { rating: parsed.data.rating }),
          ...(parsed.data.featured !== undefined && { featured: parsed.data.featured }),
          ...(parsed.data.visible !== undefined && { visible: parsed.data.visible }),
          ...(parsed.data.order !== undefined && { order: parsed.data.order }),
        },
      })
      logActivity({
        userId: getUserId(request),
        action: "testimonial.updated",
        entityType: "testimonial",
        entityId: t.id,
        entityTitle: t.author,
      })
      return reply.send({ data: t })
    },
  )

  // Admin: delete
  fastify.delete<{ Params: { id: string } }>(
    "/admin/testimonials/:id",
    { preHandler: [fastify.authenticate] },
    async (request, reply) => {
      if (!(await requireRole(request, reply, "EDITOR"))) return
      const t = await prisma.testimonial.findUnique({
        where: { id: request.params.id },
        select: { id: true, author: true },
      })
      if (!t) return reply.status(404).send({ error: "Testimonial not found" })
      await prisma.testimonial.delete({ where: { id: request.params.id } })
      logActivity({
        userId: getUserId(request),
        action: "testimonial.deleted",
        entityType: "testimonial",
        entityId: t.id,
        entityTitle: t.author,
      })
      return reply.status(204).send()
    },
  )
}
