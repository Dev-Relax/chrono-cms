// Always fire-and-forget — never blocks the request.

import { prisma } from "@chronos/db"

export type ActivityAction =
  | "post.created"
  | "post.updated"
  | "post.published"
  | "post.deleted"
  | "page.created"
  | "page.updated"
  | "page.published"
  | "page.deleted"
  | "user.created"
  | "user.updated"
  | "user.deleted"
  | "webhook.created"
  | "webhook.updated"
  | "webhook.deleted"
  | "apikey.created"
  | "apikey.deleted"
  | "media.uploaded"
  | "media.deleted"

export type EntityType = "post" | "page" | "user" | "webhook" | "apikey" | "media"

export interface LogParams {
  userId: string
  action: ActivityAction
  entityType: EntityType
  entityId?: string
  entityTitle?: string
}

export const logActivity = (params: LogParams): void => {
  void prisma.activityLog.create({ data: params }).catch((err) => {
    console.error("[activity] Failed to write log:", err)
  })
}
