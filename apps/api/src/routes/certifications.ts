import type { FastifyInstance } from "fastify"
import { z } from "zod"
import { prisma } from "@chronos/db"
import { requireRole } from "../utils/requireRole.js"
import { logActivity } from "../utils/activityLogger.js"

const getUserId = (request: import("fastify").FastifyRequest): string =>
  (request.user as { id?: string; sub?: string }).id ??
  (request.user as { sub?: string }).sub ??
  ""

const certSchema = z.object({
  title: z.string().min(1).max(200),
  issuer: z.string().min(1).max(200),
  issuedAt: z.string().datetime(),
  expiresAt: z.string().datetime().nullable().optional(),
  credentialUrl: z.string().url().max(500).nullable().optional(),
  logoUrl: z.string().max(500).nullable().optional(),
  order: z.number().int().optional(),
})

const reorderSchema = z.object({
  ids: z.array(z.string()).min(1),
})

const select = {
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
}

export const certificationsRoutes = async (fastify: FastifyInstance): Promise<void> => {
  // ── Public: list ──────────────────────────────────────────────────────────

  fastify.get("/certifications", async (_req, reply) => {
    const certs = await prisma.certification.findMany({
      orderBy: { order: "asc" },
      select,
    })
    return reply.send({ data: certs })
  })

  // ── Admin: list ───────────────────────────────────────────────────────────

  fastify.get("/admin/certifications", { preHandler: fastify.authenticate }, async (req, reply) => {
    if (!(await requireRole(req, reply, "EDITOR"))) return
    const certs = await prisma.certification.findMany({
      orderBy: { order: "asc" },
      select,
    })
    return reply.send({ data: certs })
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

    const maxOrder = await prisma.certification.aggregate({ _max: { order: true } })
    const nextOrder = (maxOrder._max.order ?? -1) + 1

    const cert = await prisma.certification.create({
      data: {
        title: parse.data.title,
        issuer: parse.data.issuer,
        issuedAt: new Date(parse.data.issuedAt),
        expiresAt: parse.data.expiresAt ? new Date(parse.data.expiresAt) : null,
        credentialUrl: parse.data.credentialUrl ?? null,
        logoUrl: parse.data.logoUrl ?? null,
        order: parse.data.order ?? nextOrder,
      },
      select,
    })

    logActivity({
      userId: getUserId(req),
      action: "certification.created",
      entityType: "certification",
      entityId: cert.id,
      entityTitle: cert.title,
    })

    return reply.status(201).send({ data: cert })
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

      const cert = await prisma.certification.update({
        where: { id: req.params.id },
        data: {
          ...(parse.data.title !== undefined && { title: parse.data.title }),
          ...(parse.data.issuer !== undefined && { issuer: parse.data.issuer }),
          ...(parse.data.issuedAt !== undefined && { issuedAt: new Date(parse.data.issuedAt) }),
          ...(parse.data.expiresAt !== undefined && {
            expiresAt: parse.data.expiresAt ? new Date(parse.data.expiresAt) : null,
          }),
          ...(parse.data.credentialUrl !== undefined && { credentialUrl: parse.data.credentialUrl }),
          ...(parse.data.logoUrl !== undefined && { logoUrl: parse.data.logoUrl }),
          ...(parse.data.order !== undefined && { order: parse.data.order }),
        },
        select,
      })

      logActivity({
        userId: getUserId(req),
        action: "certification.updated",
        entityType: "certification",
        entityId: cert.id,
        entityTitle: cert.title,
      })

      return reply.send({ data: cert })
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
