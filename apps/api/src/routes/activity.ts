import type { FastifyInstance } from "fastify";
import { prisma } from "@chronos/db";
import { requireRole } from "../utils/requireRole.js";

export const activityRoutes = async (fastify: FastifyInstance): Promise<void> => {

  fastify.get(
    "/admin/activity",
    { preHandler: [fastify.authenticate] },
    async (request, reply) => {
      if (!await requireRole(request, reply, "ADMIN")) return;

      const logs = await prisma.activityLog.findMany({
        orderBy: { createdAt: "desc" },
        take:    50,
        select: {
          id:          true,
          action:      true,
          entityType:  true,
          entityId:    true,
          entityTitle: true,
          createdAt:   true,
          user: { select: { id: true, name: true, email: true } },
        },
      });

      return reply.send({ data: logs });
    }
  );
};
