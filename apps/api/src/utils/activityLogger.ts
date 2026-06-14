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
  | "project.created"
  | "project.updated"
  | "project.published"
  | "project.deleted"
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
  | "skill.created"
  | "skill.updated"
  | "skill.deleted"
  | "experience.created"
  | "experience.updated"
  | "experience.deleted"
  | "education.created"
  | "education.updated"
  | "education.deleted"
  | "testimonial.created"
  | "testimonial.updated"
  | "testimonial.deleted"
  | "certification.created"
  | "certification.updated"
  | "certification.deleted"

export type EntityType =
  | "post"
  | "page"
  | "project"
  | "user"
  | "webhook"
  | "apikey"
  | "media"
  | "skill"
  | "experience"
  | "education"
  | "testimonial"
  | "certification"

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
