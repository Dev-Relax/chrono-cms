import type { FastifyInstance } from "fastify"
import { z } from "zod"
import { prisma } from "@chronos/db"
import { requireRole } from "../utils/requireRole.js"

// ── Rate limiter (token bucket) ───────────────────────────────────────────────
// 120 req/min/IP: generous enough for SPA navigation, blocks bots.

interface Bucket {
  tokens: number
  lastRefill: number
}

const RATE_LIMIT_MAX = 120
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

// ── Helpers ───────────────────────────────────────────────────────────────────

const getDevice = (ua: string): "mobile" | "tablet" | "desktop" => {
  if (/iPad|Tablet/i.test(ua)) return "tablet"
  if (/Mobile|Android|iPhone/i.test(ua)) return "mobile"
  return "desktop"
}

const getReferrerDomain = (ref: string | null | undefined): string | null => {
  if (!ref) return null
  try {
    return new URL(ref).hostname
  } catch {
    return null
  }
}

const getPeriodSince = (period: string): Date | null => {
  const days: Record<string, number> = { "7d": 7, "30d": 30, "90d": 90 }
  const d = days[period]
  return d != null ? new Date(Date.now() - d * 86_400_000) : null
}

// ── Validation schemas ────────────────────────────────────────────────────────

const pageViewSchema = z.object({
  path: z.string().min(1).max(500),
  referrer: z.string().max(500).optional().nullable(),
  locale: z.string().max(20).optional().nullable(),
  sessionId: z.string().uuid(),
  postId: z.string().optional().nullable(),
  projectId: z.string().optional().nullable(),
})

const eventSchema = z.object({
  type: z.enum(["outbound_click", "read_complete", "project_click", "contact_open"]),
  path: z.string().min(1).max(500),
  target: z.string().max(500).optional().nullable(),
  sessionId: z.string().uuid(),
})

// ── Routes ────────────────────────────────────────────────────────────────────

