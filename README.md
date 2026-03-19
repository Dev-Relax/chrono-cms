# Chronos CMS

> A self-hostable, open-source **hybrid CMS** — ships with a full admin UI, a built-in public blog, and a clean REST API so any external frontend can consume your content.

---

## Table of Contents

1. [Overview](#overview)
2. [Feature Highlights](#feature-highlights)
3. [Tech Stack](#tech-stack)
4. [Project Structure](#project-structure)
5. [Prerequisites](#prerequisites)
6. [Quick Start — Docker](#quick-start--docker)
7. [Quick Start — Local Development](#quick-start--local-development)
8. [Environment Variables](#environment-variables)
9. [Database Schema](#database-schema)
10. [API Reference](#api-reference)
    - [Authentication](#authentication-endpoints)
    - [Posts](#posts-endpoints)
    - [Pages](#pages-endpoints)
    - [Comments](#comments-endpoints)
    - [Media](#media-endpoints)
    - [Users](#users-endpoints-admin-only)
    - [Settings](#settings-endpoints)
    - [Webhooks](#webhooks-endpoints)
    - [API Keys](#api-keys-endpoints)
    - [RSS & Sitemap](#rss--sitemap)
    - [Stats](#stats-endpoint)
    - [Health](#health-check)
11. [Content Formats](#content-formats)
12. [Internationalisation (i18n)](#internationalisation-i18n)
13. [Editor Architecture](#editor-architecture)
14. [Frontend Pages & Routing](#frontend-pages--routing)
15. [Authentication Flow](#authentication-flow)
16. [Role System](#role-system)
17. [Post Scheduling](#post-scheduling)
18. [Image Handling](#image-handling)
19. [Scripts Reference](#scripts-reference)
20. [Docker & Self-Hosting](#docker--self-hosting)
21. [Coding Conventions](#coding-conventions)

---

## Overview

Chronos CMS is a **monorepo** shipping three packages:

| Package | Path | Role |
|---|---|---|
| `@chronos/db` | `packages/db/` | Prisma schema, client singleton, seed script |
| `@chronos/api` | `apps/api/` | Fastify REST API, JWT auth, content scheduler |
| `@chronos/web` | `apps/web/` | React + Vite admin UI and public blog |

### Two ways to use it

**Batteries-included blog** — deploy `apps/web` and use the built-in public blog. The Design Customizer controls layout, colours, and sidebar widgets. No external frontend needed.

**Headless API backend** — point your own Next.js / Nuxt / Astro / mobile app at the API. Content is returned as TipTap JSON (or HTML/Markdown on demand via `?format=`). The built-in frontend becomes a pure admin panel.

---

## Feature Highlights

### Content editing
- **TipTap 2 rich text editor** with full toolbar, Bubble Menu and Floating Menu
- **Side-by-side preview** — toggle Editor / Split / Preview modes
- **Syntax-highlighted code blocks** via `lowlight` / `highlight.js` (TypeScript, JavaScript, Bash, JSON, CSS)
- **Resizable, floatable images** — drag to resize, align left/right/center/block, text wraps around floated images
- **Image media picker** — modal showing the full media library + external URL tab
- Content stored as **TipTap JSON (JSONB)** — portable, XSS-safe, queryable

### Internationalisation (i18n)
- **Dynamic locale tabs** — add any BCP-47 locale (`en`, `fr`, `es`, `zh-tw`, …) in the post and page editors; no limit
- **Per-locale fields** — each locale has its own title, slug, content, excerpt, and SEO metadata
- **Fallback chain** — if the requested locale has no translation, the API falls back to `defaultLocale`, then the first available translation
- **Language switcher** on the public blog post and page views — dropdown with flag emojis and a count badge
- **`hreflang` data** — every public response includes a `hreflang[]` array for all locale↔slug pairs, ready for `<link rel="alternate" hreflang="…">` injection
- **`?strict=1` filter** — list only posts/pages that have an exact translation in the requested locale
- **Post revision history** is scoped per locale

### Posts & pages
- **Post scheduling** — set `scheduledAt`; a background cron publishes automatically every 60 s
- **Featured posts** — pinned to the top of the feed
- **Tags** — flat taxonomy, auto-created on save, filterable via `?tag=`
- **Full-text search** — `GET /posts/search?q=` across title and excerpt (all locales)
- **SEO fields** — `metaTitle`, `metaDescription`, `ogImage` per locale per post/page
- **Custom pages** — About, Contact, Privacy, etc. with their own per-locale slugs and content
- **Revision history** — last 10 revisions per post+locale kept; one-click restore from the editor

### Comments
- **Public comment submission** — nested replies supported
- **Moderation queue** — PENDING / APPROVED / SPAM / REJECTED states
- **Admin moderation panel** — approve, reject, spam, delete, bulk actions
- **Pending count badge** on the admin nav

### Media
- **Image upload** — drag & drop or click to browse, multi-file
- **Automatic WebP conversion** — raster images resized to max 1920 × 1920 px and converted to WebP (quality 85) via `sharp`
- **SVG passthrough** — vector files stored as-is
- **Copy URL** — absolute URL copied to clipboard, works in dev (Vite proxy) and production

### Multi-user
- **Three roles**: `ADMIN`, `EDITOR`, `AUTHOR`
- Role-based API enforcement — AUTHORs see only their own posts
- **User management page** (ADMIN only) — invite users, change roles, reset passwords
- JWT payload carries `{ sub, email, role }` — no extra DB lookup on authenticated requests

### Headless API
- **Content format negotiation** — append `?format=html` or `?format=markdown` to any public read endpoint; the API converts TipTap JSON on the fly
- **Locale filtering** — `?lang=fr` returns content in French (with fallback); `?lang=fr&strict=1` filters to only content that has a French translation
- **Per-locale RSS feeds** — `/rss.xml?lang=fr` or `/rss/fr.xml`
- **Multilingual sitemap** — `GET /sitemap.xml` emits one `<url>` per locale translation for both posts and pages
- **Webhooks** — configurable outbound HTTP callbacks with HMAC-SHA256 signing; payloads include the full `translations[]` array so consumers can build locale-aware workflows
- **API keys** — machine-to-machine access without JWT sessions
- **Activity log** — every create/update/publish/delete is recorded
- **CORS configurable** — comma-separated `CORS_ORIGIN` env var

### Design customizer *(built-in frontend only)*
- Card style: **grid** or **list**
- Sidebar toggle with configurable widgets: About, Tags cloud, Recent posts, Social links, Custom text
- Accent colour, font family, header style
- All settings persisted as JSON in the `site_settings` table and exposed via `GET /settings`

---

## Tech Stack

### Frontend (`apps/web`)

| Tool | Purpose |
|---|---|
| React 18 + Vite 5 | UI + build tooling |
| TypeScript 5 | Type safety |
| Tailwind CSS 3 + `@tailwindcss/typography` | Styling + prose rendering |
| TipTap 2 (`@tiptap/react`) | Rich text editor |
| `lowlight` / `highlight.js` | Code block syntax highlighting |
| React Router 6 | Client-side routing |
| `react-i18next` | Admin UI string translations |

### Backend (`apps/api`)

| Tool | Purpose |
|---|---|
| Fastify 4 | HTTP server |
| TypeScript 5 | Type safety |
| `@fastify/jwt` | JWT sign / verify |
| `@fastify/cors` | CORS headers |
| `@fastify/multipart` | File upload handling |
| `@fastify/static` | Serve `/uploads/*` |
| `sharp` 0.33 | Image resize + WebP conversion |
| `bcryptjs` | Password hashing |
| Zod 3 | Request validation |
| `pino-pretty` | Dev log formatting |

### Database (`packages/db`)

| Tool | Purpose |
|---|---|
| PostgreSQL 16 | Primary database |
| Prisma ORM 5 | Schema, migrations, typed client |

---

## Project Structure

```
chrono-cms/
├── package.json                   # npm workspaces root
├── tsconfig.base.json             # shared strict TypeScript config
├── docker-compose.yml
├── .env.example
│
├── packages/
│   └── db/                        # @chronos/db
│       ├── prisma/
│       │   ├── schema.prisma      # User, Post, PostTranslation, Page, PageTranslation, …
│       │   └── migrations/
│       └── src/
│           ├── index.ts           # Prisma singleton + re-exported types
│           └── seed.ts            # admin user + sample post
│
└── apps/
    ├── api/                       # @chronos/api
    │   ├── uploads/               # uploaded media files (gitignored)
    │   └── src/
    │       ├── server.ts          # Fastify entry, plugin registration, scheduler
    │       ├── env.ts             # Zod env validation
    │       ├── plugins/
    │       │   └── jwt.ts         # JWT plugin + authenticate decorator
    │       ├── routes/
    │       │   ├── auth.ts        # /auth/login, /auth/me
    │       │   ├── posts.ts       # /posts + /admin/posts CRUD, revisions, search
    │       │   ├── pages.ts       # /pages + /admin/pages CRUD
    │       │   ├── comments.ts    # /posts/:id/comments (public) + /admin/comments
    │       │   ├── media.ts       # /admin/media upload/list/delete
    │       │   ├── users.ts       # /admin/users CRUD (ADMIN only)
    │       │   ├── settings.ts    # /settings (read/write)
    │       │   ├── webhooks.ts    # /admin/webhooks CRUD + test
    │       │   ├── apikeys.ts     # /admin/apikeys CRUD
    │       │   ├── activity.ts    # /admin/activity log
    │       │   ├── stats.ts       # /admin/stats dashboard summary
    │       │   └── rss.ts         # /rss.xml, /rss/:lang.xml, /sitemap.xml
    │       └── utils/
    │           ├── slugify.ts
    │           ├── requireRole.ts
    │           ├── contentTransformer.ts  # JSON → HTML / Markdown
    │           ├── webhookDispatcher.ts   # HMAC-signed outbound webhooks
    │           └── activityLogger.ts
    │
    └── web/                       # @chronos/web
        ├── vite.config.ts         # proxy /api + /uploads → API in dev
        └── src/
            ├── App.tsx            # all routes (lazy-loaded)
            ├── types/index.ts     # Post, PostTranslation, Page, PageTranslation, …
            ├── lib/
            │   ├── api.ts         # fetch wrapper + all API helpers
            │   └── readingTime.ts
            ├── context/
            │   ├── AuthContext.tsx
            │   └── ThemeContext.tsx
            ├── components/
            │   ├── common/
            │   │   ├── Layout.tsx
            │   │   └── ProtectedRoute.tsx
            │   └── editor/
            │       ├── RichTextEditor.tsx
            │       ├── EditorToolbar.tsx
            │       ├── PostRenderer.tsx    # TipTap JSON → React (no innerHTML)
            │       ├── MediaPickerModal.tsx
            │       └── extensions/
            │           ├── FontSize.ts
            │           └── ImageExtension.tsx
            └── pages/
                ├── BlogFeedPage.tsx
                ├── BlogPostPage.tsx       # language switcher
                ├── CustomPageView.tsx     # language switcher
                └── admin/
                    ├── AdminDashboard.tsx
                    ├── PostEditorPage.tsx  # dynamic locale tabs
                    ├── PageEditorPage.tsx  # dynamic locale tabs
                    ├── PagesAdmin.tsx
                    ├── MediaLibrary.tsx
                    ├── DesignCustomizer.tsx
                    ├── CommentsAdmin.tsx
                    ├── WebhooksAdmin.tsx
                    ├── ApiKeysAdmin.tsx
                    └── UserManagement.tsx
```

---

## Prerequisites

- **Node.js** ≥ 20
- **npm** ≥ 10 (workspaces)
- **PostgreSQL** ≥ 14 *(or Docker Desktop — no local install needed)*

---

## Quick Start — Docker

```bash
# 1. Clone
git clone https://github.com/your-org/chronos-cms.git
cd chronos-cms

# 2. Configure
cp .env.example .env
# Edit .env — set JWT_SECRET at minimum

# 3. Start all services
docker compose up -d

# 4. First-time DB setup
docker compose exec api npm run db:migrate
docker compose exec api npm run db:seed

# 5. Open
#   Public blog  → http://localhost:5173
#   Admin        → http://localhost:5173/login
#   API          → http://localhost:4000
```

Default credentials (set in `.env`):

| | Default |
|---|---|
| Email | `admin@chronos.dev` |
| Password | `Admin1234!` |

> Change these and set a strong `JWT_SECRET` before exposing to the internet.

---

## Quick Start — Local Development

```bash
npm install
cp .env.example .env          # set DATABASE_URL + JWT_SECRET
npm run db:migrate             # apply migrations
npm run db:seed                # seed admin + sample post
npm run dev                    # API :4000 + Web :5173
```

After changing `schema.prisma`:
```bash
# Stop the server first (Windows DLL lock), then:
npm run db:migrate:dev         # creates + applies new migration
npx prisma generate --schema packages/db/prisma/schema.prisma
npm run dev
```

---

## Environment Variables

| Variable | Required | Default | Description |
|---|---|---|---|
| `DATABASE_URL` | ✅ | — | PostgreSQL connection string |
| `JWT_SECRET` | ✅ | — | Token signing key — use ≥ 48 random chars |
| `JWT_EXPIRES_IN` | | `7d` | Token lifetime (`1h`, `7d`, `30d`…) |
| `API_PORT` | | `4000` | Fastify listen port |
| `CORS_ORIGIN` | | `http://localhost:5173` | Comma-separated allowed origins |
| `VITE_API_URL` | | *(proxy)* | API origin seen from browser. In dev the Vite proxy handles `/api` and `/uploads` automatically; set this only in production builds |
| `ADMIN_EMAIL` | | `admin@chronos.dev` | Seeded admin email |
| `ADMIN_PASSWORD` | | `Admin1234!` | Seeded admin password |

Generate a secret:
```bash
node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
```

---

## Database Schema

Source: [`packages/db/prisma/schema.prisma`](packages/db/prisma/schema.prisma)

```
┌──────────┐     ┌──────────────────┐     ┌─────────┐
│   User   │─1:N─│      Post        │─M:N─│   Tag   │
│──────────│     │──────────────────│     │─────────│
│ id       │     │ id               │     │ id      │
│ email    │     │ defaultLocale    │     │ name    │
│ password │     │ status           │     │ slug    │
│ name     │     │ featured         │     └─────────┘
│ role     │     │ scheduledAt      │
└──────────┘     │ publishedAt      │     ┌────────────────────┐
     │           └──────────────────┘     │  PostTranslation   │
     │                   │ 1:N            │────────────────────│
     │                   └───────────────→│ id                 │
     │                                    │ postId             │
     │           ┌──────────────────┐     │ locale             │
     └─────1:N──→│      Page        │     │ title              │
                 │──────────────────│     │ slug (unique/locale)│
                 │ id               │     │ content (JSONB)    │
                 │ defaultLocale    │     │ excerpt            │
                 │ status           │     │ metaTitle          │
                 └──────────────────┘     │ metaDescription    │
                         │ 1:N            │ ogImage            │
                         │               └────────────────────┘
                         ▼
              ┌────────────────────┐
              │  PageTranslation   │     ┌───────────────┐
              │────────────────────│     │ SiteSettings  │
              │ id                 │     │───────────────│
              │ pageId             │     │ id (singleton)│
              │ locale             │     │ themeConfig   │
              │ title              │     │ brandConfig   │
              │ slug (unique/locale)│    └───────────────┘
              │ content (JSONB)    │
              │ metaTitle          │
              │ metaDescription    │
              │ ogImage            │
              └────────────────────┘
```

### Enums

| Enum | Values |
|---|---|
| `Role` | `ADMIN` `EDITOR` `AUTHOR` |
| `PostStatus` | `DRAFT` `PUBLISHED` |
| `PageStatus` | `DRAFT` `PUBLISHED` |
| `CommentStatus` | `PENDING` `APPROVED` `SPAM` `REJECTED` |

### `Post` fields (global, locale-agnostic)

| Column | Type | Notes |
|---|---|---|
| `id` | `String` (cuid) | PK |
| `defaultLocale` | `String` | BCP-47 tag of the canonical locale (e.g. `"en"`) |
| `status` | `PostStatus` | `DRAFT` / `PUBLISHED` |
| `featured` | `Boolean` | Pinned to top of feed |
| `scheduledAt` | `DateTime?` | Auto-publish at this time |
| `publishedAt` | `DateTime?` | Set on first publish |
| `authorId` | `String` | FK → `User.id` |

### `PostTranslation` fields (per-locale content)

| Column | Type | Notes |
|---|---|---|
| `id` | `String` (cuid) | PK |
| `postId` | `String` | FK → `Post.id` (cascade delete) |
| `locale` | `String` | BCP-47 tag (e.g. `"en"`, `"fr"`, `"zh-tw"`) |
| `title` | `String` | |
| `slug` | `String` | Unique **per locale** — enables `/en/my-post` vs `/fr/mon-article` routing |
| `content` | `Json` | TipTap ProseMirror document (JSONB) |
| `excerpt` | `String?` | Plain-text summary |
| `metaTitle` | `String?` | SEO title |
| `metaDescription` | `String?` | SEO description |
| `ogImage` | `String?` | Open Graph image URL |

### `Page` fields (global)

| Column | Type | Notes |
|---|---|---|
| `id` | `String` (cuid) | PK |
| `defaultLocale` | `String` | BCP-47 tag of the canonical locale |
| `status` | `PageStatus` | `DRAFT` / `PUBLISHED` |
| `authorId` | `String` | FK → `User.id` |

### `PageTranslation` fields (per-locale content)

| Column | Type | Notes |
|---|---|---|
| `id` | `String` (cuid) | PK |
| `pageId` | `String` | FK → `Page.id` (cascade delete) |
| `locale` | `String` | BCP-47 tag |
| `title` | `String` | |
| `slug` | `String` | Unique **per locale** — becomes `/:slug` on the public site |
| `content` | `Json` | TipTap ProseMirror document (JSONB) |
| `metaTitle` | `String?` | |
| `metaDescription` | `String?` | |
| `ogImage` | `String?` | |

---

## API Reference

**Base URL:** `http://localhost:4000`

Endpoints marked 🔒 require:
```
Authorization: Bearer <jwt_token>
```

---

### Authentication Endpoints

#### `POST /auth/login`

```json
// Request
{ "email": "admin@chronos.dev", "password": "Admin1234!" }

// Response 200
{
  "token": "eyJhbGci...",
  "user": { "id": "clx…", "email": "admin@chronos.dev", "name": "Admin", "role": "ADMIN" }
}
```

Errors: `400` invalid body · `401` wrong credentials

---

#### `GET /auth/me` 🔒

```json
// Response 200
{
  "user": {
    "id": "clx…", "email": "admin@chronos.dev",
    "name": "Admin", "role": "ADMIN", "createdAt": "…"
  }
}
```

---

### Posts Endpoints

All public post responses are **flattened** — translation fields are promoted to the top level for the requested locale, and a `hreflang[]` array lists all available locale↔slug pairs.

#### `GET /posts`

Public. Returns paginated published posts, featured first.

| Query param | Type | Default | Description |
|---|---|---|---|
| `page` | number | `1` | Page number |
| `limit` | number | `10` | Items per page (max 50) |
| `tag` | string | — | Filter by tag slug |
| `lang` | string | `en` | Preferred locale for translation fallback |
| `strict` | `1` / `true` | — | Only return posts that have an exact translation in `lang` |
| `format` | `json` \| `html` \| `markdown` | `json` | Content format |

```json
// Response 200
{
  "data": [
    {
      "id": "clx…",
      "defaultLocale": "en",
      "locale": "fr",
      "title": "Mon Article",
      "slug": "mon-article",
      "content": { "type": "doc", "content": [...] },
      "excerpt": "Résumé court.",
      "status": "PUBLISHED", "featured": false,
      "scheduledAt": null, "publishedAt": "2026-03-13T10:00:00.000Z",
      "createdAt": "…", "updatedAt": "…",
      "metaTitle": null, "metaDescription": null, "ogImage": null,
      "author": { "id": "cly…", "name": "Admin", "email": "admin@chronos.dev" },
      "tags": [{ "tag": { "id": "clz…", "name": "typescript", "slug": "typescript" } }],
      "hreflang": [
        { "locale": "en", "slug": "my-post" },
        { "locale": "fr", "slug": "mon-article" }
      ]
    }
  ],
  "meta": { "total": 42, "page": 1, "limit": 10, "totalPages": 5 }
}
```

---

#### `GET /posts/search`

Public. Full-text search on title and excerpt (all locales searched).

| Query param | Type | Description |
|---|---|---|
| `q` | string | Search query |
| `lang` | string | Preferred locale for result translation |
| `format` | `json` \| `html` \| `markdown` | Content format |

```
GET /posts/search?q=javascript&lang=fr&format=markdown
```

Response: `{ "data": Post[] }` (max 20 results, featured first)

---

#### `GET /posts/:slug`

Public. Single published post by slug. The slug is matched across **all locale translations** — you can use any locale's slug and the API resolves the correct post.

| Query param | Type | Description |
|---|---|---|
| `lang` | string | Override the response locale (fallback applies) |
| `format` | `json` \| `html` \| `markdown` | Content format |

```
GET /posts/mon-article         → returns the post in "fr" (slug's own locale)
GET /posts/mon-article?lang=en → returns the same post but in "en" locale
```

Response: `{ "data": Post }` · Errors: `404`

---

#### `GET /admin/posts` 🔒

All posts (any status). AUTHORs see only their own posts.

| Query param | Description |
|---|---|
| `page`, `limit` | Pagination |
| `status` | `DRAFT` or `PUBLISHED` |

---

#### `GET /admin/posts/:id` 🔒

Single post with **all translations** included (used by the editor).

```json
{
  "data": {
    "id": "clx…",
    "defaultLocale": "en",
    "translations": [
      { "id": "…", "locale": "en", "title": "My Post", "slug": "my-post", "content": {…}, … },
      { "id": "…", "locale": "fr", "title": "Mon Article", "slug": "mon-article", "content": {…}, … }
    ],
    …
  }
}
```

---

#### `POST /admin/posts` 🔒

Create a post with one or more locale translations.

```json
{
  "defaultLocale": "en",
  "status": "DRAFT",
  "featured": false,
  "scheduledAt": null,
  "tags": ["typescript", "cms"],
  "translations": {
    "en": {
      "title": "My Post",
      "slug": "my-post",
      "content": { "type": "doc", "content": [] },
      "excerpt": "Short summary.",
      "metaTitle": "SEO title",
      "metaDescription": "SEO description",
      "ogImage": "https://…/og.png"
    },
    "fr": {
      "title": "Mon Article",
      "slug": "mon-article",
      "content": { "type": "doc", "content": [] }
    }
  }
}
```

Response: `201 { "data": Post }` · Errors: `400`

---

#### `PUT /admin/posts/:id` 🔒

Partial update. Pass only the locales and fields you want to change. Translations are upserted — sending a new locale code creates it, sending an existing locale updates it.

Response: `200 { "data": Post }` · Errors: `400` `403` `404`

---

#### `DELETE /admin/posts/:id` 🔒

EDITOR+ or post owner. Cascades to all translations, tags, revisions, and comments.

Response: `204` · Errors: `403` `404`

---

#### `POST /admin/posts/bulk` 🔒

```json
{ "action": "publish" | "unpublish" | "delete", "ids": ["clx…", "cly…"] }
```

Response: `{ "affected": 3 }`

---

#### `GET /admin/posts/:id/revisions` 🔒

```
GET /admin/posts/:id/revisions?lang=fr
```

Returns the last 10 revisions for the post in the given locale.

---

#### `GET /admin/posts/:id/revisions/:revId` 🔒

Single revision. Response: `{ "data": { id, locale, title, content, createdAt } }`

---

#### `POST /admin/posts/:id/revisions/:revId/restore` 🔒

Restores `title` and `content` from the revision into the active translation for that locale. Saves the current state as a new revision before overwriting.

Response: `200 { "data": Post }`

---

### Pages Endpoints

Custom standalone pages (About, Contact, Privacy Policy, etc.). Each page supports the same dynamic locale system as posts — every translation gets its own slug.

#### `GET /pages`

Public. List all published pages.

| Query param | Type | Default | Description |
|---|---|---|---|
| `lang` | string | — | Preferred locale (falls back to `defaultLocale`) |
| `strict` | `1` / `true` | — | Only return pages with an exact translation in `lang` |
| `format` | `json` \| `html` \| `markdown` | `json` | Content format |

```
GET /pages?lang=fr
GET /pages?lang=fr&strict=1
```

Response: `{ "data": Page[] }`

---

#### `GET /pages/:slug`

Public. Single published page by slug. Slugs are matched across all locale translations.

| Query param | Type | Description |
|---|---|---|
| `lang` | string | Override response locale |
| `format` | `json` \| `html` \| `markdown` | Content format |

```json
// Response 200
{
  "data": {
    "id": "clx…",
    "defaultLocale": "en",
    "locale": "fr",
    "title": "À propos",
    "slug": "a-propos",
    "content": { "type": "doc", "content": [...] },
    "status": "PUBLISHED",
    "metaTitle": null, "metaDescription": null, "ogImage": null,
    "createdAt": "…", "updatedAt": "…",
    "author": { "id": "…", "name": "Admin", "email": "…" },
    "hreflang": [
      { "locale": "en", "slug": "about" },
      { "locale": "fr", "slug": "a-propos" }
    ]
  }
}
```

Errors: `404`

---

#### `GET /admin/pages` 🔒 *(EDITOR+)*

List all pages (any status). Each item is flattened to its `defaultLocale` translation and includes a `translationCount` field.

Response: `{ "data": Page[] }`

---

#### `GET /admin/pages/:id` 🔒 *(EDITOR+)*

Single page with all translations (used by the editor).

Response: `{ "data": { id, defaultLocale, status, translations: [...], … } }`

---

#### `POST /admin/pages` 🔒 *(EDITOR+)*

```json
{
  "defaultLocale": "en",
  "status": "DRAFT",
  "translations": {
    "en": {
      "title": "About Us",
      "slug": "about",
      "content": { "type": "doc", "content": [] },
      "metaTitle": "About Us — Chronos",
      "metaDescription": "Learn about our team."
    },
    "fr": {
      "title": "À propos",
      "slug": "a-propos",
      "content": { "type": "doc", "content": [] }
    }
  }
}
```

Response: `201 { "data": Page }` · Errors: `400`

---

#### `PUT /admin/pages/:id` 🔒 *(EDITOR+)*

Partial update. Translations are upserted.

Response: `200 { "data": Page }` · Errors: `400` `403` `404`

---

#### `DELETE /admin/pages/:id` 🔒 *(EDITOR+)*

Cascades to all translations.

Response: `204` · Errors: `403` `404`

---

### Comments Endpoints

#### `GET /posts/:postId/comments`

Public. Returns the approved comment tree for a post (nested replies included).

---

#### `POST /posts/:postId/comments`

Public. Submit a comment.

```json
{
  "content": "Great post!",
  "authorName": "Jane",
  "authorEmail": "jane@example.com",
  "parentId": null
}
```

Response: `201 { "data": Comment, "message": "Comment submitted for review" }`

---

#### `GET /admin/comments` 🔒

List all comments with optional filters.

| Query param | Description |
|---|---|
| `status` | `PENDING` / `APPROVED` / `SPAM` / `REJECTED` |
| `postId` | Filter by post |
| `page`, `limit` | Pagination |

---

#### `GET /admin/comments/pending-count` 🔒

```json
{ "count": 5 }
```

---

#### `PATCH /admin/comments/:id` 🔒

Moderate a comment.

```json
{ "status": "APPROVED" }
```

---

#### `DELETE /admin/comments/:id` 🔒

Cascades to replies.

---

#### `POST /admin/comments/bulk` 🔒

```json
{ "action": "approve" | "reject" | "spam" | "delete", "ids": ["…"] }
```

---

### Media Endpoints

Uploaded files are stored in `apps/api/uploads/` and served at `/uploads/*`.

#### `POST /admin/media` 🔒

Upload an image. Accepts `multipart/form-data` with field `file`.

- Raster images (JPEG, PNG, GIF, WebP, AVIF) → resized to max 1920 × 1920 px, converted to **WebP** at quality 85
- SVG → stored as-is

```bash
curl -X POST http://localhost:4000/admin/media \
  -H "Authorization: Bearer <token>" \
  -F "file=@photo.jpg"
```

```json
// Response 201
{
  "data": {
    "filename": "98fbf911-…-a8f1.webp",
    "originalName": "photo.jpg",
    "mimeType": "image/webp",
    "size": 42768,
    "url": "/uploads/98fbf911-…-a8f1.webp"
  }
}
```

Errors: `400` no file · `415` unsupported type

---

#### `GET /admin/media` 🔒

List all uploaded files, newest first.

---

#### `DELETE /admin/media/:filename` 🔒

Response: `204` · Errors: `400` invalid filename · `404` not found

---

### Users Endpoints *(ADMIN only)*

#### `GET /admin/users` 🔒

List all users.

---

#### `POST /admin/users` 🔒

```json
{
  "email": "author@example.com",
  "password": "SecurePass1!",
  "name": "John",
  "role": "AUTHOR"
}
```

Response: `201 { "data": User }` · Errors: `400` `409` email taken

---

#### `PUT /admin/users/:id` 🔒

```json
{ "name": "John", "role": "EDITOR", "password": "NewPass1!" }
```

Response: `200 { "data": User }` · Errors: `400` `404`

---

#### `DELETE /admin/users/:id` 🔒

Cannot delete your own account. Response: `204` · Errors: `400` `404`

---

### Settings Endpoints

#### `GET /settings`

Public. Returns the full site settings (theme + brand config).

---

#### `PUT /admin/settings` 🔒 *(ADMIN)*

Update theme and/or brand config.

```json
{
  "themeConfig": { "colors": { "primary": "#6366f1" }, … },
  "brandConfig": { "siteName": "My Blog", "tagline": "Words & ideas" }
}
```

Response: `200 { "data": SiteSettings }`

---

### Webhooks Endpoints

Outbound HTTP callbacks fired on CMS events. All payloads include a full `translations[]` array.

#### Webhook events

| Event | Fired when |
|---|---|
| `post.created` | A post is created |
| `post.updated` | A published post is updated |
| `post.published` | A post transitions to `PUBLISHED` |
| `post.deleted` | A post is deleted |
| `page.created` | A page is created |
| `page.updated` | A published page is updated |
| `page.published` | A page transitions to `PUBLISHED` |
| `page.deleted` | A page is deleted |

#### Payload shape

```json
{
  "event": "post.published",
  "timestamp": "2026-03-14T16:00:00.000Z",
  "data": {
    "id": "clx…",
    "defaultLocale": "en",
    "title": "My Post",
    "slug": "my-post",
    "translations": [
      { "locale": "en", "title": "My Post",    "slug": "my-post" },
      { "locale": "fr", "title": "Mon Article", "slug": "mon-article" }
    ]
  }
}
```

If a `secret` is configured, the request includes an `X-Webhook-Signature: sha256=<hmac>` header for verification.

#### `GET /admin/webhooks` 🔒
#### `POST /admin/webhooks` 🔒

```json
{
  "name": "Deploy trigger",
  "url": "https://example.com/hooks/deploy",
  "secret": "optional-signing-secret",
  "events": ["post.published"],
  "active": true
}
```

Pass `"events": []` to subscribe to all events.

#### `PUT /admin/webhooks/:id` 🔒
#### `DELETE /admin/webhooks/:id` 🔒
#### `POST /admin/webhooks/:id/test` 🔒

Sends a test ping to the webhook URL. Response: `{ "ok": true, "status": 200 }`

---

### API Keys Endpoints

Machine-to-machine access. Keys are shown once on creation; only a bcrypt hash is stored.

#### `GET /admin/apikeys` 🔒
#### `POST /admin/apikeys` 🔒

```json
{ "name": "CI Deploy Key" }
```

```json
// Response 201
{
  "data": {
    "id": "clx…", "name": "CI Deploy Key",
    "prefix": "ck_abc123",
    "key": "ck_abc123.full_key_shown_once",
    "createdAt": "…"
  }
}
```

#### `DELETE /admin/apikeys/:id` 🔒

---

### RSS & Sitemap

#### `GET /rss.xml`

Public. RSS 2.0 feed of the latest 20 published posts. Each item uses the post's `defaultLocale` translation by default.

| Query param | Description |
|---|---|
| `lang` | Return items in this locale (falls back to `defaultLocale`) |

```
GET /rss.xml           → default locale feed
GET /rss.xml?lang=fr   → French feed with fallback
```

---

#### `GET /rss/:lang.xml`

Public. Per-locale RSS feed using a clean URL.

```
GET /rss/fr.xml    → French feed
GET /rss/es.xml    → Spanish feed
GET /rss/en-us.xml → American English feed
```

The `<language>` tag in the feed reflects the requested locale. Link these in your `<head>`:

```html
<link rel="alternate" type="application/rss+xml"
      title="My Blog (EN)" href="https://example.com/rss/en.xml" />
<link rel="alternate" type="application/rss+xml"
      title="My Blog (FR)" href="https://example.com/rss/fr.xml" />
```

---

#### `GET /sitemap.xml`

Public. XML sitemap covering all published post and page translations — one `<url>` per locale per content item.

```xml
<url>
  <loc>https://example.com/posts/my-post</loc>
  <lastmod>2026-03-14</lastmod>
  <changefreq>weekly</changefreq>
  <priority>0.8</priority>
</url>
<url>
  <loc>https://example.com/posts/mon-article</loc>
  …
</url>
<url>
  <loc>https://example.com/about</loc>
  <changefreq>monthly</changefreq>
  <priority>0.6</priority>
</url>
```

---

### Stats Endpoint

#### `GET /admin/stats` 🔒

```json
{
  "data": {
    "posts":  { "total": 24, "published": 18, "draft": 6 },
    "pages":  { "total": 4,  "published": 3,  "draft": 1 },
    "media":  { "total": 38 },
    "users":  { "total": 3 },
    "recentPosts": [ { "id": "…", "title": "…", "slug": "…", "status": "PUBLISHED", … } ],
    "recentPages": [ { "id": "…", "title": "…", "slug": "…", "status": "PUBLISHED", … } ]
  }
}
```

Titles and slugs in `recentPosts` / `recentPages` are derived from the `defaultLocale` translation.

---

### Health Check

#### `GET /health`

```json
{ "status": "ok", "ts": "2026-03-13T10:00:00.000Z" }
```

---

## Content Formats

All public read endpoints that return content accept a `?format=` query parameter:

| Value | Response type | Description |
|---|---|---|
| `json` *(default)* | `object` | Raw TipTap ProseMirror JSON — use with `PostRenderer` or TipTap |
| `html` | `string` | Full HTML with inline styles (float, width) on images |
| `markdown` | `string` | CommonMark Markdown |

The conversion is performed server-side in `contentTransformer.ts` — no client-side TipTap dependency needed.

```
GET /posts/my-post?format=html
GET /posts?lang=fr&format=markdown
GET /posts/search?q=javascript&lang=de&format=html
GET /pages/about?lang=fr&format=markdown
```

### Supported node types

`doc` `paragraph` `heading` `blockquote` `codeBlock` `bulletList` `orderedList` `listItem` `image` `horizontalRule` `hardBreak` `text`

### Supported marks

`bold` `italic` `code` `strike` `underline` `link`

---

## Internationalisation (i18n)

### How it works

All translatable content lives in `PostTranslation` / `PageTranslation` rows rather than on the parent record. The `Post` / `Page` records hold only locale-agnostic metadata (`status`, `featured`, `scheduledAt`, …).

```
Post (id, defaultLocale, status, …)
  └── PostTranslation (locale="en", title, slug, content, …)
  └── PostTranslation (locale="fr", title, slug, content, …)
  └── PostTranslation (locale="es", …)
```

### Adding a locale in the editor

1. Open the post or page editor.
2. Click **+** at the end of the locale tab bar.
3. Type any BCP-47 code (`es`, `de`, `zh-tw`, …) or click a suggestion.
4. Fill in the title, slug, and content for that locale.
5. Save — the API upserts translations for all filled locales.

The **default locale** (marked ★) determines which translation is used as the fallback and which title/slug appears in the admin list.

### API locale selection

| Scenario | What to do |
|---|---|
| Fetch posts in French (fallback OK) | `GET /posts?lang=fr` |
| Fetch only posts with a French translation | `GET /posts?lang=fr&strict=1` |
| Fetch a specific post in French | `GET /posts/my-post?lang=fr` |
| Fetch a post using its French slug | `GET /posts/mon-article` |
| List pages in French | `GET /pages?lang=fr` |
| French RSS feed | `GET /rss/fr.xml` |

### `hreflang` response field

Every public post and page response includes:

```json
"hreflang": [
  { "locale": "en", "slug": "my-post" },
  { "locale": "fr", "slug": "mon-article" },
  { "locale": "es", "slug": "mi-articulo" }
]
```

Use this to inject `<link rel="alternate">` tags in your frontend's `<head>`:

```html
<link rel="alternate" hreflang="en" href="https://example.com/posts/my-post" />
<link rel="alternate" hreflang="fr" href="https://example.com/posts/mon-article" />
<link rel="alternate" hreflang="es" href="https://example.com/posts/mi-articulo" />
<link rel="alternate" hreflang="x-default" href="https://example.com/posts/my-post" />
```

### Language switcher (built-in frontend)

When a post or page has more than one translation, a language switcher pill appears in the page header. It shows the current locale's flag and a count badge. Clicking opens a dropdown that navigates to the locale-specific slug.

---

## Editor Architecture

```
RichTextEditor.tsx              ← extension registry + useEditor
  ├── EditorToolbar.tsx         ← full fixed toolbar
  │   └── MediaPickerModal.tsx  ← media library overlay (library tab + URL tab)
  └── EditorContent             ← TipTap contenteditable
        └── (BubbleMenu)        ← inline text selection toolbar
```

### Extensions

| Extension | Package | Purpose |
|---|---|---|
| `StarterKit` | `@tiptap/starter-kit` | Paragraph, headings (H1–H4), bold, italic, strike, lists, blockquote, code, history |
| `Underline` | `@tiptap/extension-underline` | Underline mark |
| `TextAlign` | `@tiptap/extension-text-align` | Left / center / right / justify on blocks |
| `TextStyle` | `@tiptap/extension-text-style` | Base for color and font size |
| `Color` | `@tiptap/extension-color` | Inline text colour |
| `Highlight` | `@tiptap/extension-highlight` | Multi-colour text highlight |
| `Link` | `@tiptap/extension-link` | Hyperlinks with target |
| `ImageExtension` | local | Resizable + floatable images with NodeView |
| `FontFamily` | `@tiptap/extension-font-family` | Font family picker |
| `FontSize` | local | Custom font size mark |
| `Subscript` | `@tiptap/extension-subscript` | |
| `Superscript` | `@tiptap/extension-superscript` | |
| `CodeBlockLowlight` | `@tiptap/extension-code-block-lowlight` | Syntax-highlighted code blocks |
| `Placeholder` | `@tiptap/extension-placeholder` | Ghost text |

### `PostRenderer`

Recursively walks TipTap JSON into React elements. Never uses `dangerouslySetInnerHTML`.

```tsx
import { PostRenderer } from "@/components/editor/PostRenderer";

<PostRenderer doc={post.content} className="my-prose" />
```

Images are rendered with `float`/`margin`/`width` inline styles matching the editor layout.

---

## Frontend Pages & Routing

| Path | Component | Access | Description |
|---|---|---|---|
| `/` | `BlogFeedPage` | Public | Paginated post feed with search, sidebar, layout modes |
| `/posts/:slug` | `BlogPostPage` | Public | Single post with SEO meta tags + language switcher |
| `/:slug` | `CustomPageView` | Public | Custom CMS page (About, Contact, etc.) + language switcher |
| `/login` | `LoginPage` | Public | Email + password login |
| `/admin` | `AdminDashboard` | 🔒 | Stats dashboard + recent activity |
| `/admin/posts/new` | `PostEditorPage` | 🔒 | Create post — dynamic locale tabs |
| `/admin/posts/:id/edit` | `PostEditorPage` | 🔒 | Edit post — dynamic locale tabs + revision history |
| `/admin/pages` | `PagesAdmin` | 🔒 | Custom pages list with translation count badges |
| `/admin/pages/new` | `PageEditorPage` | 🔒 | Create page — dynamic locale tabs |
| `/admin/pages/:id/edit` | `PageEditorPage` | 🔒 | Edit page — dynamic locale tabs |
| `/admin/design` | `DesignCustomizer` | 🔒 | Theme settings (built-in blog only) |
| `/admin/media` | `MediaLibrary` | 🔒 | Upload, copy URL, delete images |
| `/admin/comments` | `CommentsAdmin` | 🔒 | Moderate comments, bulk actions |
| `/admin/webhooks` | `WebhooksAdmin` | 🔒 | Manage webhooks, test endpoints |
| `/admin/apikeys` | `ApiKeysAdmin` | 🔒 | Manage API keys |
| `/admin/users` | `UserManagement` | 🔒 ADMIN | Invite users, change roles, delete |

All admin routes are wrapped in `ProtectedRoute` (redirects to `/login`). All pages are lazy-loaded.

---

## Authentication Flow

```
POST /auth/login
  → { token, user }
  → stored in localStorage ("chronos_token")
  → AuthContext: state = { status: "authenticated", user }
  → all requests: Authorization: Bearer <token>

Page refresh:
  → GET /auth/me
  → success: restore session
  → failure (expired): clear token, redirect /login
```

JWT payload:
```typescript
type JwtPayload = {
  sub:   string;                      // user id
  email: string;
  role:  "ADMIN" | "EDITOR" | "AUTHOR";
}
```

---

## Role System

| Role | Can do |
|---|---|
| `AUTHOR` | Create posts, edit/delete **own** posts only |
| `EDITOR` | Create/edit/delete **any** post, manage pages |
| `ADMIN` | Everything + user management, theme settings |

Role is enforced in the API via:
- `requireRole(request, reply, "ADMIN")` — gate an entire route
- `isOwnerOrMinRole(request, ownerId, "EDITOR")` — allow owner OR min role (used on PUT/DELETE posts)

The admin `/admin/users` link in the dashboard is hidden for non-ADMIN roles.

---

## Post Scheduling

Set `scheduledAt` to a future ISO 8601 datetime when creating or editing a post (leave `status: "DRAFT"`). A background job in `server.ts` runs every 60 seconds:

```
Every 60 s:
  UPDATE posts
  SET status = 'PUBLISHED', publishedAt = NOW()
  WHERE status = 'DRAFT' AND scheduledAt <= NOW()
```

The scheduler runs immediately on server start, then on the interval. Console output: `[scheduler] Published N scheduled post(s)`.

In the post editor, the **Schedule** button reveals a `datetime-local` input. The payload sends `scheduledAt` as an ISO string with the post saved as `DRAFT`.

---

## Image Handling

### Upload pipeline

```
Browser → POST /admin/media (multipart)
  ↓
sharp.resize({ width: 1920, height: 1920, fit: "inside", withoutEnlargement: true })
  ↓
.webp({ quality: 85 })
  ↓
saved as <uuid>.webp in apps/api/uploads/
  ↓
response: { url: "/uploads/<uuid>.webp" }
```

SVG files bypass sharp and are stored as `<uuid>.svg`.

### Editor image controls

Click any image in the editor to reveal:

- **Alignment toolbar**: `⇤ Left` (float, text wraps right) · `⇔ Center` · `Right ⇥` (float, text wraps left) · `⊡ Block` (full width)
- **Width presets**: `25%` `33%` `50%` `75%` `100%` computed from container width
- **Reset** `↺` — clears custom width, returns to natural size
- **Delete** `✕`
- **Resize handles**: drag the right edge or bottom-right corner

### URL resolution

In development, `/uploads/*` is proxied by Vite to the API (port 4000). In production, `VITE_API_URL` is used to build the absolute URL. The `resolveMediaUrl` helper in `api.ts` handles both cases transparently.

---

## Scripts Reference

### Root

| Command | Description |
|---|---|
| `npm run dev` | Start API (4000) + Web (5173) in parallel |
| `npm run build` | Build all packages |
| `npm run db:migrate` | `prisma migrate deploy` — production |
| `npm run db:migrate:dev` | `prisma migrate dev` — local dev |
| `npm run db:seed` | Seed admin user + sample post |
| `npm run db:studio` | Open Prisma Studio on port 5555 |

### `packages/db`

| Command | Description |
|---|---|
| `npm run generate` | Regenerate Prisma client after schema changes |
| `npm run migrate` | `prisma migrate dev` |
| `npm run migrate:deploy` | `prisma migrate deploy` |
| `npm run seed` | Run seed |
| `npm run studio` | Prisma Studio |

### `apps/api`

| Command | Description |
|---|---|
| `npm run dev` | `tsx watch src/server.ts` |
| `npm run build` | Compile to `dist/` |
| `npm run start` | `node dist/server.js` |

### `apps/web`

| Command | Description |
|---|---|
| `npm run dev` | Vite dev server + HMR |
| `npm run build` | Type-check + Vite production build |
| `npm run preview` | Preview production build locally |

---

## Docker & Self-Hosting

### Services

| Service | Image | Port | Description |
|---|---|---|---|
| `db` | `postgres:16-alpine` | `5432` | PostgreSQL |
| `api` | Node 20 multi-stage | `4000` | Fastify API |
| `web` | Node 20 build → Nginx | `80` | React SPA |

### Production checklist

- [ ] `JWT_SECRET` — minimum 48 random characters
- [ ] Change `ADMIN_EMAIL` + `ADMIN_PASSWORD` before seeding
- [ ] `CORS_ORIGIN` — exact frontend domain(s)
- [ ] `VITE_API_URL` — public API URL baked into the web build
- [ ] Mount a persistent volume for `apps/api/uploads/`
- [ ] Reverse proxy (Nginx / Caddy / Traefik) for TLS termination
- [ ] Managed PostgreSQL with automated backups
- [ ] Register per-locale RSS feeds in your `<head>` for feed readers

### Build examples

```bash
# API
docker build -f apps/api/Dockerfile -t chronos-api .
docker run -p 4000:4000 \
  -e DATABASE_URL="postgresql://user:pass@db:5432/chronos" \
  -e JWT_SECRET="your-secret" \
  -e CORS_ORIGIN="https://yoursite.com" \
  chronos-api

# Web (bake the API URL at build time)
docker build -f apps/web/Dockerfile \
  --build-arg VITE_API_URL=https://api.yoursite.com \
  -t chronos-web .
```

---

## Coding Conventions

| Rule | Detail |
|---|---|
| **Arrow functions only** | No `function` declarations |
| **Strict TypeScript** | `strict: true`, `noUncheckedIndexedAccess: true`, `exactOptionalPropertyTypes: true` |
| **Zod at I/O boundaries** | Every request body is validated with `z.safeParse()` |
| **No `dangerouslySetInnerHTML`** | `PostRenderer` uses pure React elements |
| **`as any` only for stale Prisma types** | New schema fields need `prisma generate` after server restart on Windows — cast with a comment until then |
| **CUID primary keys** | All models use `@default(cuid())` |
| **Named exports for utilities** | Default exports only for pages / React components |
| **i18n field access** | Never read `post.title` / `page.title` directly from the DB — always go through `pickTranslation()` / `flattenPost()` / `flattenPage()` helpers |

---

*Built for developers who want full control over their content.*
