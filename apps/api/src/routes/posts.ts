import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { prisma, Prisma } from "@chronos/db";
import { slugify } from "../utils/slugify.js";
import { isOwnerOrMinRole } from "../utils/requireRole.js";
import { transformContent, type ContentFormat } from "../utils/contentTransformer.js";
import { dispatchWebhook } from "../utils/webhookDispatcher.js";
import { logActivity } from "../utils/activityLogger.js";

const parseFormat = (q: Record<string, string | undefined>): ContentFormat => {
  const f = q["format"];
  return f === "html" || f === "markdown" ? f : "json";
};

const parseLang = (q: Record<string, string | undefined>): string =>
  q["lang"]?.trim().slice(0, 10) ?? "en";

const postWithTranslationsSelect = {
  id:            true,
  defaultLocale: true,
  status:        true,
  featured:      true,
  publishedAt:   true,
  scheduledAt:   true,
  createdAt:     true,
  updatedAt:     true,
  authorId:      true,
  author:        { select: { id: true, name: true, email: true } },
  tags:          { select: { tag: { select: { id: true, name: true, slug: true } } } },
  translations: {
    select: {
      id:              true,
      locale:          true,
      title:           true,
      slug:            true,
      content:         true,
      excerpt:         true,
      metaTitle:       true,
      metaDescription: true,
      ogImage:         true,
    },
  },
} as const;

type PostWithTranslations = Prisma.PostGetPayload<{ select: typeof postWithTranslationsSelect }>;

type Translation = PostWithTranslations["translations"][number];

/** Prefer requested locale, then defaultLocale, then first available. */
const pickTranslation = (
  translations: Translation[],
  requestedLocale: string,
  defaultLocale: string,
): Translation | null =>
  translations.find((t) => t.locale === requestedLocale) ??
  translations.find((t) => t.locale === defaultLocale) ??
  translations[0] ??
  null;

const flattenPost = (
  post: PostWithTranslations,
  requestedLocale: string,
  format: ContentFormat,
) => {
  const tr = pickTranslation(post.translations, requestedLocale, post.defaultLocale);
  if (!tr) return null;

  const hreflang = post.translations.map((t) => ({ locale: t.locale, slug: t.slug }));

  return {
    id:              post.id,
    defaultLocale:   post.defaultLocale,
    locale:          tr.locale,
    title:           tr.title,
    slug:            tr.slug,
    content:         transformContent(tr.content, format),
    excerpt:         tr.excerpt,
    metaTitle:       tr.metaTitle,
    metaDescription: tr.metaDescription,
    ogImage:         tr.ogImage,
    status:          post.status,
    featured:        post.featured,
    publishedAt:     post.publishedAt,
    scheduledAt:     post.scheduledAt,
    createdAt:       post.createdAt,
    updatedAt:       post.updatedAt,
    author:          post.author,
    tags:            post.tags,
    hreflang,
  };
};

const adminRow = (post: PostWithTranslations) => {
  const def = post.translations.find((t) => t.locale === post.defaultLocale) ?? post.translations[0];
  return { ...post, title: def?.title ?? "", slug: def?.slug ?? "" };
};

const translationSchema = z.object({
  title:           z.string().min(1).max(255),
  slug:            z.string().optional(),
  content:         z.record(z.unknown()),
  excerpt:         z.string().optional(),
  metaTitle:       z.string().max(255).optional(),
  metaDescription: z.string().max(500).optional(),
  ogImage:         z.string().optional(),
});

const postBodySchema = z.object({
  defaultLocale:   z.string().default("en"),
  status:          z.enum(["DRAFT", "PUBLISHED"]).default("DRAFT"),
  featured:        z.boolean().optional(),
  scheduledAt:     z.string().datetime({ offset: true }).nullable().optional(),
  tags:            z.array(z.string()).optional(),
  /** Multi-locale map: { "en": { title, slug?, content, … }, "fr": { … } } */
  translations:    z.record(translationSchema).optional(),
  // Legacy single-locale fields (backward compat with older clients)
  title:           z.string().min(1).max(255).optional(),
  slug:            z.string().optional(),
  content:         z.record(z.unknown()).optional(),
  excerpt:         z.string().optional(),
  metaTitle:       z.string().max(255).optional(),
  metaDescription: z.string().max(500).optional(),
  ogImage:         z.string().optional(),
});

