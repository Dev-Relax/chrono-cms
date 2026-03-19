import type { FastifyRequest, FastifyReply } from "fastify";

// Payload stored inside the JWT token
export type JwtPayload = {
  sub: string;   // user id
  email: string;
  role: "ADMIN" | "EDITOR";
};

// Fastify's augmented request after JWT verification
export type AuthRequest = FastifyRequest & {
  user: JwtPayload;
};

// Generic handler shorthand
export type Handler<
  B = unknown,
  P extends Record<string, string> = Record<string, string>,
  Q extends Record<string, string> = Record<string, string>,
> = (
  req: FastifyRequest<{ Body: B; Params: P; Querystring: Q }>,
  reply: FastifyReply
) => Promise<void>;
