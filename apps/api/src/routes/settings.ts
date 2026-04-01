import type { FastifyInstance } from "fastify"
import { z } from "zod"
import { prisma, Prisma } from "@chronos/db"

const DEFAULT_THEME_CONFIG = {
  colors: {
    primary: "#6366f1",
    background: "#020617",
    surface: "#0f172a",
  },
  typography: {
    fontPair: "sans-modern",
  },
  layout: {
    headerStyle: "minimal",
    cardStyle: "grid",
    showSidebar: false,
  },
} as const

const DEFAULT_BRAND_CONFIG = {
  siteName: "Chronos CMS",
  tagline: "",
  seoTitle: "Chronos CMS",
  seoDescription: "",
  logoUrl: "",
  ogImage: "",
} as const

const themeColorsSchema = z.object({
  primary: z.string().regex(/^#[0-9a-fA-F]{6}$/),
  background: z.string().regex(/^#[0-9a-fA-F]{6}$/),
  surface: z.string().regex(/^#[0-9a-fA-F]{6}$/),
})

const themeTypographySchema = z.object({
  fontPair: z.enum(["sans-modern", "serif-editorial", "mono-technical", "humanist"]),
})

const socialLinkSchema = z.object({
  platform: z.enum(["twitter", "github", "linkedin", "instagram", "youtube", "rss"]),
  url: z.string(),
})

const sidebarWidgetSchema = z.object({
  id: z.string(),
  type: z.enum(["about", "tags", "recent_posts", "social_links", "custom_text"]),
  enabled: z.boolean(),
  title: z.string(),
  text: z.string().optional(),
  count: z.number().optional(),
  links: z.array(socialLinkSchema).optional(),
})

const themeLayoutSchema = z.object({
  headerStyle: z.enum(["minimal", "bold", "centered"]),
  cardStyle: z.enum(["grid", "list"]),
  showSidebar: z.boolean(),
  sidebarWidgets: z.array(sidebarWidgetSchema).optional(),
})

const themeConfigSchema = z.object({
  colors: themeColorsSchema,
  typography: themeTypographySchema,
  layout: themeLayoutSchema,
})

const brandConfigSchema = z.object({
  siteName: z.string().min(1).max(100),
  tagline: z.string().max(200),
  seoTitle: z.string().max(100),
  seoDescription: z.string().max(300),
  logoUrl: z.string().max(500),
  ogImage: z.string().max(500),
})

const navItemSchema = z.object({
  id: z.string(),
  type: z.enum(["blog", "page", "custom"]),
  label: z.string().max(100),
  slug: z.string().optional(),
  url: z.string().max(500).optional(),
  hidden: z.boolean(),
})

const navConfigSchema = z.object({
  items: z.array(navItemSchema),
})

export const settingsRoutes = async (fastify: FastifyInstance): Promise<void> => {
  fastify.get("/settings", async (_request, reply) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const settings = await (prisma.siteSettings.upsert as any)({
      where: { id: "singleton" },
      update: {},
      create: {
        id: "singleton",
        themeConfig: DEFAULT_THEME_CONFIG,
        brandConfig: DEFAULT_BRAND_CONFIG,
      },
    })

    return reply.send({ data: settings })
  })

  fastify.put("/admin/settings", { preHandler: [fastify.authenticate] }, async (request, reply) => {
    const body = z
      .object({
        themeConfig: themeConfigSchema.optional(),
        brandConfig: brandConfigSchema.optional(),
        navConfig: navConfigSchema.optional(),
      })
      .refine(
        (d) =>
          d.themeConfig !== undefined || d.brandConfig !== undefined || d.navConfig !== undefined,
        {
          message: "At least one of themeConfig, brandConfig or navConfig must be provided",
        },
      )
      .safeParse(request.body)

    if (!body.success) {
      return reply.status(400).send({ error: "Validation failed", details: body.error.flatten() })
    }

    const updateData: Record<string, Prisma.InputJsonValue> = {}
    if (body.data.themeConfig)
      updateData["themeConfig"] = body.data.themeConfig as unknown as Prisma.InputJsonValue
    if (body.data.brandConfig)
      updateData["brandConfig"] = body.data.brandConfig as unknown as Prisma.InputJsonValue
    if (body.data.navConfig)
      updateData["navConfig"] = body.data.navConfig as unknown as Prisma.InputJsonValue

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const settings = await (prisma.siteSettings.upsert as any)({
      where: { id: "singleton" },
      update: updateData,
      create: {
        id: "singleton",
        themeConfig: body.data.themeConfig ?? DEFAULT_THEME_CONFIG,
        brandConfig: body.data.brandConfig ?? DEFAULT_BRAND_CONFIG,
      },
    })

    return reply.send({ data: settings })
  })
}
