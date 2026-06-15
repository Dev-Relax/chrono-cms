# Chronos CMS

> A self-hosted headless CMS built for developer portfolios — manage your blog posts, projects, skills, work history, testimonials, and certifications in one place, then expose it all through a clean REST API so any frontend can consume it.

---

## What it does

Chronos CMS gives you a single backend to power your entire online presence:

- **Blog** — rich-text editor (TipTap 2), tags, scheduling, revision history, full-text search
- **Portfolio projects** — showcase grid with tech-stack chips, GitHub/live links, cover images, manual ordering
- **CV data** — skills, work experience, education, certifications, testimonials
- **Contact inbox** — rate-limited public form, admin inbox, reply-by-email shortcut
- **Headless API** — every content type is available over REST; content format negotiation (`?format=html|markdown`), webhook events, API keys
- **Built-in frontend** — optional React + Vite public site if you don't have your own frontend; design customizer for layout, colours, and widgets
- **Internationalisation** — add any BCP-47 locale to any post, page, or project; per-locale slugs, fallback chain, `hreflang[]` on every response, per-locale RSS feeds

---

## Tech stack

| Layer | Tools |
|-------|-------|
| Frontend | React 18, Vite 5, TypeScript 5, Tailwind CSS 3, TipTap 2, React Router 6, react-i18next |
| Backend | Fastify 4, TypeScript 5, Zod 3, `@fastify/jwt`, `@fastify/multipart`, `sharp` |
| Database | PostgreSQL 16, Prisma ORM 5 |
| Monorepo | npm workspaces (`packages/db`, `apps/api`, `apps/web`) |

---

## Quick start — Docker

```bash
git clone https://github.com/your-org/chronos-cms.git
cd chronos-cms

cp .env.example .env        # set JWT_SECRET at minimum

docker compose up -d

docker compose exec api npm run db:migrate
docker compose exec api npm run db:seed
```

| | Default |
|--|---------|
| Public site | http://localhost:5173 |
| Admin | http://localhost:5173/login |
| API | http://localhost:4000 |
| Email | `admin@chronos.dev` |
| Password | `Admin1234!` |

> Change the default credentials and set a strong `JWT_SECRET` before exposing to the internet.

---

## Quick start — local development

```bash
npm install
cp .env.example .env          # set DATABASE_URL + JWT_SECRET
npm run db:migrate
npm run db:seed
npm run dev                   # API :4000 + Web :5173
```

After changing `schema.prisma`:

```bash
npm run db:migrate:dev
npx prisma generate --schema packages/db/prisma/schema.prisma
npm run dev
```

---

## Environment variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `DATABASE_URL` | ✅ | — | PostgreSQL connection string |
| `JWT_SECRET` | ✅ | — | Token signing key — use ≥ 48 random chars |
| `JWT_EXPIRES_IN` | | `7d` | Token lifetime (`1h`, `7d`, `30d` …) |
| `API_PORT` | | `4000` | Fastify listen port |
| `CORS_ORIGIN` | | `http://localhost:5173` | Comma-separated allowed origins |
| `VITE_API_URL` | | *(proxy)* | API origin seen from the browser. In dev the Vite proxy handles `/api` and `/uploads` automatically; set this only in production builds |
| `ADMIN_EMAIL` | | `admin@chronos.dev` | Seeded admin email |
| `ADMIN_PASSWORD` | | `Admin1234!` | Seeded admin password |

Generate a secret:

```bash
node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
```

---

## Project structure

```
chrono-cms/
├── packages/
│   └── db/                  # @chronos/db — Prisma schema, client, seed
│       └── prisma/
│           ├── schema.prisma
│           └── migrations/
└── apps/
    ├── api/                 # @chronos/api — Fastify REST API
    │   └── src/
    │       ├── server.ts
    │       ├── routes/      # one file per resource
    │       └── utils/
    └── web/                 # @chronos/web — React + Vite admin UI + public site
        └── src/
            ├── pages/
            │   └── admin/
            └── components/
                └── editor/
```

---

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start API (4000) + Web (5173) in parallel |
| `npm run build` | Build all packages |
| `npm run db:migrate` | `prisma migrate deploy` — production |
| `npm run db:migrate:dev` | `prisma migrate dev` — local dev |
| `npm run db:seed` | Seed admin user + sample post |
| `npm run db:studio` | Open Prisma Studio on port 5555 |

---

## LLM reference

A machine-readable API reference is available at `GET /llms.txt` (served by the API) and at [`llms.txt`](llms.txt) in this repo. Paste it into any LLM chat to get AI assistance managing your portfolio content.

---

## Full documentation

See **[DOCS.md](DOCS.md)** for:

- Database schema (all models and fields)
- Full API reference (every endpoint, request/response shapes)
- Content formats (TipTap JSON, HTML, Markdown)
- Internationalisation guide
- Editor architecture
- Frontend pages & routing
- Authentication flow
- Role system
- Post scheduling
- Image handling
- Docker & self-hosting
- Coding conventions

---

*Built for developers who want a single, self-hosted backend to power their portfolio — writing, projects, and professional history all in one place.*
