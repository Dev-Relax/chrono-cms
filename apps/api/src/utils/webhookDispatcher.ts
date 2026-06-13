import { createHmac } from "node:crypto"
import { prisma } from "@chronos/db"

export type WebhookEvent =
  | "post.created"
  | "post.updated"
  | "post.published"
  | "post.deleted"
  | "page.created"
  | "page.updated"
  | "page.published"
  | "page.deleted"
  | "project.created"
  | "project.updated"
  | "project.published"
  | "project.deleted"
  | "contact.submitted"

interface WebhookPayload {
  event: WebhookEvent
  timestamp: string
  data: Record<string, unknown>
}

const sign = (secret: string, body: string): string =>
  createHmac("sha256", secret).update(body).digest("hex")

/**
 * Fire all active webhooks subscribed to `event`.
 * Runs fire-and-forget — errors are logged, never thrown.
 */
export const dispatchWebhook = (event: WebhookEvent, data: Record<string, unknown>): void => {
  void (async () => {
    try {
      const hooks = await prisma.webhook.findMany({
        where: {
          active: true,
          OR: [
            { events: { isEmpty: true } }, // subscribed to all events
            { events: { has: event } },
          ],
        },
      })

      if (hooks.length === 0) return

      const payload: WebhookPayload = {
        event,
        timestamp: new Date().toISOString(),
        data,
      }
      const body = JSON.stringify(payload)

      await Promise.allSettled(
        hooks.map(async (hook) => {
          const headers: Record<string, string> = {
            "Content-Type": "application/json",
            "X-Webhook-Event": event,
            "User-Agent": "ChronosCMS-Webhooks/1.0",
          }

          if (hook.secret) {
            headers["X-Webhook-Signature"] = `sha256=${sign(hook.secret, body)}`
          }

          const res = await fetch(hook.url, { method: "POST", headers, body })
          if (!res.ok) {
            console.warn(`[webhook] ${hook.url} responded ${res.status} for event ${event}`)
          }
        }),
      )
    } catch (err) {
      console.error("[webhook] Dispatch error:", err)
    }
  })()
}
