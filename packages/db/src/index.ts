import { PrismaClient } from "@prisma/client"

// Singleton pattern: reuse the same client instance in development to avoid
// exhausting database connection pools during hot-module reloading.
declare global {
  // eslint-disable-next-line no-var
  var __prisma: PrismaClient | undefined
}

export const prisma: PrismaClient =
  global.__prisma ??
  new PrismaClient({
    log: process.env["NODE_ENV"] === "development" ? ["query", "warn", "error"] : ["warn", "error"],
  })

if (process.env["NODE_ENV"] !== "production") {
  global.__prisma = prisma
}

// Re-export generated types for convenience
export type { User, Post, Tag, PostTag, SiteSettings, Role, PostStatus } from "@prisma/client"
export { Prisma } from "@prisma/client"
