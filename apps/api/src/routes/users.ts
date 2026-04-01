import type { FastifyInstance } from "fastify"
import bcrypt from "bcryptjs"
import { z } from "zod"
import { prisma } from "@chronos/db"
import { requireRole } from "../utils/requireRole.js"

const userSelect = {
  id: true,
  email: true,
  name: true,
  role: true,
  createdAt: true,
  updatedAt: true,
} as const

export const usersRoutes = async (fastify: FastifyInstance): Promise<void> => {
  fastify.get("/admin/users", { preHandler: [fastify.authenticate] }, async (request, reply) => {
    if (!(await requireRole(request, reply, "ADMIN"))) return

    const users = await prisma.user.findMany({
      select: userSelect,
      orderBy: { createdAt: "asc" },
    })
    return reply.send({ data: users })
  })

  fastify.post("/admin/users", { preHandler: [fastify.authenticate] }, async (request, reply) => {
    if (!(await requireRole(request, reply, "ADMIN"))) return

    const body = z
      .object({
        email: z.string().email(),
        password: z.string().min(8),
        name: z.string().optional(),
        role: z.enum(["ADMIN", "EDITOR", "AUTHOR"]).default("EDITOR"),
      })
      .safeParse(request.body)

    if (!body.success) {
      return reply.status(400).send({ error: "Validation failed", details: body.error.flatten() })
    }

    const existing = await prisma.user.findUnique({
      where: { email: body.data.email },
    })
    if (existing) {
      return reply.status(409).send({ error: "Email already in use" })
    }

    const hashed = await bcrypt.hash(body.data.password, 12)
    const user = await prisma.user.create({
      data: {
        email: body.data.email,
        password: hashed,
        name: body.data.name ?? null,
        role: body.data.role,
      },
      select: userSelect,
    })

    return reply.status(201).send({ data: user })
  })

  fastify.put(
    "/admin/users/:id",
    { preHandler: [fastify.authenticate] },
    async (request, reply) => {
      if (!(await requireRole(request, reply, "ADMIN"))) return

      const { id } = request.params as { id: string }

      const body = z
        .object({
          name: z.string().optional(),
          role: z.enum(["ADMIN", "EDITOR", "AUTHOR"]).optional(),
          password: z.string().min(8).optional(),
        })
        .safeParse(request.body)

      if (!body.success) {
        return reply.status(400).send({ error: "Validation failed", details: body.error.flatten() })
      }

      const existing = await prisma.user.findUnique({ where: { id } })
      if (!existing) return reply.status(404).send({ error: "User not found" })

      const { name, role, password } = body.data
      const hashedPassword = password ? await bcrypt.hash(password, 12) : undefined

      const user = await prisma.user.update({
        where: { id },
        data: {
          ...(name !== undefined && { name }),
          ...(role !== undefined && { role }),
          ...(hashedPassword && { password: hashedPassword }),
        },
        select: userSelect,
      })

      return reply.send({ data: user })
    },
  )

  fastify.delete(
    "/admin/users/:id",
    { preHandler: [fastify.authenticate] },
    async (request, reply) => {
      if (!(await requireRole(request, reply, "ADMIN"))) return

      const { id } = request.params as { id: string }
      const self = (request.user as { sub: string }).sub

      if (id === self) {
        return reply.status(400).send({ error: "Cannot delete your own account" })
      }

      const existing = await prisma.user.findUnique({ where: { id } })
      if (!existing) return reply.status(404).send({ error: "User not found" })

      await prisma.user.delete({ where: { id } })
      return reply.status(204).send()
    },
  )
}
