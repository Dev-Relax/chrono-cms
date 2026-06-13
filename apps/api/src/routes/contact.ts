import type { FastifyInstance } from "fastify"
import { z } from "zod"
import { prisma } from "@chronos/db"
import { dispatchWebhook } from "../utils/webhookDispatcher.js"
import { requireRole } from "../utils/requireRole.js"

// token-bucket: 3 submissions per 60 s per IP
interface Bucket {
  tokens: number
  lastRefill: number
}

const RATE_LIMIT_MAX = 3
const RATE_LIMIT_WINDOW = 60_000
const rateBuckets = new Map<string, Bucket>()

const isRateLimited = (ip: string): boolean => {
  const now = Date.now()
  const bucket = rateBuckets.get(ip) ?? { tokens: RATE_LIMIT_MAX, lastRefill: now }

  if (now - bucket.lastRefill >= RATE_LIMIT_WINDOW) {
    bucket.tokens = RATE_LIMIT_MAX
    bucket.lastRefill = now
  }

  if (bucket.tokens <= 0) {
    rateBuckets.set(ip, bucket)
    return true
  }
  bucket.tokens -= 1
  rateBuckets.set(ip, bucket)
  return false
}

setInterval(() => {
  const cutoff = Date.now() - RATE_LIMIT_WINDOW * 2
  for (const [ip, bucket] of rateBuckets.entries()) {
    if (bucket.lastRefill < cutoff) rateBuckets.delete(ip)
  }
}, 5 * 60_000)

const sanitize = (raw: string): string =>
  raw
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#x27;")
    .trim()

const submitSchema = z.object({
  name: z.string().min(1).max(100),
  email: z.string().email(),
  subject: z.string().max(200).optional(),
  message: z.string().min(1).max(5000),
})

const moderateSchema = z.object({
  status: z.enum(["NEW", "READ", "ARCHIVED"]),
})

export const contactRoutes = async (fastify: FastifyInstance): Promise<void> => {
  // ── Public: submit a contact message ─────────────────────────────────────

  fastify.post("/contact", async (req, reply) => {
    const ip = req.ip ?? "unknown"
    if (isRateLimited(ip)) {
      return reply.status(429).send({ error: "Too many requests. Please wait before submitting again." })
    }

    const parse = submitSchema.safeParse(req.body)
    if (!parse.success) {
      return reply.status(400).send({ error: parse.error.issues[0]?.message ?? "Invalid input" })
    }

    const { name, email, subject, message } = parse.data

    const submission = await prisma.contactSubmission.create({
      data: {
        name: sanitize(name),
        email,
        subject: subject ? sanitize(subject) : null,
        message: sanitize(message),
        status: "NEW",
      },
      select: { id: true, name: true, email: true, subject: true, createdAt: true },
    })

    dispatchWebhook("contact.submitted", {
      id: submission.id,
      name: submission.name,
      email: submission.email,
      subject: submission.subject,
      createdAt: submission.createdAt,
    })

    return reply.status(201).send({
      data: submission,
      message: "Your message has been received. We'll get back to you soon.",
    })
  })

  // ── Admin: new submission count (for badge) ───────────────────────────────

  fastify.get(
    "/admin/contact/new-count",
    { preHandler: fastify.authenticate },
    async (_req, reply) => {
      const count = await prisma.contactSubmission.count({ where: { status: "NEW" } })
      return reply.send({ count })
    },
  )

  // ── Admin: list submissions ───────────────────────────────────────────────

  fastify.get("/admin/contact", { preHandler: fastify.authenticate }, async (req, reply) => {
    if (!(await requireRole(req, reply, "EDITOR"))) return

    const q = req.query as Record<string, string | undefined>
    const status = q["status"] as "NEW" | "READ" | "ARCHIVED" | undefined
    const page = Math.max(1, parseInt(q["page"] ?? "1", 10))
    const limit = Math.min(100, parseInt(q["limit"] ?? "50", 10))
    const skip = (page - 1) * limit

    const where = status ? { status } : {}

    const [total, submissions] = await Promise.all([
      prisma.contactSubmission.count({ where }),
      prisma.contactSubmission.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
      }),
    ])

    return reply.send({
      data: submissions,
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    })
  })

  // ── Admin: update status ──────────────────────────────────────────────────

  fastify.patch<{ Params: { id: string } }>(
    "/admin/contact/:id",
    { preHandler: fastify.authenticate },
    async (req, reply) => {
      if (!(await requireRole(req, reply, "EDITOR"))) return

      const parse = moderateSchema.safeParse(req.body)
      if (!parse.success) {
        return reply.status(400).send({ error: "Invalid status value" })
      }

      const sub = await prisma.contactSubmission.findUnique({ where: { id: req.params.id } })
      if (!sub) return reply.status(404).send({ error: "Submission not found" })

      const updated = await prisma.contactSubmission.update({
        where: { id: req.params.id },
        data: { status: parse.data.status },
      })

      return reply.send({ data: updated })
    },
  )

  // ── Admin: delete ─────────────────────────────────────────────────────────

  fastify.delete<{ Params: { id: string } }>(
    "/admin/contact/:id",
    { preHandler: fastify.authenticate },
    async (req, reply) => {
      if (!(await requireRole(req, reply, "EDITOR"))) return

      const sub = await prisma.contactSubmission.findUnique({ where: { id: req.params.id } })
      if (!sub) return reply.status(404).send({ error: "Submission not found" })

      await prisma.contactSubmission.delete({ where: { id: req.params.id } })
      return reply.status(204).send()
    },
  )
}
