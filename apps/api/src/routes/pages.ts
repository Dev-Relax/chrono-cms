import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { prisma, Prisma } from "@chronos/db";
import { slugify } from "../utils/slugify.js";
import { requireRole } from "../utils/requireRole.js";
import { transformContent, type ContentFormat } from "../utils/contentTransformer.js";
import { dispatchWebhook } from "../utils/webhookDispatcher.js";
import { logActivity } from "../utils/activityLogger.js";

const parseFormat = (q: Record<string, string | undefined>): ContentFormat => {
  const f = q["format"];
  return f === "html" || f === "markdown" ? f : "json";
};

const parseLang = (q: Record<string, string | undefined>): string | undefined =>
  q["lang"] || undefined;

const pageWithTranslationsSelect = {
  id:           true,
  defaultLocale: true,
  status:       true,
  pageConfig:   true,
  createdAt:    true,
  updatedAt:    true,
  author:       { select: { id: true, name: true, email: true } },
  translations: {
    select: {
      id: true, locale: true, title: true, slug: true, content: true,
      metaTitle: true, metaDescription: true, ogImage: true, heroContent: true,
    },
  },
} as const;

type PageWithTranslations = Prisma.PageGetPayload<{ select: typeof pageWithTranslationsSelect }>;

const heroContentSchema = z.object({
  subtitle: z.string().max(500).optional(),
  image:    z.string().max(500).optional(),
  ctaText:  z.string().max(100).optional(),
  ctaUrl:   z.string().max(500).optional(),
}).optional();

const pageConfigSchema = z.object({
  layout:   z.enum(["default", "wide", "full-width"]).optional(),
  showToc:  z.boolean().optional(),
  showHero: z.boolean().optional(),
}).optional();

const translationSchema = z.object({
  title:           z.string().min(1).max(255),
  slug:            z.string().optional(),
  content:         z.record(z.unknown()).default({}),
  metaTitle:       z.string().max(255).optional(),
  metaDescription: z.string().max(500).optional(),
  ogImage:         z.string().optional(),
  heroContent:     heroContentSchema,
});

const pageBodySchema = z.object({
  defaultLocale: z.string().default("en"),
  status:        z.enum(["DRAFT", "PUBLISHED"]).default("DRAFT"),
  pageConfig:    pageConfigSchema,
  /** Multi-locale payload: keyed by locale ("en", "fr", …) */
  translations:  z.record(translationSchema).optional(),
});

// Promotes one translation's fields to the top-level response and adds hreflang.
const flattenPage = (page: PageWithTranslations, locale: string, format: ContentFormat) => {
  const tr =
    page.translations.find((t) => t.locale === locale) ??
    page.translations.find((t) => t.locale === page.defaultLocale) ??
    page.translations[0];

  if (!tr) return null;

  const hreflang = page.translations.map((t) => ({ locale: t.locale, slug: t.slug }));

  return {
    id:           page.id,
    defaultLocale: page.defaultLocale,
    locale:       tr.locale,
    title:        tr.title,
    slug:         tr.slug,
    content:      transformContent(tr.content, format),
    metaTitle:    tr.metaTitle,
    metaDescription: tr.metaDescription,
    ogImage:      tr.ogImage,
    heroContent:  tr.heroContent ?? null,
    pageConfig:   page.pageConfig ?? {},
    status:       page.status,
    createdAt:    page.createdAt,
    updatedAt:    page.updatedAt,
    author:       page.author,
    hreflang,
  };
};