export const analyticsRoutes = async (fastify: FastifyInstance): Promise<void> => {
  // ── Public: record a page view ────────────────────────────────────────────

  fastify.post("/insights/pageview", async (req, reply) => {
    if (isRateLimited(req.ip ?? "unknown")) {
      return reply.status(429).send({ error: "Too many requests" })
    }

    const parse = pageViewSchema.safeParse(req.body)
    if (!parse.success) {
      return reply.status(400).send({ error: parse.error.issues[0]?.message ?? "Invalid input" })
    }

    const { path, referrer, locale, sessionId, postId, projectId } = parse.data
    const device = getDevice(req.headers["user-agent"] ?? "")
    const referrerDomain = getReferrerDomain(referrer)

    await prisma.analyticsPageView.create({
      data: {
        path,
        referrer: referrerDomain,
        locale: locale ?? null,
        device,
        sessionId,
        postId: postId ?? null,
        projectId: projectId ?? null,
      },
    })

    return reply.status(201).send({ ok: true })
  })

  // ── Public: record a custom event ─────────────────────────────────────────

  fastify.post("/insights/event", async (req, reply) => {
    if (isRateLimited(req.ip ?? "unknown")) {
      return reply.status(429).send({ error: "Too many requests" })
    }

    const parse = eventSchema.safeParse(req.body)
    if (!parse.success) {
      return reply.status(400).send({ error: parse.error.issues[0]?.message ?? "Invalid input" })
    }

    const { type, path, target, sessionId } = parse.data

    await prisma.analyticsEvent.create({
      data: { type, path, target: target ?? null, sessionId },
    })

    return reply.status(201).send({ ok: true })
  })

  // ── Admin: overview ───────────────────────────────────────────────────────
  // GET /analytics/overview?period=7d|30d|90d|all

  fastify.get("/insights/overview", { preHandler: fastify.authenticate }, async (req, reply) => {
    if (!(await requireRole(req, reply, "EDITOR"))) return

    const q = req.query as Record<string, string | undefined>
    const since = getPeriodSince(q["period"] ?? "30d")
    const pvWhere = since ? { createdAt: { gte: since } } : {}
    const evWhere = since ? { createdAt: { gte: since } } : {}

    const [allPageViews, topPages, referrerGroups, deviceGroups, totalEvents] = await Promise.all([
      prisma.analyticsPageView.findMany({
        where: pvWhere,
        select: { sessionId: true, createdAt: true },
        orderBy: { createdAt: "asc" },
      }),
      prisma.analyticsPageView.groupBy({
        by: ["path"],
        where: pvWhere,
        _count: { path: true },
        orderBy: { _count: { path: "desc" } },
        take: 10,
      }),
      prisma.analyticsPageView.groupBy({
        by: ["referrer"],
        where: { ...pvWhere, referrer: { not: null } },
        _count: { referrer: true },
        orderBy: { _count: { referrer: "desc" } },
        take: 10,
      }),
      prisma.analyticsPageView.groupBy({
        by: ["device"],
        where: pvWhere,
        _count: { device: true },
      }),
      prisma.analyticsEvent.count({ where: evWhere }),
    ])

    // Aggregate time series in JS — acceptable at personal portfolio scale
    const byDay = new Map<string, { visitors: Set<string>; views: number }>()
    for (const pv of allPageViews) {
      const day = pv.createdAt.toISOString().slice(0, 10)
      if (!byDay.has(day)) byDay.set(day, { visitors: new Set(), views: 0 })
      const slot = byDay.get(day)!
      slot.visitors.add(pv.sessionId)
      slot.views++
    }

    const timeSeries = [...byDay.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, slot]) => ({ date, visitors: slot.visitors.size, pageViews: slot.views }))

    const uniqueVisitors = new Set(allPageViews.map((v) => v.sessionId)).size

    return reply.send({
      data: {
        summary: {
          uniqueVisitors,
          totalPageViews: allPageViews.length,
          totalEvents,
        },
        timeSeries,
        topPages: topPages.map((g) => ({ path: g.path, views: g._count.path })),
        referrers: referrerGroups.map((g) => ({
          referrer: g.referrer,
          count: g._count.referrer,
        })),
        devices: deviceGroups.map((g) => ({
          device: g.device ?? "unknown",
          count: g._count.device,
        })),
      },
    })
  })

  // ── Admin: per-content stats ──────────────────────────────────────────────
  // GET /analytics/content?period=7d|30d|90d|all

  fastify.get("/insights/content", { preHandler: fastify.authenticate }, async (req, reply) => {
    if (!(await requireRole(req, reply, "EDITOR"))) return

    const q = req.query as Record<string, string | undefined>
    const since = getPeriodSince(q["period"] ?? "30d")
    const where = since ? { createdAt: { gte: since } } : {}

    const [postViewGroups, projectViewGroups, readEvents, outboundEvents] = await Promise.all([
      prisma.analyticsPageView.groupBy({
        by: ["postId"],
        where: { ...where, postId: { not: null } },
        _count: { postId: true },
        orderBy: { _count: { postId: "desc" } },
        take: 20,
      }),
      prisma.analyticsPageView.groupBy({
        by: ["projectId"],
        where: { ...where, projectId: { not: null } },
        _count: { projectId: true },
        orderBy: { _count: { projectId: "desc" } },
        take: 20,
      }),
      prisma.analyticsEvent.groupBy({
        by: ["path"],
        where: { ...where, type: "read_complete" },
        _count: { path: true },
      }),
      prisma.analyticsEvent.groupBy({
        by: ["path"],
        where: { ...where, type: "outbound_click" },
        _count: { path: true },
      }),
    ])

    // Resolve post titles from their IDs
    const postIds = postViewGroups.map((g) => g.postId).filter((id): id is string => id != null)
    const posts = postIds.length
      ? await prisma.post.findMany({
          where: { id: { in: postIds } },
          select: {
            id: true,
            defaultLocale: true,
            translations: { select: { locale: true, title: true, slug: true } },
          },
        })
      : []

    const postMeta = new Map(
      posts.map((p) => {
        const def = p.translations.find((t) => t.locale === p.defaultLocale) ?? p.translations[0]
        return [p.id, { title: def?.title ?? "", slug: def?.slug ?? "" }]
      }),
    )

    const readByPath = new Map(readEvents.map((g) => [g.path, g._count.path]))

    const postStats = postViewGroups.map((g) => {
      const meta = postMeta.get(g.postId!) ?? { title: "", slug: "" }
      const readCompletions = readByPath.get(`/blog/${meta.slug}`) ?? 0
      const views = g._count.postId
      return {
        postId: g.postId,
        title: meta.title,
        slug: meta.slug,
        views,
        readCompletions,
        completionRate: views > 0 ? Math.round((readCompletions / views) * 100) : 0,
      }
    })

    // Resolve project titles from their IDs
    const projectIds = projectViewGroups
      .map((g) => g.projectId)
      .filter((id): id is string => id != null)
    const projects = projectIds.length
      ? await prisma.project.findMany({
          where: { id: { in: projectIds } },
          select: {
            id: true,
            defaultLocale: true,
            translations: { select: { locale: true, title: true, slug: true } },
          },
        })
      : []

    const projectMeta = new Map(
      projects.map((p) => {
        const def = p.translations.find((t) => t.locale === p.defaultLocale) ?? p.translations[0]
        return [p.id, { title: def?.title ?? "", slug: def?.slug ?? "" }]
      }),
    )

    const outboundByPath = new Map(outboundEvents.map((g) => [g.path, g._count.path]))

    const projectStats = projectViewGroups.map((g) => {
      const meta = projectMeta.get(g.projectId!) ?? { title: "", slug: "" }
      return {
        projectId: g.projectId,
        title: meta.title,
        slug: meta.slug,
        views: g._count.projectId,
        outboundClicks: outboundByPath.get(`/projects/${meta.slug}`) ?? 0,
      }
    })

    return reply.send({ data: { posts: postStats, projects: projectStats } })
  })

  // ── Admin: event breakdown ────────────────────────────────────────────────
  // GET /analytics/events?period=7d|30d|90d|all

  fastify.get("/insights/events", { preHandler: fastify.authenticate }, async (req, reply) => {
    if (!(await requireRole(req, reply, "EDITOR"))) return

    const q = req.query as Record<string, string | undefined>
    const since = getPeriodSince(q["period"] ?? "30d")
    const where = since ? { createdAt: { gte: since } } : {}

    const [byType, topTargets] = await Promise.all([
      prisma.analyticsEvent.groupBy({
        by: ["type"],
        where,
        _count: { type: true },
        orderBy: { _count: { type: "desc" } },
      }),
      prisma.analyticsEvent.groupBy({
        by: ["target"],
        where: { ...where, target: { not: null } },
        _count: { target: true },
        orderBy: { _count: { target: "desc" } },
        take: 20,
      }),
    ])

    return reply.send({
      data: {
        byType: byType.map((g) => ({ type: g.type, count: g._count.type })),
        topTargets: topTargets.map((g) => ({ target: g.target, count: g._count.target })),
      },
    })
  })
}
