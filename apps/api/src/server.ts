import Fastify from "fastify"
import cors from "@fastify/cors"
import multipart from "@fastify/multipart"
import staticFiles from "@fastify/static"
import { prisma } from "@chronos/db"
import { env } from "./env.js"
import jwtPlugin from "./plugins/jwt.js"
import { authRoutes } from "./routes/auth.js"
import { postsRoutes } from "./routes/posts.js"
import { settingsRoutes } from "./routes/settings.js"
import { rssRoutes } from "./routes/rss.js"
import { mediaRoutes, UPLOADS_DIR } from "./routes/media.js"
import { usersRoutes } from "./routes/users.js"
import { pagesRoutes } from "./routes/pages.js"
import { webhooksRoutes } from "./routes/webhooks.js"
import { apiKeysRoutes } from "./routes/apikeys.js"
import { activityRoutes } from "./routes/activity.js"
import { statsRoutes } from "./routes/stats.js"
import { commentsRoutes } from "./routes/comments.js"

const buildApp = async () => {
  const fastify = Fastify({
    logger: {
      level: env.NODE_ENV === "production" ? "info" : "debug",
      ...(env.NODE_ENV !== "production" && {
        transport: { target: "pino-pretty", options: { colorize: true } },
      }),
    },
  })

  await fastify.register(cors, {
    origin: env.CORS_ORIGIN.split(",").map((o) => o.trim()),
    credentials: true,
  })

  await fastify.register(jwtPlugin)

  await fastify.register(multipart, {
    limits: { fileSize: 10 * 1024 * 1024 },
  })

  await fastify.register(staticFiles, {
    root: UPLOADS_DIR,
    prefix: "/uploads/",
    decorateReply: false,
  })

  await fastify.register(authRoutes)
  await fastify.register(postsRoutes)
  await fastify.register(pagesRoutes)
  await fastify.register(settingsRoutes)
  await fastify.register(webhooksRoutes)
  await fastify.register(apiKeysRoutes)
  await fastify.register(activityRoutes)
  await fastify.register(statsRoutes)
  await fastify.register(commentsRoutes)
  await fastify.register(rssRoutes)
  await fastify.register(mediaRoutes)
  await fastify.register(usersRoutes)

  fastify.get("/health", async (_req, reply) => {
    return reply.send({ status: "ok", ts: new Date().toISOString() })
  })

  return fastify
}

// publish scheduled posts every 60 s
const startScheduler = () => {
  const run = async () => {
    try {
      const result = await prisma.post.updateMany({
        where: { status: "DRAFT", scheduledAt: { lte: new Date() } },
        data: { status: "PUBLISHED", publishedAt: new Date() },
      })
      if (result.count > 0) {
        console.log(`[scheduler] Published ${result.count} scheduled post(s)`)
      }
    } catch (err) {
      console.error("[scheduler] Error:", err)
    }
  }
  void run()
  setInterval(() => void run(), 60_000)
}

const start = async (): Promise<void> => {
  const app = await buildApp()
  try {
    await app.listen({ port: env.API_PORT, host: "0.0.0.0" })
    app.log.info(`🚀  API ready at http://0.0.0.0:${env.API_PORT}`)
    startScheduler()
  } catch (err) {
    app.log.error(err)
    process.exit(1)
  }
}

start()

declare module "fastify" {
  interface FastifyInstance {
    authenticate: (
      request: import("fastify").FastifyRequest,
      reply: import("fastify").FastifyReply,
    ) => Promise<void>
  }
}