export const pagesRoutes = async (fastify: FastifyInstance): Promise<void> => {

  // Public listing of all published pages.
  // ?lang=fr          — prefer FR translations (falls back to defaultLocale)
  // ?lang=fr&strict=1 — only return pages that have an FR translation
  fastify.get("/pages", async (request, reply) => {
    const q      = request.query as Record<string, string | undefined>;
    const format = parseFormat(q);
    const lang   = parseLang(q);
    const strict = q["strict"] === "1" || q["strict"] === "true";

    const where = {
      status: "PUBLISHED" as const,
      ...(strict && lang ? { translations: { some: { locale: lang } } } : {}),
    };

    const pages = await prisma.page.findMany({
      where,
      select:  pageWithTranslationsSelect,
      orderBy: { updatedAt: "desc" },
    });

    const data = pages
      .map((p) => flattenPage(p, lang ?? p.defaultLocale, format))
      .filter(Boolean);

    return reply.send({ data });
  });

  // Looks up by translation slug (any locale), then applies lang preference.
  fastify.get("/pages/:slug", async (request, reply) => {
    const { slug } = request.params as { slug: string };
    const q        = request.query as Record<string, string | undefined>;
    const format   = parseFormat(q);
    const lang     = parseLang(q);

    // Find the page whose translation matches this slug
    const page = await prisma.page.findFirst({
      where: {
        status:       "PUBLISHED",
        translations: { some: { slug } },
      },
      select: pageWithTranslationsSelect,
    });

    if (!page) return reply.status(404).send({ error: "Page not found" });

    // Prefer the slug's own locale, then requested lang, then defaultLocale
    const slugLocale = page.translations.find((t) => t.slug === slug)?.locale;
    const resolvedLocale = lang ?? slugLocale ?? page.defaultLocale;

    const flat = flattenPage(page, resolvedLocale, format);
    if (!flat) return reply.status(404).send({ error: "Page not found" });

    return reply.send({ data: flat });
  });

  fastify.get(
    "/admin/pages",
    { preHandler: [fastify.authenticate] },
    async (request, reply) => {
      if (!await requireRole(request, reply, "EDITOR")) return;

      const pages = await prisma.page.findMany({
        select:  pageWithTranslationsSelect,
        orderBy: { updatedAt: "desc" },
      });

      // Return a lightweight list: flatten to defaultLocale, include translation count
      const data = pages.map((p) => {
        const defTr = p.translations.find((t) => t.locale === p.defaultLocale) ?? p.translations[0];
        return {
          id:               p.id,
          defaultLocale:    p.defaultLocale,
          locale:           defTr?.locale ?? p.defaultLocale,
          title:            defTr?.title  ?? "",
          slug:             defTr?.slug   ?? "",
          status:           p.status,
          createdAt:        p.createdAt,
          updatedAt:        p.updatedAt,
          author:           p.author,
          translationCount: p.translations.length,
          hreflang:         p.translations.map((t) => ({ locale: t.locale, slug: t.slug })),
        };
      });

      return reply.send({ data });
    }
  );

  fastify.get(
    "/admin/pages/:id",
    { preHandler: [fastify.authenticate] },
    async (request, reply) => {
      if (!await requireRole(request, reply, "EDITOR")) return;

      const { id } = request.params as { id: string };
      const page = await prisma.page.findUnique({
        where:  { id },
        select: pageWithTranslationsSelect,
      });

      if (!page) return reply.status(404).send({ error: "Page not found" });
      return reply.send({ data: page });
    }
  );

  fastify.post(
    "/admin/pages",
    { preHandler: [fastify.authenticate] },
    async (request, reply) => {
      if (!await requireRole(request, reply, "EDITOR")) return;

      const body = pageBodySchema.safeParse(request.body);
      if (!body.success) {
        return reply.status(400).send({ error: "Validation failed", details: body.error.flatten() });
      }

      const userPayload = request.user as { sub: string };
      const { defaultLocale, status, pageConfig, translations = {} } = body.data;

      if (Object.keys(translations).length === 0) {
        return reply.status(400).send({ error: "At least one translation is required" });
      }

      const page = await prisma.page.create({
        data: {
          defaultLocale,
          status,
          authorId: userPayload.sub,
          ...(pageConfig !== undefined && { pageConfig: pageConfig as Prisma.InputJsonValue }),
          translations: {
            create: Object.entries(translations).map(([locale, tr]) => ({
              locale,
              title:           tr.title,
              slug:            tr.slug ?? slugify(tr.title),
              content:         tr.content as Prisma.InputJsonValue,
              ...(tr.metaTitle       !== undefined && { metaTitle:       tr.metaTitle       }),
              ...(tr.metaDescription !== undefined && { metaDescription: tr.metaDescription }),
              ...(tr.ogImage         !== undefined && { ogImage:         tr.ogImage         }),
              ...(tr.heroContent     !== undefined && { heroContent:     tr.heroContent as Prisma.InputJsonValue }),
            })),
          },
        },
        select: pageWithTranslationsSelect,
      });

      const defTr = page.translations.find((t) => t.locale === defaultLocale) ?? page.translations[0];
      const webhookTranslations = page.translations.map((t) => ({ locale: t.locale, title: t.title, slug: t.slug }));
      logActivity({
        userId: userPayload.sub, action: "page.created", entityType: "page",
        entityId: page.id, ...(defTr?.title !== undefined && { entityTitle: defTr.title }),
      });
      if (status === "PUBLISHED" && defTr) {
        dispatchWebhook("page.published", {
          id: page.id, defaultLocale: page.defaultLocale,
          title: defTr.title, slug: defTr.slug,
          translations: webhookTranslations,
        });
      }

      return reply.status(201).send({ data: page });
    }
  );

  fastify.put(
    "/admin/pages/:id",
    { preHandler: [fastify.authenticate] },
    async (request, reply) => {
      if (!await requireRole(request, reply, "EDITOR")) return;

      const { id } = request.params as { id: string };
      const body = pageBodySchema.partial().safeParse(request.body);
      if (!body.success) {
        return reply.status(400).send({ error: "Validation failed", details: body.error.flatten() });
      }

      const existing = await prisma.page.findUnique({
        where:  { id },
        select: { id: true, status: true, defaultLocale: true },
      });
      if (!existing) return reply.status(404).send({ error: "Page not found" });

      const { defaultLocale, status, pageConfig, translations = {} } = body.data;

      // Upsert each locale translation
      for (const [locale, tr] of Object.entries(translations)) {
        await prisma.pageTranslation.upsert({
          where:  { pageId_locale: { pageId: id, locale } },
          create: {
            pageId: id,
            locale,
            title:           tr.title,
            slug:            tr.slug ?? slugify(tr.title),
            content:         tr.content as Prisma.InputJsonValue,
            ...(tr.metaTitle       !== undefined && { metaTitle:       tr.metaTitle       }),
            ...(tr.metaDescription !== undefined && { metaDescription: tr.metaDescription }),
            ...(tr.ogImage         !== undefined && { ogImage:         tr.ogImage         }),
            ...(tr.heroContent     !== undefined && { heroContent:     tr.heroContent as Prisma.InputJsonValue }),
          },
          update: {
            title:           tr.title,
            slug:            tr.slug ?? slugify(tr.title),
            content:         tr.content as Prisma.InputJsonValue,
            ...(tr.metaTitle       !== undefined && { metaTitle:       tr.metaTitle       }),
            ...(tr.metaDescription !== undefined && { metaDescription: tr.metaDescription }),
            ...(tr.ogImage         !== undefined && { ogImage:         tr.ogImage         }),
            ...(tr.heroContent     !== undefined && { heroContent:     tr.heroContent as Prisma.InputJsonValue }),
          },
        });
      }

      const updated = await prisma.page.update({
        where: { id },
        data: {
          ...(defaultLocale !== undefined && { defaultLocale }),
          ...(status        !== undefined && { status }),
          ...(pageConfig    !== undefined && { pageConfig: pageConfig as Prisma.InputJsonValue }),
        },
        select: pageWithTranslationsSelect,
      });

      const userPayload = request.user as { sub: string };
      const defTr = updated.translations.find((t) => t.locale === updated.defaultLocale) ?? updated.translations[0];
      logActivity({
        userId: userPayload.sub, action: "page.updated", entityType: "page",
        entityId: id, ...(defTr?.title !== undefined && { entityTitle: defTr.title }),
      });

      const justPublished = status === "PUBLISHED" && existing.status !== "PUBLISHED";
      if (defTr) {
        const webhookBase = {
          id, defaultLocale: updated.defaultLocale,
          title: defTr.title, slug: defTr.slug,
          translations: updated.translations.map((t) => ({ locale: t.locale, title: t.title, slug: t.slug })),
        };
        if (justPublished) {
          dispatchWebhook("page.published", webhookBase);
          logActivity({
            userId: userPayload.sub, action: "page.published", entityType: "page",
            entityId: id, entityTitle: defTr.title,
          });
        } else if (status === "PUBLISHED") {
          dispatchWebhook("page.updated", webhookBase);
        }
      }

      return reply.send({ data: updated });
    }
  );

  fastify.delete(
    "/admin/pages/:id",
    { preHandler: [fastify.authenticate] },
    async (request, reply) => {
      if (!await requireRole(request, reply, "EDITOR")) return;

      const { id } = request.params as { id: string };
      const existing = await prisma.page.findUnique({
        where:  { id },
        select: {
          id: true,
          defaultLocale: true,
          translations: { select: { locale: true, title: true, slug: true } },
        },
      });
      if (!existing) return reply.status(404).send({ error: "Page not found" });

      await prisma.page.delete({ where: { id } });

      const defTr = existing.translations.find((t) => t.locale === existing.defaultLocale) ?? existing.translations[0];
      const userPayload = request.user as { sub: string };
      logActivity({
        userId: userPayload.sub, action: "page.deleted", entityType: "page",
        entityId: id, ...(defTr?.title !== undefined && { entityTitle: defTr.title }),
      });
      if (defTr) {
        dispatchWebhook("page.deleted", {
          id, defaultLocale: existing.defaultLocale,
          title: defTr.title, slug: defTr.slug,
          translations: existing.translations.map((t) => ({ locale: t.locale, title: t.title, slug: t.slug })),
        });
      }

      return reply.status(204).send();
    }
  );
};
