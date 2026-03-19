import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { prisma } from "@chronos/db";

// token-bucket: 5 comments per 60 s per IP
interface Bucket {
  tokens: number;
  lastRefill: number;
}

const RATE_LIMIT_MAX    = 5;
const RATE_LIMIT_WINDOW = 60_000;
const rateBuckets       = new Map<string, Bucket>();

const isRateLimited = (ip: string): boolean => {
  const now    = Date.now();
  const bucket = rateBuckets.get(ip) ?? { tokens: RATE_LIMIT_MAX, lastRefill: now };

  if (now - bucket.lastRefill >= RATE_LIMIT_WINDOW) {
    bucket.tokens    = RATE_LIMIT_MAX;
    bucket.lastRefill = now;
  }

  if (bucket.tokens <= 0) {
    rateBuckets.set(ip, bucket);
    return true;
  }

  bucket.tokens -= 1;
  rateBuckets.set(ip, bucket);
  return false;
};

// Prune stale buckets every 5 minutes to avoid unbounded growth
setInterval(() => {
  const cutoff = Date.now() - RATE_LIMIT_WINDOW * 2;
  for (const [ip, bucket] of rateBuckets.entries()) {
    if (bucket.lastRefill < cutoff) rateBuckets.delete(ip);
  }
}, 5 * 60_000);

const sanitize = (raw: string): string =>
  raw
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#x27;")
    .trim();


const submitCommentSchema = z.object({
  content:     z.string().min(1, "Comment cannot be empty").max(2000),
  authorName:  z.string().min(1).max(100),
  authorEmail: z.string().email(),
  parentId:    z.string().cuid().optional(),
});

const moderateSchema = z.object({
  status: z.enum(["PENDING", "APPROVED", "SPAM", "REJECTED"]),
});

const bulkSchema = z.object({
  action: z.enum(["approve", "reject", "spam", "delete"]),
  ids:    z.array(z.string().cuid()).min(1).max(200),
});

interface FlatComment {
  id:          string;
  content:     string;
  authorName:  string;
  status:      string;
  parentId:    string | null;
  createdAt:   Date;
  updatedAt:   Date;
  replies?:    FlatComment[];
}

const buildTree = (flat: FlatComment[]): FlatComment[] => {
  const map = new Map<string, FlatComment>();
  const roots: FlatComment[] = [];

  for (const c of flat) {
    map.set(c.id, { ...c, replies: [] });
  }
  for (const c of map.values()) {
    if (c.parentId && map.has(c.parentId)) {
      map.get(c.parentId)!.replies!.push(c);
    } else {
      roots.push(c);
    }
  }
  return roots;
};