const bulkSchema = z.object({
  action: z.enum(["publish", "unpublish", "delete"]),
  ids:    z.array(z.string().cuid()).min(1).max(100),
});

const saveRevision = async (
  postId: string,
  locale: string,
  title:  string,
  content: Prisma.JsonValue,
  userId: string,
) => {
  await prisma.postRevision.create({
    data: { postId, locale, title, content: content as Prisma.InputJsonValue, userId },
  });
  const all = await prisma.postRevision.findMany({
    where:   { postId, locale },
    orderBy: { createdAt: "desc" },
    select:  { id: true },
  });
  if (all.length > 10) {
    await prisma.postRevision.deleteMany({ where: { id: { in: all.slice(10).map((r) => r.id) } } });
  }
};

type TranslationUpsertData = {
  title: string; slug: string; content: Prisma.InputJsonValue;
  excerpt: string | null; metaTitle: string | null; metaDescription: string | null; ogImage: string | null;
};

const buildTranslations = (
  body: z.infer<typeof postBodySchema>,
  defaultLocale: string,
): Record<string, TranslationUpsertData> => {
  const out: Record<string, TranslationUpsertData> = {};

  if (body.translations) {
    for (const [locale, t] of Object.entries(body.translations)) {
      out[locale] = {
        title:           t.title,
        slug:            t.slug ?? slugify(t.title),
        content:         t.content as Prisma.InputJsonValue,
        excerpt:         t.excerpt         ?? null,
        metaTitle:       t.metaTitle       ?? null,
        metaDescription: t.metaDescription ?? null,
        ogImage:         t.ogImage         ?? null,
      };
    }
  } else if (body.title) {
    // Legacy single-locale
    out[defaultLocale] = {
      title:           body.title,
      slug:            body.slug ?? slugify(body.title),
      content:         (body.content ?? {}) as Prisma.InputJsonValue,
      excerpt:         body.excerpt         ?? null,
      metaTitle:       body.metaTitle       ?? null,
      metaDescription: body.metaDescription ?? null,
      ogImage:         body.ogImage         ?? null,
    };
  }
  return out;
};

