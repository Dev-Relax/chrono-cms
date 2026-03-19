import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { prisma } from "@chronos/db";
import { requireRole } from "../utils/requireRole.js";
import { logActivity } from "../utils/activityLogger.js";

const webhookSchema = z.object({
  name:   z.string().min(1).max(100),
  url:    z.string().url(),
  secret: z.string().max(255).optional().nullable(),
  events: z.array(z.string()).default([]),
  active: z.boolean().default(true),
});

export const webhooksRoutes = async (fastify: FastifyInstance): Promise<void> => {

  fastify.get(
    "/admin/webhooks",
    { preHandler: [fastify.authenticate] },
    async (request, reply) => {
      if (!await requireRole(request, reply, "ADMIN")) return;
      const hooks = await prisma.webhook.findMany({ orderBy: { createdAt: "desc" } });
      return reply.send({ data: hooks });
    }
  );

  fastify.post(
    "/admin/webhooks",
    { preHandler: [fastify.authenticate] },
    async (request, reply) => {
      if (!await requireRole(request, reply, "ADMIN")) return;

      const body = webhookSchema.safeParse(request.body);
      if (!body.success) {
        return reply.status(400).send({ error: "Validation failed", details: body.error.flatten() });
      }

      const { secret: createSecret, ...createRest } = body.data;
      const hook = await prisma.webhook.create({
        data: { ...createRest, ...(createSecret !== undefined && { secret: createSecret }) },
      });

      const payload = request.user as { sub: string };
      logActivity({ userId: payload.sub, action: "webhook.created", entityType: "webhook", entityId: hook.id, entityTitle: hook.name });

      return reply.status(201).send({ data: hook });
    }
  );

  fastify.put(
    "/admin/webhooks/:id",
    { preHandler: [fastify.authenticate] },
    async (request, reply) => {
      if (!await requireRole(request, reply, "ADMIN")) return;

      const { id } = request.params as { id: string };
      const body = webhookSchema.partial().safeParse(request.body);
      if (!body.success) {
        return reply.status(400).send({ error: "Validation failed", details: body.error.flatten() });
      }

      const existing = await prisma.webhook.findUnique({ where: { id } });
      if (!existing) return reply.status(404).send({ error: "Webhook not found" });

      const { secret: updateSecret, name: updateName, url: updateUrl, events: updateEvents, active: updateActive } = body.data;
      const hook = await prisma.webhook.update({
        where: { id },
        data: {
          ...(updateName    !== undefined && { name:    updateName }),
          ...(updateUrl     !== undefined && { url:     updateUrl }),
          ...(updateEvents  !== undefined && { events:  updateEvents }),
          ...(updateActive  !== undefined && { active:  updateActive }),
          ...(updateSecret  !== undefined && { secret:  updateSecret }),
        },
      });

      const payload = request.user as { sub: string };
      logActivity({ userId: payload.sub, action: "webhook.updated", entityType: "webhook", entityId: id, entityTitle: hook.name });

      return reply.send({ data: hook });
    }
  );

  fastify.delete(
    "/admin/webhooks/:id",
    { preHandler: [fastify.authenticate] },
    async (request, reply) => {
      if (!await requireRole(request, reply, "ADMIN")) return;

      const { id } = request.params as { id: string };
      const existing = await prisma.webhook.findUnique({ where: { id } });
      if (!existing) return reply.status(404).send({ error: "Webhook not found" });

      await prisma.webhook.delete({ where: { id } });

      const payload = request.user as { sub: string };
      logActivity({ userId: payload.sub, action: "webhook.deleted", entityType: "webhook", entityId: id, entityTitle: existing.name });

      return reply.status(204).send();
    }
  );

  fastify.post(
    "/admin/webhooks/:id/test",
    { preHandler: [fastify.authenticate] },
    async (request, reply) => {
      if (!await requireRole(request, reply, "ADMIN")) return;

      const { id } = request.params as { id: string };
      const hook = await prisma.webhook.findUnique({ where: { id } });
      if (!hook) return reply.status(404).send({ error: "Webhook not found" });

      const body = JSON.stringify({ event: "ping", timestamp: new Date().toISOString(), data: { message: "Test ping from Chronos CMS" } });
      const headers: Record<string, string> = {
        "Content-Type":    "application/json",
        "X-Webhook-Event": "ping",
        "User-Agent":      "ChronosCMS-Webhooks/1.0",
      };

      if (hook.secret) {
        const { createHmac } = await import("node:crypto");
        headers["X-Webhook-Signature"] = `sha256=${createHmac("sha256", hook.secret).update(body).digest("hex")}`;
      }

      try {
        const res = await fetch(hook.url, { method: "POST", headers, body });
        return reply.send({ ok: res.ok, status: res.status });
      } catch (err) {
        return reply.status(502).send({ error: `Could not reach ${hook.url}: ${(err as Error).message}` });
      }
    }
  );
};
