import type { FastifyRequest, FastifyReply } from "fastify"

type Role = "ADMIN" | "EDITOR" | "AUTHOR"

const RANK: Record<Role, number> = { ADMIN: 3, EDITOR: 2, AUTHOR: 1 }

/**
 * Checks that the authenticated user has at least `minRole`.
 * Returns true if authorized; sends 403 and returns false otherwise.
 * Must be called AFTER fastify.authenticate has run.
 */
export const requireRole = async (
  request: FastifyRequest,
  reply: FastifyReply,
  minRole: Role,
): Promise<boolean> => {
  const payload = request.user as { sub: string; role: Role } | undefined
  const rank = payload?.role ? (RANK[payload.role] ?? 0) : 0
  if (rank < RANK[minRole]) {
    await reply.status(403).send({ error: "Insufficient permissions" })
    return false
  }
  return true
}

/**
 * Returns true if the authenticated user is the owner of a resource.
 * Useful for AUTHOR-level access (can edit own content only).
 */
export const isOwnerOrMinRole = (
  request: FastifyRequest,
  ownerId: string,
  minRole: Role = "EDITOR",
): boolean => {
  const payload = request.user as { sub: string; role: Role } | undefined
  if (!payload) return false
  if ((RANK[payload.role] ?? 0) >= RANK[minRole]) return true
  return payload.sub === ownerId
}