export const postsRoutes = async (fastify: FastifyInstance): Promise<void> => {

  // ?lang=fr&strict=1 to restrict to posts with that exact translation
  fastify.get("/posts", async (request, reply) => {
    const query  = request.query as { page?: string; limit?: string; tag?: string; format?: string; lang?: string; strict?: string };
    const format = parseFormat(query);
    const lang   = parseLang(query);
    const strict = query.strict === "1" || query.strict === "true";
    const page   = Math.max(1, parseInt(query.page  ?? "1",  10));
    const limit  = Math.min(50, Math.max(1, parseInt(query.limit ?? "10", 10)));
    const skip   = (page - 1) * limit;

    const where = {
      status: "PUBLISHED" as const,
      ...(query.tag    ? { tags:         { some: { tag: { slug: query.tag } } } } : {}),
      // strict mode: only include posts that have an exact translation for this locale
      ...(strict && query.lang ? { translations: { some: { locale: query.lang.trim().slice(0, 10) } } } : {}),
    };

    const [total, posts] = await Promise.all([
      prisma.post.count({ where }),
      prisma.post.findMany({
        where,
        select:  postWithTranslationsSelect,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        orderBy: [{ featured: "desc" }, { publishedAt: "desc" }] as any,
        skip,
        take: limit,
      }),
    ]);

    const data = posts.map((p) => flattenPost(p, lang, format)).filter(Boolean);
    return reply.send({ data, meta: { total, page, limit, totalPages: Math.ceil(total / limit) } });
  });

  fastify.get("/posts/search", async (request, reply) => {
    const query  = request.query as { q?: string; format?: string; lang?: string };
    const format = parseFormat(query);
    const lang   = parseLang(query);
    if (!query.q?.trim()) return reply.send({ data: [] });

    const posts = await prisma.post.findMany({
      where: {
        status: "PUBLISHED",
        translations: {
          some: {
            OR: [
              { title:   { contains: query.q, mode: "insensitive" } },
              { excerpt: { contains: query.q, mode: "insensitive" } },
            ],
          },
        },
      },
      select:  postWithTranslationsSelect,
      orderBy: [{ featured: "desc" }, { publishedAt: "desc" }],
      take:    20,
    });

    const data = posts.map((p) => flattenPost(p, lang, format)).filter(Boolean);
    return reply.send({ data });
  });

  fastify.get("/posts/:slug", async (request, reply) => {
    const { slug } = request.params as { slug: string };
    const query    = request.query as Record<string, string | undefined>;
    const format   = parseFormat(query);
    const lang     = parseLang(query);

    const post = await prisma.post.findFirst({
      where:  { status: "PUBLISHED", translations: { some: { slug } } },
      select: postWithTranslationsSelect,
    });
    if (!post) return reply.status(404).send({ error: "Post not found" });

    // prefer the locale whose slug matched the URL path
    const exactLocale = post.translations.find((t) => t.slug === slug)?.locale ?? lang;
    const flattened   = flattenPost(post, exactLocale, format);
    if (!flattened) return reply.status(404).send({ error: "Post not found" });

    return reply.send({ data: flattened });
  });

  fastify.get(
    "/admin/posts",
    { preHandler: [fastify.authenticate] },
    async (request, reply) => {
      const query = request.query as { page?: string; limit?: string; status?: string };
      const page  = Math.max(1, parseInt(query.page  ?? "1",  10));
      const limit = Math.min(50, Math.max(1, parseInt(query.limit ?? "20", 10)));
      const skip  = (page - 1) * limit;

      const payload     = request.user as { sub: string; role: string };
      const ownerFilter = payload.role === "AUTHOR" ? { authorId: payload.sub } : {};
      const validStatus = (query.status === "DRAFT" || query.status === "PUBLISHED")
        ? query.status as "DRAFT" | "PUBLISHED"
        : undefined;
      const where = {
        ...ownerFilter,
        ...(validStatus ? { status: validStatus } : {}),
      };

      const [total, posts] = await Promise.all([
        prisma.post.count({ where }),
        prisma.post.findMany({
          where,
          select:  postWithTranslationsSelect,
          orderBy: { updatedAt: "desc" },
          skip,
          take: limit,
        }),
      ]);

      return reply.send({
        data: posts.map(adminRow),
        meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
      });
    }
  );

  fastify.get(
    "/admin/posts/:id",
    { preHandler: [fastify.authenticate] },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      const post = await prisma.post.findUnique({ where: { id }, select: postWithTranslationsSelect });
      if (!post) return reply.status(404).send({ error: "Post not found" });
      return reply.send({ data: adminRow(post) });
    }
  );

  fastify.post(
    "/admin/posts/bulk",
    { preHandler: [fastify.authenticate] },
    async (request, reply) => {
      const body = bulkSchema.safeParse(request.body);
      if (!body.success) return reply.status(400).send({ error: "Validation failed", details: body.error.flatten() });

      const payload     = request.user as { sub: string; role: string };
      const { action, ids } = body.data;
      const ownerFilter = payload.role === "AUTHOR" ? { authorId: payload.sub } : {};
      const where = { id: { in: ids }, ...ownerFilter };

      let affected = 0;
      if (action === "delete") {
        affected = (await prisma.post.deleteMany({ where })).count;
        logActivity({ userId: payload.sub, action: "post.deleted", entityType: "post", entityTitle: `${affected} posts (bulk)` });
      } else {
        const newStatus = action === "publish" ? "PUBLISHED" : "DRAFT";
        affected = (await prisma.post.updateMany({
          where,
          data: { status: newStatus, ...(newStatus === "PUBLISHED" ? { publishedAt: new Date() } : {}) },
        })).count;
        if (newStatus === "PUBLISHED") {
          logActivity({ userId: payload.sub, action: "post.published", entityType: "post", entityTitle: `${affected} posts (bulk)` });
        }
      }
      return reply.send({ affected });
    }
  );

  fastify.post(
    "/admin/posts",
    { preHandler: [fastify.authenticate] },
    async (request, reply) => {
      const body = postBodySchema.safeParse(request.body);
      if (!body.success) return reply.status(400).send({ error: "Validation failed", details: body.error.flatten() });

      const payload = request.user as { sub: string };
      const { defaultLocale, status, featured, scheduledAt, tags } = body.data;
      const translationData = buildTranslations(body.data, defaultLocale);

      if (Object.keys(translationData).length === 0) {
        return reply.status(400).send({ error: "At least one translation is required" });
      }

      const uniqueTags = tags ? [...new Set(tags)] : [];
      const tagConnections = await Promise.all(uniqueTags.map((s) => prisma.tag.upsert({
        where: { slug: s }, update: {}, create: { name: s, slug: s },
      })));

      const post = await prisma.post.create({
        data: {
          defaultLocale,
          status,
          featured:    featured    ?? false,
          scheduledAt: scheduledAt ? new Date(scheduledAt) : null,
          publishedAt: status === "PUBLISHED" ? new Date() : null,
          authorId:    payload.sub,
          tags:        { create: tagConnections.map((t) => ({ tagId: t.id })) },
          translations: {
            create: Object.entries(translationData).map(([locale, t]) => ({ locale, ...t })),
          },
        },
        select: postWithTranslationsSelect,
      });

      const row = adminRow(post);
      const webhookTranslations = post.translations.map((t) => ({ locale: t.locale, title: t.title, slug: t.slug }));
      logActivity({ userId: payload.sub, action: "post.created", entityType: "post", entityId: post.id, entityTitle: row.title });
      if (status === "PUBLISHED") {
        dispatchWebhook("post.published", {
          id: post.id, defaultLocale: post.defaultLocale,
          title: row.title, slug: row.slug,
          translations: webhookTranslations,
        });
      }

      return reply.status(201).send({ data: row });
    }
  );

  fastify.put(
    "/admin/posts/:id",
    { preHandler: [fastify.authenticate] },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      const body = postBodySchema.partial().safeParse(request.body);
      if (!body.success) return reply.status(400).send({ error: "Validation failed", details: body.error.flatten() });

      const existing = await prisma.post.findUnique({ where: { id }, select: postWithTranslationsSelect });
      if (!existing) return reply.status(404).send({ error: "Post not found" });
      if (!isOwnerOrMinRole(request, existing.authorId)) return reply.status(403).send({ error: "Insufficient permissions" });

      const payload = request.user as { sub: string };
      const resolvedDefault = body.data.defaultLocale ?? existing.defaultLocale;
      const translationData = buildTranslations(body.data as z.infer<typeof postBodySchema>, resolvedDefault);

      // Save revisions in parallel for all touched locales
      await Promise.all(
        Object.keys(translationData).flatMap((locale) => {
          const current = existing.translations.find((t) => t.locale === locale);
          return current ? [saveRevision(id, locale, current.title, current.content, payload.sub)] : [];
        })
      );

      const { tags } = body.data;
      if (tags !== undefined) {
        await prisma.postTag.deleteMany({ where: { postId: id } });
        const tagRecords = await Promise.all(
          tags.map((s) => prisma.tag.upsert({ where: { slug: s }, update: {}, create: { name: s, slug: s } }))
        );
        await prisma.postTag.createMany({ data: tagRecords.map((t) => ({ postId: id, tagId: t.id })) });
      }

      await Promise.all(
        Object.entries(translationData).map(([locale, td]) =>
          prisma.postTranslation.upsert({
            where:  { postId_locale: { postId: id, locale } },
            create: { postId: id, locale, ...td },
            update: td,
          })
        )
      );

      const { status, featured, scheduledAt, defaultLocale } = body.data;
      const updated = await prisma.post.update({
        where: { id },
        data: {
          ...(defaultLocale !== undefined && { defaultLocale }),
          ...(featured      !== undefined && { featured }),
          ...(scheduledAt   !== undefined && { scheduledAt: scheduledAt ? new Date(scheduledAt) : null }),
          ...(status        !== undefined && {
            status,
            publishedAt: status === "PUBLISHED" && !existing.publishedAt ? new Date() : existing.publishedAt,
          }),
        },
        select: postWithTranslationsSelect,
      });

      const row = adminRow(updated);
      const webhookTranslations = updated.translations.map((t) => ({ locale: t.locale, title: t.title, slug: t.slug }));
      const webhookBase = { id: updated.id, defaultLocale: updated.defaultLocale, title: row.title, slug: row.slug, translations: webhookTranslations };
      logActivity({ userId: payload.sub, action: "post.updated", entityType: "post", entityId: id, entityTitle: row.title });

      const justPublished = status === "PUBLISHED" && existing.status !== "PUBLISHED";
      if (justPublished) {
        dispatchWebhook("post.published", webhookBase);
        logActivity({ userId: payload.sub, action: "post.published", entityType: "post", entityId: id, entityTitle: row.title });
      } else if (status === "PUBLISHED") {
        dispatchWebhook("post.updated", webhookBase);
      }

      return reply.send({ data: row });
    }
  );

  fastify.delete(
    "/admin/posts/:id",
    { preHandler: [fastify.authenticate] },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      const existing = await prisma.post.findUnique({
        where:  { id },
        select: { authorId: true, defaultLocale: true, translations: { select: { locale: true, title: true, slug: true } } },
      });
      if (!existing) return reply.status(404).send({ error: "Post not found" });
      if (!isOwnerOrMinRole(request, existing.authorId)) return reply.status(403).send({ error: "Insufficient permissions" });

      await prisma.post.delete({ where: { id } });

      const def = existing.translations.find((t) => t.locale === existing.defaultLocale) ?? existing.translations[0];
      const payload = request.user as { sub: string };
      logActivity({ userId: payload.sub, action: "post.deleted", entityType: "post", entityId: id, entityTitle: def?.title ?? "" });
      dispatchWebhook("post.deleted", {
        id,
        defaultLocale: existing.defaultLocale,
        title: def?.title ?? "",
        slug:  def?.slug  ?? "",
        translations: existing.translations.map((t) => ({ locale: t.locale, title: t.title, slug: t.slug })),
      });
      return reply.status(204).send();
    }
  );

  fastify.get(
    "/admin/posts/:id/revisions",
    { preHandler: [fastify.authenticate] },
    async (request, reply) => {
      const { id }  = request.params as { id: string };
      const query   = request.query as { lang?: string };
      const locale  = query.lang ?? "en";

      const existing = await prisma.post.findUnique({ where: { id }, select: { authorId: true } });
      if (!existing) return reply.status(404).send({ error: "Post not found" });
      if (!isOwnerOrMinRole(request, existing.authorId)) return reply.status(403).send({ error: "Insufficient permissions" });

      const revisions = await prisma.postRevision.findMany({
        where:   { postId: id, locale },
        orderBy: { createdAt: "desc" },
        select: {
          id:        true,
          locale:    true,
          title:     true,
          createdAt: true,
          user: { select: { id: true, name: true, email: true } },
        },
      });
      return reply.send({ data: revisions });
    }
  );

  fastify.get(
    "/admin/posts/:id/revisions/:revId",
    { preHandler: [fastify.authenticate] },
    async (request, reply) => {
      const { id, revId } = request.params as { id: string; revId: string };
      const existing = await prisma.post.findUnique({ where: { id }, select: { authorId: true } });
      if (!existing) return reply.status(404).send({ error: "Post not found" });
      if (!isOwnerOrMinRole(request, existing.authorId)) return reply.status(403).send({ error: "Insufficient permissions" });

      const revision = await prisma.postRevision.findFirst({ where: { id: revId, postId: id } });
      if (!revision) return reply.status(404).send({ error: "Revision not found" });
      return reply.send({ data: revision });
    }
  );

  fastify.post(
    "/admin/posts/:id/revisions/:revId/restore",
    { preHandler: [fastify.authenticate] },
    async (request, reply) => {
      const { id, revId } = request.params as { id: string; revId: string };

      const existing = await prisma.post.findUnique({ where: { id }, select: postWithTranslationsSelect });
      if (!existing) return reply.status(404).send({ error: "Post not found" });
      if (!isOwnerOrMinRole(request, existing.authorId)) return reply.status(403).send({ error: "Insufficient permissions" });

      const revision = await prisma.postRevision.findFirst({ where: { id: revId, postId: id } });
      if (!revision) return reply.status(404).send({ error: "Revision not found" });

      const payload = request.user as { sub: string };

      // snapshot current state before overwriting
      const currentTrans = existing.translations.find((t) => t.locale === revision.locale);
      if (currentTrans) {
        await saveRevision(id, revision.locale, currentTrans.title, currentTrans.content, payload.sub);
      }

      await prisma.postTranslation.upsert({
        where:  { postId_locale: { postId: id, locale: revision.locale } },
        create: {
          postId:  id,
          locale:  revision.locale,
          title:   revision.title,
          slug:    currentTrans?.slug ?? slugify(revision.title),
          content: revision.content as Prisma.InputJsonValue,
        },
        update: {
          title:   revision.title,
          content: revision.content as Prisma.InputJsonValue,
        },
      });

      const restored = await prisma.post.findUnique({ where: { id }, select: postWithTranslationsSelect });
      if (!restored) return reply.status(404).send({ error: "Post not found" });

      logActivity({ userId: payload.sub, action: "post.updated", entityType: "post", entityId: id, entityTitle: `Restored: ${revision.title}` });
      return reply.send({ data: adminRow(restored) });
    }
  );

  // generates a 1-hour signed preview token for draft sharing
  fastify.post(
    "/admin/posts/:id/preview",
    { preHandler: [fastify.authenticate] },
    async (request, reply) => {
      const { id } = request.params as { id: string };

      const exists = await prisma.post.findUnique({ where: { id }, select: { id: true } });
      if (!exists) return reply.status(404).send({ error: "Post not found" });

      const token = fastify.jwt.sign(
        { previewId: id, purpose: "preview" },
        { expiresIn: "1h" }
      );

      return reply.send({ data: { token, expiresIn: 3600 } });
    }
  );

  fastify.get("/preview/:token", async (request, reply) => {
    const { token } = request.params as { token: string };
    const q = request.query as Record<string, string | undefined>;
    const format = parseFormat(q);
    const lang   = parseLang(q);

    let previewId: string;
    try {
      const decoded = fastify.jwt.verify<{ previewId: string; purpose: string }>(token);
      if (decoded.purpose !== "preview") throw new Error("wrong purpose");
      previewId = decoded.previewId;
    } catch {
      return reply.status(401).send({ error: "Invalid or expired preview token" });
    }

    const post = await prisma.post.findUnique({
      where:  { id: previewId },
      select: postWithTranslationsSelect,
    });
    if (!post) return reply.status(404).send({ error: "Post not found" });

    const flat = flattenPost(post, lang, format);
    if (!flat) return reply.status(404).send({ error: "Post not found" });

    return reply.send({ data: flat, preview: true });
  });
};
