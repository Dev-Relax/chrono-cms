import type { FastifyInstance } from "fastify";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "@chronos/db";

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

// 10 attempts per 15 min per IP
const loginBuckets = new Map<string, { count: number; resetAt: number }>();
const isLoginLimited = (ip: string): boolean => {
  const now = Date.now();
  const bucket = loginBuckets.get(ip);
  if (!bucket || now > bucket.resetAt) {
    loginBuckets.set(ip, { count: 1, resetAt: now + 15 * 60_000 });
    return false;
  }
  bucket.count += 1;
  return bucket.count > 10;
};

export const authRoutes = async (fastify: FastifyInstance): Promise<void> => {
  fastify.post("/auth/login", async (request, reply) => {
    if (isLoginLimited(request.ip)) {
      return reply.status(429).send({ error: "Too many login attempts. Try again later." });
    }

    const body = loginSchema.safeParse(request.body);
    if (!body.success) {
      return reply.status(400).send({ error: "Invalid request body", details: body.error.flatten() });
    }

    const user = await prisma.user.findUnique({ where: { email: body.data.email } });
    if (!user) {
      return reply.status(401).send({ error: "Invalid credentials" });
    }

    const valid = await bcrypt.compare(body.data.password, user.password);
    if (!valid) {
      return reply.status(401).send({ error: "Invalid credentials" });
    }

    const token = fastify.jwt.sign({
      sub: user.id,
      email: user.email,
      role: user.role,
    });

    return reply.send({
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
      },
    });
  });

  fastify.get(
    "/auth/me",
    { preHandler: [fastify.authenticate] },
    async (request, reply) => {
      const payload = request.user as { sub: string };
      const user = await prisma.user.findUnique({
        where: { id: payload.sub },
        select: { id: true, email: true, name: true, role: true, createdAt: true },
      });

      if (!user) return reply.status(404).send({ error: "User not found" });
      return reply.send({ user });
    }
  );
};
