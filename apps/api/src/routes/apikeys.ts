import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { randomBytes, createHash } from "node:crypto";
import { prisma } from "@chronos/db";
import { requireRole } from "../utils/requireRole.js";
import { logActivity } from "../utils/activityLogger.js";

const createSchema = z.object({
  name: z.string().min(1).max(100),
});

/** Generate a unique API key: ck_<40 random hex chars> */
const generateKey = (): string => `ck_${randomBytes(20).toString("hex")}`;

/** SHA-256 hash of the raw key */
const hashKey = (raw: string): string => createHash("sha256").update(raw).digest("hex");

export const apiKeysRoutes = async (fastify: FastifyInstance): Promise<void> => {

  fastify.get(
    "/admin/apikeys",
    { preHandler: [fastify.authenticate] },
    async (request, reply) => {
      if (!await requireRole(request, reply, "ADMIN")) return;

      const keys = await prisma.apiKey.findMany({
        orderBy: { createdAt: "desc" },
        select: {
          id: true, name: true, prefix: true,
          lastUsedAt: true, createdAt: true,
          user: { select: { id: true, name: true, email: true } },
        },
      });

      return reply.send({ data: keys });
    }
  );

  fastify.post(
    "/admin/apikeys",
    { preHandler: [fastify.authenticate] },
    async (request, reply) => {
      if (!await requireRole(request, reply, "ADMIN")) return;

      const body = createSchema.safeParse(request.body);
      if (!body.success) {
        return reply.status(400).send({ error: "Validation failed", details: body.error.flatten() });
      }

      const payload = request.user as { sub: string };
      const rawKey = generateKey();

      const key = await prisma.apiKey.create({
        data: {
          name:    body.data.name,
          keyHash: hashKey(rawKey),
          prefix:  rawKey.slice(0, 11),   // "ck_" + first 8 hex chars
          userId:  payload.sub,
        },
        select: { id: true, name: true, prefix: true, createdAt: true },
      });

      logActivity({ userId: payload.sub, action: "apikey.created", entityType: "apikey", entityId: key.id, entityTitle: key.name });

      // rawKey is returned ONCE and never stored in plaintext
      return reply.status(201).send({ data: { ...key, key: rawKey } });
    }
  );

  fastify.delete(
    "/admin/apikeys/:id",
    { preHandler: [fastify.authenticate] },
    async (request, reply) => {
      if (!await requireRole(request, reply, "ADMIN")) return;

      const { id } = request.params as { id: string };
      const existing = await prisma.apiKey.findUnique({ where: { id } });
      if (!existing) return reply.status(404).send({ error: "API key not found" });

      await prisma.apiKey.delete({ where: { id } });

      const payload = request.user as { sub: string };
      logActivity({ userId: payload.sub, action: "apikey.deleted", entityType: "apikey", entityId: id, entityTitle: existing.name });

      return reply.status(204).send();
    }
  );
};
