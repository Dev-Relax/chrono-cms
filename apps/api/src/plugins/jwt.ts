import type { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import fp from "fastify-plugin";
import fastifyJwt from "@fastify/jwt";
import { createHash } from "node:crypto";
import { prisma } from "@chronos/db";
import { env } from "../env.js";

const isApiKey = (token: string): boolean => token.startsWith("ck_");

const hashKey = (raw: string): string => createHash("sha256").update(raw).digest("hex");

const jwtPlugin = async (fastify: FastifyInstance): Promise<void> => {
  await fastify.register(fastifyJwt, {
    secret: env.JWT_SECRET,
    sign: { expiresIn: env.JWT_EXPIRES_IN },
  });

  fastify.decorate(
    "authenticate",
    async (request: FastifyRequest, reply: FastifyReply): Promise<void> => {
      try {
        const authHeader = request.headers["authorization"];
        const xApiKey    = request.headers["x-api-key"] as string | undefined;
        const rawToken   = xApiKey ?? authHeader?.replace(/^Bearer\s+/i, "");

        if (!rawToken) {
          return reply.status(401).send({ error: "Unauthorized" });
        }

        if (isApiKey(rawToken)) {
          const hash = hashKey(rawToken);
          const record = await prisma.apiKey.findUnique({
            where:   { keyHash: hash },
            include: { user: { select: { id: true, email: true, role: true } } },
          });

          if (!record) {
            return reply.status(401).send({ error: "Invalid API key" });
          }

          // fire-and-forget — don't block the request
          void prisma.apiKey.update({
            where: { id: record.id },
            data:  { lastUsedAt: new Date() },
          }).catch(() => undefined);

          request.user = { sub: record.user.id, role: record.user.role, email: record.user.email };
        } else {
          await request.jwtVerify();
        }
      } catch {
        reply.status(401).send({ error: "Unauthorized" });
      }
    }
  );
};

export default fp(jwtPlugin, { name: "jwt" });
