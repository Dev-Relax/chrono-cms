# Chronos CMS — Documentation

> Setup and feature overview: [README.md](README.md)

---

## Table of Contents

1. [Database Schema](#database-schema)
2. [API Reference](#api-reference)
   - [Authentication](#authentication-endpoints)
   - [Posts](#posts-endpoints)
   - [Pages](#pages-endpoints)
   - [Projects](#projects-endpoints)
   - [Comments](#comments-endpoints)
   - [Skills](#skills-endpoints)
   - [Work Experience](#work-experience-endpoints)
   - [Education](#education-endpoints)
   - [Testimonials](#testimonials-endpoints)
   - [Contact](#contact-endpoints)
   - [Certifications](#certifications-endpoints)
   - [Media](#media-endpoints)
   - [Users](#users-endpoints-admin-only)
   - [Settings](#settings-endpoints)
   - [Webhooks](#webhooks-endpoints)
   - [API Keys](#api-keys-endpoints)
   - [RSS & Sitemap](#rss--sitemap)
   - [Stats](#stats-endpoint)
   - [Health](#health-check)
3. [Content Formats](#content-formats)
4. [Internationalisation (i18n)](#internationalisation-i18n)
5. [Editor Architecture](#editor-architecture)
6. [Frontend Pages & Routing](#frontend-pages--routing)
7. [Authentication Flow](#authentication-flow)
8. [Role System](#role-system)
9. [Post Scheduling](#post-scheduling)
10. [Image Handling](#image-handling)
11. [Docker & Self-Hosting](#docker--self-hosting)
12. [Coding Conventions](#coding-conventions)

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
|------|--------|
| `Role` | `ADMIN` `EDITOR` `AUTHOR` |
| `PostStatus` | `DRAFT` `PUBLISHED` |
| `PageStatus` | `DRAFT` `PUBLISHED` |
| `ProjectStatus` | `DRAFT` `PUBLISHED` |
| `CommentStatus` | `PENDING` `APPROVED` `SPAM` `REJECTED` |
| `SkillLevel` | `BEGINNER` `INTERMEDIATE` `ADVANCED` `EXPERT` |
| `SubmissionStatus` | `NEW` `READ` `ARCHIVED` |

### Portfolio models (simplified)

| Model | Key fields |
|-------|-----------|
| `Skill` | `name`, `slug`, `category`, `level` (enum), `icon`, `order`, `visible` |
| `Experience` | `company`, `location`, `startDate`, `endDate`, `url`, `logoUrl`, `order` + translations |
| `ExperienceTranslation` | `locale`, `role`, `description` (TipTap JSON) |
| `Education` | `institution`, `field`, `startDate`, `endDate`, `url`, `logoUrl`, `order` + translations |
| `EducationTranslation` | `locale`, `degree`, `description` (TipTap JSON) |
| `Testimonial` | `author`, `role`, `company`, `avatarUrl`, `content`, `rating`, `featured`, `visible`, `order` |
| `ContactSubmission` | `name`, `email`, `subject`, `message`, `status` (`SubmissionStatus`) |
| `Certification` | `title`, `issuer`, `issuedAt`, `expiresAt`, `credentialUrl`, `logoUrl`, `order` |

Social links are stored as JSON inside `SiteSettings.brandConfig` (no separate table).

### `Post` fields

| Column | Type | Notes |
|--------|------|-------|
| `id` | `String` (cuid) | PK |
| `defaultLocale` | `String` | BCP-47 tag of the canonical locale |
| `status` | `PostStatus` | `DRAFT` / `PUBLISHED` |
| `featured` | `Boolean` | Pinned to top of feed |
| `scheduledAt` | `DateTime?` | Auto-publish at this time |
| `publishedAt` | `DateTime?` | Set on first publish |
| `authorId` | `String` | FK → `User.id` |

### `PostTranslation` fields

| Column | Type | Notes |
|--------|------|-------|
| `id` | `String` (cuid) | PK |
| `postId` | `String` | FK → `Post.id` (cascade delete) |
| `locale` | `String` | BCP-47 tag |
| `title` | `String` | |
| `slug` | `String` | Unique per locale |
| `content` | `Json` | TipTap ProseMirror document (JSONB) |
| `excerpt` | `String?` | Plain-text summary |
| `metaTitle` | `String?` | SEO title |
| `metaDescription` | `String?` | SEO description |
| `ogImage` | `String?` | Open Graph image URL |

### `Page` / `PageTranslation` fields

Same structure as `Post` / `PostTranslation`. Pages omit `featured`, `scheduledAt`, `publishedAt`, and tags.

### `Project` fields

| Column | Type | Notes |
|--------|------|-------|
| `id` | `String` (cuid) | PK |
| `defaultLocale` | `String` | BCP-47 tag of the canonical locale |
| `status` | `ProjectStatus` | `DRAFT` / `PUBLISHED` |
| `featured` | `Boolean` | Pinned to top of the grid |
| `order` | `Int` | Manual portfolio ordering |
| `coverImage` | `String?` | `/uploads/…` path or absolute URL |
| `techStack` | `String[]` | Tech-stack chips, locale-agnostic |
| `githubUrl` | `String?` | Source repo link |
| `liveUrl` | `String?` | Live demo link |
| `blogUrl` | `String?` | External article URL (used when `postId` is null) |
| `postId` | `String?` | FK → `Post.id` — internal blog-post link |
| `authorId` | `String` | FK → `User.id` |

### `ProjectTranslation` fields

| Column | Type | Notes |
|--------|------|-------|
| `id` | `String` (cuid) | PK |
| `projectId` | `String` | FK → `Project.id` (cascade delete) |
| `locale` | `String` | BCP-47 tag |
| `title` | `String` | |
| `slug` | `String` | Unique per locale — becomes `/projects/:slug` |
| `summary` | `String?` | Plain-text card blurb |
| `content` | `Json` | Optional TipTap long description (JSONB) |
| `metaTitle` | `String?` | |
| `metaDescription` | `String?` | |

The blog link is mutually exclusive: storing a `postId` clears `blogUrl`. On read, an internal `postId` is resolved to the linked post's localized `/posts/:slug`; otherwise the raw `blogUrl` is returned.

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
  "user": { "id": "clx…", "email": "admin@chronos.dev", "name": "Admin", "role": "ADMIN", "createdAt": "…" }
}
```

---

### Posts Endpoints

All public post responses are **flattened** — translation fields are promoted to the top level for the requested locale, and a `hreflang[]` array lists all available locale↔slug pairs.

#### `GET /posts`

Public. Returns paginated published posts, featured first.

| Query param | Type | Default | Description |
|-------------|------|---------|-------------|
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
      "content": { "type": "doc", "content": [] },
      "excerpt": "Résumé court.",
      "status": "PUBLISHED",
      "featured": false,
      "scheduledAt": null,
      "publishedAt": "2026-03-13T10:00:00.000Z",
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
|-------------|------|-------------|
| `q` | string | Search query |
| `lang` | string | Preferred locale for result translation |
| `format` | `json` \| `html` \| `markdown` | Content format |

Response: `{ "data": Post[] }` (max 20 results, featured first)

---

#### `GET /posts/:slug`

Public. Single published post by slug. The slug is matched across **all locale translations**.

| Query param | Type | Description |
|-------------|------|-------------|
| `lang` | string | Override the response locale (fallback applies) |
| `format` | `json` \| `html` \| `markdown` | Content format |

```
GET /posts/mon-article         → returns the post in "fr"
GET /posts/mon-article?lang=en → returns the same post in "en"
```

Response: `{ "data": Post }` · Errors: `404`

---

#### `GET /admin/posts` 🔒

All posts (any status). AUTHORs see only their own posts.

| Query param | Description |
|-------------|-------------|
| `page`, `limit` | Pagination |
| `status` | `DRAFT` or `PUBLISHED` |

---

#### `GET /admin/posts/:id` 🔒

Single post with **all translations** (used by the editor).

```json
{
  "data": {
    "id": "clx…",
    "defaultLocale": "en",
    "translations": [
      { "id": "…", "locale": "en", "title": "My Post", "slug": "my-post", "content": {} },
      { "id": "…", "locale": "fr", "title": "Mon Article", "slug": "mon-article", "content": {} }
    ]
  }
}
```

---

#### `POST /admin/posts` 🔒

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

Partial update. Translations are upserted — sending a new locale creates it; sending an existing locale updates it.

Response: `200 { "data": Post }` · Errors: `400` `403` `404`

---

#### `DELETE /admin/posts/:id` 🔒

Cascades to all translations, tags, revisions, and comments.

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

Response: `{ "data": { id, locale, title, content, createdAt } }`

---

#### `POST /admin/posts/:id/revisions/:revId/restore` 🔒

Restores `title` and `content` from the revision. Saves the current state as a new revision before overwriting.

Response: `200 { "data": Post }`

---

### Pages Endpoints

Custom standalone pages (About, Contact, Privacy, etc.). Same dynamic locale system as posts.

#### `GET /pages`

Public.

| Query param | Type | Default | Description |
|-------------|------|---------|-------------|
| `lang` | string | — | Preferred locale |
| `strict` | `1` / `true` | — | Only return pages with an exact translation in `lang` |
| `format` | `json` \| `html` \| `markdown` | `json` | Content format |

Response: `{ "data": Page[] }`

---

#### `GET /pages/:slug`

Public. Slugs matched across all locale translations.

Response: `{ "data": Page }` · Errors: `404`

---

#### `GET /admin/pages` 🔒 _(EDITOR+)_

List all pages (any status). Each item is flattened to its `defaultLocale` translation and includes a `translationCount` field.

---

#### `GET /admin/pages/:id` 🔒 _(EDITOR+)_

Single page with all translations.

---

#### `POST /admin/pages` 🔒 _(EDITOR+)_

```json
{
  "defaultLocale": "en",
  "status": "DRAFT",
  "translations": {
    "en": {
      "title": "About Us",
      "slug": "about",
      "content": { "type": "doc", "content": [] },
      "metaTitle": "About Us — Chronos"
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

#### `PUT /admin/pages/:id` 🔒 _(EDITOR+)_

Partial update. Translations are upserted.

Response: `200 { "data": Page }` · Errors: `400` `403` `404`

---

#### `DELETE /admin/pages/:id` 🔒 _(EDITOR+)_

Cascades to all translations. Response: `204`

---

### Projects Endpoints

Portfolio/showcase items. Same dynamic locale system as posts and pages. Admin routes require **EDITOR+**.

Public responses include locale-agnostic fields (`coverImage`, `techStack`, `githubUrl`, `liveUrl`), a resolved `blogUrl`, and a `hreflang[]` array.

#### `GET /projects`

Public. All published projects, ordered featured-first, then by `order`, then newest.

| Query param | Type | Default | Description |
|-------------|------|---------|-------------|
| `lang` | string | — | Preferred locale |
| `strict` | `1` / `true` | — | Only return projects with an exact translation in `lang` |
| `format` | `json` \| `html` \| `markdown` | `json` | Content format for the long description |

---

#### `GET /projects/:slug`

Public. Single published project by slug.

```json
// Response 200
{
  "data": {
    "id": "clx…",
    "locale": "en",
    "title": "Chronos CMS",
    "slug": "chronos-cms",
    "summary": "A self-hostable hybrid CMS.",
    "content": { "type": "doc", "content": [] },
    "coverImage": "/uploads/cover.webp",
    "techStack": ["TypeScript", "Fastify", "React"],
    "githubUrl": "https://github.com/your-org/chronos-cms",
    "liveUrl": "https://demo.example.com",
    "blogUrl": "/posts/building-chronos",
    "featured": true,
    "order": 0,
    "hreflang": [{ "locale": "en", "slug": "chronos-cms" }]
  }
}
```

Errors: `404`

---

#### `GET /admin/projects` 🔒 _(EDITOR+)_

List all projects (any status), ordered by `order`.

---

#### `GET /admin/projects/:id` 🔒 _(EDITOR+)_

Single project with all translations.

---

#### `POST /admin/projects` 🔒 _(EDITOR+)_

```json
{
  "defaultLocale": "en",
  "status": "DRAFT",
  "featured": false,
  "order": 0,
  "coverImage": "/uploads/cover.webp",
  "techStack": ["TypeScript", "Fastify", "React"],
  "githubUrl": "https://github.com/your-org/chronos-cms",
  "liveUrl": "https://demo.example.com",
  "postId": null,
  "blogUrl": "",
  "translations": {
    "en": {
      "title": "Chronos CMS",
      "slug": "chronos-cms",
      "summary": "A self-hostable hybrid CMS.",
      "content": { "type": "doc", "content": [] }
    }
  }
}
```

`githubUrl` / `liveUrl` must be `http(s)` URLs. Linking a `postId` clears `blogUrl`.

Response: `201 { "data": Project }` · Errors: `400`

---

#### `PUT /admin/projects/:id` 🔒 _(EDITOR+)_

Partial update. Translations are upserted. Setting `postId` to a non-empty value clears `blogUrl`.

Response: `200 { "data": Project }` · Errors: `400` `403` `404`

---

#### `PUT /admin/projects/reorder` 🔒 _(EDITOR+)_

```json
{ "ids": ["clx…", "cly…", "clz…"] }
```

Each id's array index becomes its `order` value (single transaction).

Response: `{ "data": { "reordered": 3 } }`

---

#### `DELETE /admin/projects/:id` 🔒 _(EDITOR+)_

Cascades to all translations. Response: `204`

---

### Comments Endpoints

#### `GET /posts/:postId/comments`

Public. Returns the approved comment tree for a post (nested replies included).

---

#### `POST /posts/:postId/comments`

Public.

```json
{ "content": "Great post!", "authorName": "Jane", "authorEmail": "jane@example.com", "parentId": null }
```

Response: `201 { "data": Comment, "message": "Comment submitted for review" }`

---

#### `GET /admin/comments` 🔒

| Query param | Description |
|-------------|-------------|
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

### Skills Endpoints

#### `GET /skills`

Public.

| Query param | Description |
|-------------|-------------|
| `category` | Filter by category (e.g. `Frontend`) |

Response: `{ "data": Skill[] }`

---

#### Admin CRUD 🔒 _(EDITOR+)_

`GET /admin/skills` · `POST /admin/skills` · `PUT /admin/skills/:id` · `DELETE /admin/skills/:id`

`POST` / `PUT` body:

```json
{
  "name": "TypeScript",
  "slug": "typescript",
  "category": "Frontend",
  "level": "EXPERT",
  "icon": "typescript",
  "order": 0,
  "visible": true
}
```

#### `PUT /admin/skills/reorder` 🔒

```json
{ "ids": ["clx…", "cly…", "clz…"] }
```

Response: `204`

---

### Work Experience Endpoints

#### `GET /experiences`

Public. Returns all experiences ordered by `order`, flattened to the requested locale.

| Query param | Description |
|-------------|-------------|
| `lang` | Preferred locale (fallback applies) |

---

#### Admin CRUD 🔒 _(EDITOR+)_

`GET /admin/experiences` · `GET /admin/experiences/:id` (with all translations) · `POST /admin/experiences` · `PUT /admin/experiences/:id` · `PUT /admin/experiences/reorder` · `DELETE /admin/experiences/:id`

`POST` / `PUT` body:

```json
{
  "company": "Acme Corp",
  "location": "Paris, France",
  "startDate": "2022-01-01T00:00:00.000Z",
  "endDate": null,
  "url": "https://acme.com",
  "logoUrl": "/uploads/acme.webp",
  "translations": {
    "en": { "role": "Senior Engineer", "description": { "type": "doc", "content": [] } },
    "fr": { "role": "Ingénieur Senior", "description": { "type": "doc", "content": [] } }
  }
}
```

---

### Education Endpoints

Same structure as Work Experience.

`GET /education?lang=fr` · `GET /admin/education` · `GET /admin/education/:id` · `POST /admin/education` · `PUT /admin/education/:id` · `PUT /admin/education/reorder` · `DELETE /admin/education/:id`

`POST` / `PUT` body:

```json
{
  "institution": "MIT",
  "field": "Computer Science",
  "startDate": "2018-09-01T00:00:00.000Z",
  "endDate": "2022-06-30T00:00:00.000Z",
  "translations": {
    "en": { "degree": "Bachelor of Science", "description": { "type": "doc", "content": [] } }
  }
}
```

---

### Testimonials Endpoints

#### `GET /testimonials`

Public.

| Query param | Description |
|-------------|-------------|
| `featured` | `true` to filter to featured only |

---

#### Admin CRUD 🔒 _(EDITOR+)_

`GET /admin/testimonials` · `POST /admin/testimonials` · `PUT /admin/testimonials/:id` · `PUT /admin/testimonials/reorder` · `DELETE /admin/testimonials/:id`

`POST` / `PUT` body:

```json
{
  "author": "Jane Smith",
  "role": "CTO",
  "company": "Acme Corp",
  "avatarUrl": "https://…/avatar.webp",
  "content": "Working with this developer was a pleasure…",
  "rating": 5,
  "featured": true,
  "visible": true
}
```

---

### Contact Endpoints

#### `POST /contact`

Public. Rate-limited to **3 requests per minute per IP**.

```json
{ "name": "John Doe", "email": "john@example.com", "subject": "Project inquiry", "message": "Hello…" }
```

Response: `201 { "data": ContactSubmission, "message": "Your message has been received." }`

Fires a `contact.submitted` webhook. Errors: `400` · `429` rate limit

---

#### `GET /admin/contact/new-count` 🔒

```json
{ "count": 3 }
```

---

#### `GET /admin/contact` 🔒 _(EDITOR+)_

| Query param | Description |
|-------------|-------------|
| `status` | `NEW` / `READ` / `ARCHIVED` |
| `page`, `limit` | Pagination |

---

#### `PATCH /admin/contact/:id` 🔒 _(EDITOR+)_

```json
{ "status": "ARCHIVED" }
```

#### `DELETE /admin/contact/:id` 🔒 _(EDITOR+)_

Response: `204`

---

### Certifications Endpoints

#### `GET /certifications`

Public. All certifications, ordered by `order`.

---

#### Admin CRUD 🔒 _(EDITOR+)_

`GET /admin/certifications` · `POST /admin/certifications` · `PUT /admin/certifications/:id` · `PUT /admin/certifications/reorder` · `DELETE /admin/certifications/:id`

`POST` / `PUT` body:

```json
{
  "title": "AWS Solutions Architect – Associate",
  "issuer": "Amazon Web Services",
  "issuedAt": "2024-03-01T00:00:00.000Z",
  "expiresAt": "2027-03-01T00:00:00.000Z",
  "credentialUrl": "https://aws.amazon.com/verification/…",
  "logoUrl": "/uploads/aws.webp"
}
```

---

### Media Endpoints

Uploaded files are stored in `apps/api/uploads/` and served at `/uploads/*`.

#### `POST /admin/media` 🔒

Upload an image. Accepts `multipart/form-data` with field `file`.

- Raster images → resized to max 1920 × 1920 px, converted to **WebP** at quality 85
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
    "filename": "98fbf911-….webp",
    "originalName": "photo.jpg",
    "mimeType": "image/webp",
    "size": 42768,
    "url": "/uploads/98fbf911-….webp"
  }
}
```

Errors: `400` no file · `415` unsupported type

---

#### `GET /admin/media` 🔒

List all uploaded files, newest first.

---

#### `DELETE /admin/media/:filename` 🔒

Response: `204` · Errors: `400` · `404`

---

### Users Endpoints _(ADMIN only)_

#### `GET /admin/users` 🔒

List all users.

---

#### `POST /admin/users` 🔒

```json
{ "email": "author@example.com", "password": "SecurePass1!", "name": "John", "role": "AUTHOR" }
```

Response: `201 { "data": User }` · Errors: `400` `409` email taken

---

#### `PUT /admin/users/:id` 🔒

```json
{ "name": "John", "role": "EDITOR", "password": "NewPass1!" }
```

Response: `200 { "data": User }`

---

#### `DELETE /admin/users/:id` 🔒

Cannot delete your own account. Response: `204`

---

### Settings Endpoints

#### `GET /settings`

Public. Returns full site settings.

---

#### `PUT /admin/settings` 🔒 _(ADMIN)_

```json
{
  "themeConfig": { "colors": { "primary": "#6366f1" } },
  "brandConfig": {
    "siteName": "My Portfolio",
    "tagline": "Full-stack engineer",
    "siteUrl": "https://example.com",
    "socialLinks": [
      { "platform": "github",   "url": "https://github.com/username" },
      { "platform": "linkedin", "url": "https://linkedin.com/in/username" }
    ]
  }
}
```

`brandConfig` fields:

| Field | Description |
|-------|-------------|
| `siteName` | Replaces "Chronos CMS" in headers and browser title |
| `tagline` | Short subtitle below the blog heading |
| `seoTitle` | Global `<title>` tag |
| `seoDescription` | Global meta description |
| `logoUrl` | Optional logo image URL |
| `ogImage` | Default Open Graph image (1200×630 px recommended) |
| `siteUrl` | Canonical root URL — used by `GET /sitemap.xml` as the `<loc>` base |
| `socialLinks` | Array of `{ platform, url }` — 14 platforms supported: `github`, `linkedin`, `twitter`, `bluesky`, `mastodon`, `instagram`, `youtube`, `twitch`, `devto`, `dribbble`, `codepen`, `stackoverflow`, `discord`, `rss` |

Response: `200 { "data": SiteSettings }`

---

### Webhooks Endpoints

Outbound HTTP callbacks fired on CMS events. All payloads include a full `translations[]` array.

#### Webhook events

| Event | Fired when |
|-------|-----------|
| `post.created` | A post is created |
| `post.updated` | A published post is updated |
| `post.published` | A post transitions to `PUBLISHED` |
| `post.deleted` | A post is deleted |
| `page.created` | A page is created |
| `page.updated` | A published page is updated |
| `page.published` | A page transitions to `PUBLISHED` |
| `page.deleted` | A page is deleted |
| `project.published` | A project is created as / transitions to `PUBLISHED` |
| `project.updated` | A published project is updated |
| `project.deleted` | A project is deleted |
| `contact.submitted` | A contact form submission is received |

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

If a `secret` is configured, the request includes `X-Webhook-Signature: sha256=<hmac>`.

---

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

#### `PUT /admin/webhooks/:id` 🔒 · `DELETE /admin/webhooks/:id` 🔒

#### `POST /admin/webhooks/:id/test` 🔒

Response: `{ "ok": true, "status": 200 }`

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
    "id": "clx…",
    "name": "CI Deploy Key",
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

RSS 2.0 feed of the latest 20 published posts.

| Query param | Description |
|-------------|-------------|
| `lang` | Return items in this locale (falls back to `defaultLocale`) |

---

#### `GET /rss/:lang.xml`

Per-locale RSS feed.

```
GET /rss/fr.xml
GET /rss/en-us.xml
```

```html
<link rel="alternate" type="application/rss+xml" title="Blog (EN)" href="https://example.com/rss/en.xml" />
<link rel="alternate" type="application/rss+xml" title="Blog (FR)" href="https://example.com/rss/fr.xml" />
```

---

#### `GET /sitemap.xml`

XML sitemap covering all published posts, projects, and pages — one `<url>` per locale translation. Base URL is read from `brandConfig.siteUrl`.

| Content type | Path pattern | Priority | Changefreq |
|-------------|-------------|---------|-----------|
| Homepage | `/` | `1.0` | daily |
| Posts | `/posts/:slug` | `0.8` | weekly |
| Projects | `/projects/:slug` | `0.7` | weekly |
| Pages | `/:slug` | `0.6` | monthly |

---

### Stats Endpoint

#### `GET /admin/stats` 🔒

```json
{
  "data": {
    "posts":    { "total": 24, "published": 18, "draft": 6 },
    "pages":    { "total": 4,  "published": 3,  "draft": 1 },
    "projects": { "total": 6,  "published": 5,  "draft": 1 },
    "media":    { "total": 38 },
    "users":    { "total": 3 },
    "recentPosts":    [ { "id": "…", "title": "…", "slug": "…", "status": "PUBLISHED" } ],
    "recentPages":    [ { "id": "…", "title": "…", "slug": "…", "status": "PUBLISHED" } ],
    "recentProjects": [ { "id": "…", "title": "…", "slug": "…", "status": "PUBLISHED" } ]
  }
}
```

---

### Health Check

#### `GET /health`

```json
{ "status": "ok", "ts": "2026-03-13T10:00:00.000Z" }
```

---

## Content Formats

All public read endpoints accept `?format=`:

| Value | Response type | Description |
|-------|-------------|-------------|
| `json` *(default)* | `object` | Raw TipTap ProseMirror JSON |
| `html` | `string` | Full HTML with inline styles for images |
| `markdown` | `string` | CommonMark Markdown |

The conversion runs server-side in `contentTransformer.ts`.

### Supported node types

`doc` `paragraph` `heading` `blockquote` `codeBlock` `bulletList` `orderedList` `listItem` `image` `horizontalRule` `hardBreak` `text`

### Supported marks

`bold` `italic` `code` `strike` `underline` `link`

---

## Internationalisation (i18n)

### How it works

Translatable content lives in `PostTranslation` / `PageTranslation` / `ProjectTranslation` rows rather than on the parent record. The parent holds only locale-agnostic metadata (`status`, `featured`, `scheduledAt`, …).

```
Post (id, defaultLocale, status, …)
  └── PostTranslation (locale="en", title, slug, content, …)
  └── PostTranslation (locale="fr", title, slug, content, …)
  └── PostTranslation (locale="es", …)
```

### Adding a locale in the editor

1. Open the post, page, or project editor.
2. Click **+** at the end of the locale tab bar.
3. Type any BCP-47 code (`es`, `de`, `zh-tw`, …) or click a suggestion.
4. Fill in the title, slug, and content for that locale.
5. Save — the API upserts translations for all filled locales.

The **default locale** (marked ★) determines the fallback and which title/slug appears in admin lists.

### API locale selection

| Scenario | Request |
|---------|---------|
| Posts in French (fallback OK) | `GET /posts?lang=fr` |
| Posts with an exact French translation | `GET /posts?lang=fr&strict=1` |
| Specific post in French | `GET /posts/my-post?lang=fr` |
| Post by its French slug | `GET /posts/mon-article` |
| French RSS feed | `GET /rss/fr.xml` |

### `hreflang` response field

Every public post, page, and project response includes:

```json
"hreflang": [
  { "locale": "en", "slug": "my-post" },
  { "locale": "fr", "slug": "mon-article" },
  { "locale": "es", "slug": "mi-articulo" }
]
```

Inject into `<head>`:

```html
<link rel="alternate" hreflang="en" href="https://example.com/posts/my-post" />
<link rel="alternate" hreflang="fr" href="https://example.com/posts/mon-article" />
<link rel="alternate" hreflang="x-default" href="https://example.com/posts/my-post" />
```

---

## Editor Architecture

```
RichTextEditor.tsx              ← extension registry + useEditor
  ├── EditorToolbar.tsx         ← full fixed toolbar
  │   └── MediaPickerModal.tsx  ← media library overlay
  └── EditorContent             ← TipTap contenteditable
        └── (BubbleMenu)        ← inline text selection toolbar
```

### Extensions

| Extension | Package | Purpose |
|-----------|---------|---------|
| `StarterKit` | `@tiptap/starter-kit` | Paragraph, headings (H1–H4), bold, italic, strike, lists, blockquote, code, history |
| `Underline` | `@tiptap/extension-underline` | Underline mark |
| `TextAlign` | `@tiptap/extension-text-align` | Left / center / right / justify |
| `TextStyle` | `@tiptap/extension-text-style` | Base for color and font size |
| `Color` | `@tiptap/extension-color` | Inline text colour |
| `Highlight` | `@tiptap/extension-highlight` | Multi-colour highlight |
| `Link` | `@tiptap/extension-link` | Hyperlinks |
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
import { PostRenderer } from "@/components/editor/PostRenderer"

<PostRenderer doc={post.content} className="my-prose" />
```

---

## Frontend Pages & Routing

| Path | Component | Access | Description |
|------|-----------|--------|-------------|
| `/` | `BlogFeedPage` | Public | Paginated post feed with search and sidebar |
| `/posts/:slug` | `BlogPostPage` | Public | Single post + language switcher |
| `/projects` | `ProjectsPage` | Public | Portfolio grid |
| `/projects/:slug` | `ProjectDetailPage` | Public | Single project + language switcher |
| `/:slug` | `CustomPageView` | Public | Custom CMS page + language switcher |
| `/login` | `LoginPage` | Public | Email + password login |
| `/admin` | `AdminDashboard` | 🔒 | Stats + recent activity |
| `/admin/posts/new` | `PostEditorPage` | 🔒 | Create post |
| `/admin/posts/:id/edit` | `PostEditorPage` | 🔒 | Edit post + revision history |
| `/admin/pages` | `PagesAdmin` | 🔒 | Custom pages list |
| `/admin/pages/new` | `PageEditorPage` | 🔒 | Create page |
| `/admin/pages/:id/edit` | `PageEditorPage` | 🔒 | Edit page |
| `/admin/projects` | `ProjectsAdmin` | 🔒 | Projects list with drag reordering |
| `/admin/projects/new` | `ProjectEditorPage` | 🔒 | Create project |
| `/admin/projects/:id/edit` | `ProjectEditorPage` | 🔒 | Edit project |
| `/admin/skills` | `SkillsAdmin` | 🔒 | Skills CRUD |
| `/admin/experiences` | `ExperiencesAdmin` | 🔒 | Work experience CRUD |
| `/admin/education` | `EducationAdmin` | 🔒 | Education CRUD |
| `/admin/testimonials` | `TestimonialsAdmin` | 🔒 | Testimonials CRUD |
| `/admin/contact` | `ContactAdmin` | 🔒 | Contact submissions inbox |
| `/admin/certifications` | `CertificationsAdmin` | 🔒 | Certifications CRUD |
| `/admin/design` | `DesignCustomizer` | 🔒 | Theme settings |
| `/admin/media` | `MediaLibrary` | 🔒 | Upload and manage images |
| `/admin/comments` | `CommentsAdmin` | 🔒 | Moderate comments |
| `/admin/webhooks` | `WebhooksAdmin` | 🔒 | Manage webhooks |
| `/admin/apikeys` | `ApiKeysAdmin` | 🔒 | Manage API keys |
| `/admin/branding` | `BrandingPage` | 🔒 | Site name, logo, SEO, social links |
| `/admin/users` | `UserManagement` | 🔒 ADMIN | Invite users, change roles |

All admin routes are wrapped in `ProtectedRoute`. All pages are lazy-loaded.

---

## Authentication Flow

```
POST /auth/login
  → { token, user }
  → stored in localStorage ("chronos_token")
  → AuthContext: status = "authenticated"
  → all requests: Authorization: Bearer <token>

Page refresh:
  → GET /auth/me
  → success: restore session
  → failure (expired): clear token, redirect /login
```

JWT payload:

```typescript
type JwtPayload = {
  sub: string   // user id
  email: string
  role: "ADMIN" | "EDITOR" | "AUTHOR"
}
```

---

## Role System

| Role | Permissions |
|------|------------|
| `AUTHOR` | Create posts; edit/delete **own** posts only |
| `EDITOR` | Create/edit/delete **any** post, manage pages and projects |
| `ADMIN` | Everything + user management and theme settings |

Enforcement:

- `requireRole(request, reply, "ADMIN")` — gates an entire route
- `isOwnerOrMinRole(request, ownerId, "EDITOR")` — allows post owner OR minimum role

---

## Post Scheduling

Set `scheduledAt` to a future ISO 8601 datetime with `status: "DRAFT"`. A background job in `server.ts` runs every 60 seconds:

```
Every 60 s:
  UPDATE posts
  SET status = 'PUBLISHED', publishedAt = NOW()
  WHERE status = 'DRAFT' AND scheduledAt <= NOW()
```

The scheduler runs once immediately on server start, then on the interval.

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

- **Alignment**: `⇤ Left` (float) · `⇔ Center` · `Right ⇥` (float) · `⊡ Block` (full width)
- **Width presets**: `25%` `33%` `50%` `75%` `100%`
- **Reset** `↺` · **Delete** `✕`
- **Resize handles**: drag the right edge or bottom-right corner

### URL resolution

In development, `/uploads/*` is proxied by Vite to the API. In production, `VITE_API_URL` is used. The `resolveMediaUrl` helper in `api.ts` handles both cases.

---

## Docker & Self-Hosting

### Services

| Service | Image | Port | Description |
|---------|-------|------|-------------|
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
|------|--------|
| **Arrow functions only** | No `function` declarations |
| **Strict TypeScript** | `strict: true`, `noUncheckedIndexedAccess: true`, `exactOptionalPropertyTypes: true` |
| **Zod at I/O boundaries** | Every request body validated with `z.safeParse()` |
| **No `dangerouslySetInnerHTML`** | `PostRenderer` uses pure React elements |
| **`as any` only for stale Prisma types** | New schema fields need `prisma generate` after server restart on Windows |
| **CUID primary keys** | All models use `@default(cuid())` |
| **Named exports for utilities** | Default exports only for pages / React components |
| **Partial updates via conditional spread** | `...(field !== undefined && { field })` — never spread a Zod partial directly into a Prisma call |
| **i18n field access** | Never read `post.title` directly from DB — always go through `pickTranslation()` / `flattenPost()` / `flattenPage()` helpers |
