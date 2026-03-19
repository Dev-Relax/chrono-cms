-- Feature: add AUTHOR role, post scheduling, custom pages
-- Note: ALTER TYPE ADD VALUE runs outside transaction in Prisma (handled automatically for PG 12+)

-- Add AUTHOR to Role enum
ALTER TYPE "Role" ADD VALUE IF NOT EXISTS 'AUTHOR';

-- Add scheduledAt to posts
ALTER TABLE "posts" ADD COLUMN IF NOT EXISTS "scheduledAt" TIMESTAMP(3);
CREATE INDEX IF NOT EXISTS "posts_scheduledAt_idx" ON "posts"("scheduledAt") WHERE "scheduledAt" IS NOT NULL;

-- PageStatus enum
DO $$ BEGIN
  CREATE TYPE "PageStatus" AS ENUM ('DRAFT', 'PUBLISHED');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Pages table
CREATE TABLE IF NOT EXISTS "pages" (
  "id"              TEXT         NOT NULL,
  "title"           TEXT         NOT NULL,
  "slug"            TEXT         NOT NULL,
  "content"         JSONB        NOT NULL DEFAULT '{}',
  "status"          "PageStatus" NOT NULL DEFAULT 'DRAFT',
  "metaTitle"       TEXT,
  "metaDescription" TEXT,
  "ogImage"         TEXT,
  "createdAt"       TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"       TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "authorId"        TEXT         NOT NULL,
  CONSTRAINT "pages_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "pages_slug_key"    ON "pages"("slug");
CREATE INDEX        IF NOT EXISTS "pages_slug_idx"    ON "pages"("slug");
CREATE INDEX        IF NOT EXISTS "pages_status_idx"  ON "pages"("status");

ALTER TABLE "pages"
  ADD CONSTRAINT "pages_authorId_fkey"
  FOREIGN KEY ("authorId") REFERENCES "users"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;