export const commentsRoutes = async (fastify: FastifyInstance): Promise<void> => {

  fastify.get<{ Params: { postId: string } }>(
    "/posts/:postId/comments",
    async (req, reply) => {
      const { postId } = req.params;

      const flat = await prisma.comment.findMany({
        where:   { postId, status: "APPROVED" },
        orderBy: { createdAt: "asc" },
        select: {
          id:         true,
          content:    true,
          authorName: true,
          status:     true,
          parentId:   true,
          createdAt:  true,
          updatedAt:  true,
        },
      });

      return reply.send({ data: buildTree(flat) });
    }
  );

  fastify.post<{ Params: { postId: string } }>(
    "/posts/:postId/comments",
    async (req, reply) => {
      const { postId } = req.params;
      const ip = req.ip ?? "unknown";

      if (isRateLimited(ip)) {
        return reply
          .status(429)
          .send({ error: "Too many comments. Please wait before posting again." });
      }

      const parse = submitCommentSchema.safeParse(req.body);
      if (!parse.success) {
        return reply.status(400).send({ error: parse.error.issues[0]?.message ?? "Invalid input" });
      }
      const { content, authorName, authorEmail, parentId } = parse.data;

      const post = await prisma.post.findFirst({
        where:  { id: postId, status: "PUBLISHED" },
        select: { id: true },
      });
      if (!post) return reply.status(404).send({ error: "Post not found" });

      if (parentId) {
        const parent = await prisma.comment.findFirst({
          where:  { id: parentId, postId },
          select: { id: true },
        });
        if (!parent) return reply.status(400).send({ error: "Invalid parent comment" });
      }

      const safeContent    = sanitize(content);
      const safeAuthorName = sanitize(authorName);

      const comment = await prisma.comment.create({
        data: {
          content:     safeContent,
          authorName:  safeAuthorName,
          authorEmail,
          status:      "PENDING",
          postId,
          parentId:    parentId ?? null,
        },
        select: {
          id:         true,
          content:    true,
          authorName: true,
          status:     true,
          parentId:   true,
          createdAt:  true,
        },
      });

      return reply.status(201).send({
        data:    comment,
        message: "Comment submitted and awaiting moderation.",
      });
    }
  );

  fastify.get(
    "/admin/comments/pending-count",
    { preHandler: fastify.authenticate },
    async (_req, reply) => {
      const count = await prisma.comment.count({ where: { status: "PENDING" } });
      return reply.send({ count });
    }
  );

  fastify.get(
    "/admin/comments",
    { preHandler: fastify.authenticate },
    async (req, reply) => {
      const query  = req.query as Record<string, string | undefined>;
      const status = query["status"] as "PENDING" | "APPROVED" | "SPAM" | "REJECTED" | undefined;
      const postId = query["postId"];
      const page   = Math.max(1, parseInt(query["page"] ?? "1", 10));
      const limit  = Math.min(100, parseInt(query["limit"] ?? "50", 10));
      const skip   = (page - 1) * limit;

      const where = {
        ...(status ? { status } : {}),
        ...(postId ? { postId } : {}),
      };

      const [total, comments] = await Promise.all([
        prisma.comment.count({ where }),
        prisma.comment.findMany({
          where,
          orderBy: { createdAt: "desc" },
          skip,
          take: limit,
          select: {
            id:          true,
            content:     true,
            authorName:  true,
            authorEmail: true,
            status:      true,
            parentId:    true,
            createdAt:   true,
            updatedAt:   true,
            post: {
              select: { id: true, defaultLocale: true, translations: { select: { locale: true, title: true, slug: true } } },
            },
          },
        }),
      ]);

      return reply.send({
        data: comments,
        meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
      });
    }
  );

  fastify.patch<{ Params: { id: string } }>(
    "/admin/comments/:id",
    { preHandler: fastify.authenticate },
    async (req, reply) => {
      const parse = moderateSchema.safeParse(req.body);
      if (!parse.success) {
        return reply.status(400).send({ error: "Invalid status value" });
      }

      const comment = await prisma.comment.findUnique({ where: { id: req.params.id } });
      if (!comment) return reply.status(404).send({ error: "Comment not found" });

      const updated = await prisma.comment.update({
        where: { id: req.params.id },
        data:  { status: parse.data.status },
        select: {
          id:         true,
          status:     true,
          authorName: true,
          updatedAt:  true,
        },
      });

      return reply.send({ data: updated });
    }
  );

  fastify.delete<{ Params: { id: string } }>(
    "/admin/comments/:id",
    { preHandler: fastify.authenticate },
    async (req, reply) => {
      const comment = await prisma.comment.findUnique({ where: { id: req.params.id } });
      if (!comment) return reply.status(404).send({ error: "Comment not found" });

      // Cascades to replies via onDelete: Cascade
      await prisma.comment.delete({ where: { id: req.params.id } });
      return reply.status(204).send();
    }
  );

  fastify.post(
    "/admin/comments/bulk",
    { preHandler: fastify.authenticate },
    async (req, reply) => {
      const parse = bulkSchema.safeParse(req.body);
      if (!parse.success) {
        return reply.status(400).send({ error: parse.error.issues[0]?.message ?? "Invalid input" });
      }
      const { action, ids } = parse.data;

      let affected = 0;

      if (action === "delete") {
        const result = await prisma.comment.deleteMany({ where: { id: { in: ids } } });
        affected = result.count;
      } else {
        const statusMap = {
          approve: "APPROVED",
          reject:  "REJECTED",
          spam:    "SPAM",
        } as const;

        const result = await prisma.comment.updateMany({
          where: { id: { in: ids } },
          data:  { status: statusMap[action] },
        });
        affected = result.count;
      }

      return reply.send({ affected });
    }
  );
};
