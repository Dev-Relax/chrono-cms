-- Migration: page_translations
-- Moves translatable fields (title, slug, content, metaTitle, metaDescription, ogImage)
-- from the pages table into a new page_translations table, preserving all existing data.

-- Step 1: Add defaultLocale to pages
ALTER TABLE "pages" ADD COLUMN "defaultLocale" TEXT NOT NULL DEFAULT 'en';

-- Step 2: Create page_translations table
CREATE TABLE "page_translations" (
    "id"              TEXT NOT NULL,
    "pageId"          TEXT NOT NULL,
    "locale"          TEXT NOT NULL,
    "title"           TEXT NOT NULL,
    "slug"            TEXT NOT NULL,
    "content"         JSONB NOT NULL DEFAULT '{}',
    "metaTitle"       TEXT,
    "metaDescription" TEXT,
    "ogImage"         TEXT,
    CONSTRAINT "page_translations_pkey" PRIMARY KEY ("id")
);

-- Step 3: Migrate existing page data into page_translations (preserve as "en")
INSERT INTO "page_translations" ("id", "pageId", "locale", "title", "slug", "content", "metaTitle", "metaDescription", "ogImage")
SELECT
    gen_random_uuid()::text,
    "id",
    'en',
    "title",
    "slug",
    "content",
    "metaTitle",
    "metaDescription",
    "ogImage"
FROM "pages";

-- Step 4: Add foreign key + unique/index constraints
ALTER TABLE "page_translations"
    ADD CONSTRAINT "page_translations_pageId_fkey"
    FOREIGN KEY ("pageId") REFERENCES "pages"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE UNIQUE INDEX "page_translations_pageId_locale_key" ON "page_translations"("pageId", "locale");
CREATE UNIQUE INDEX "page_translations_locale_slug_key"   ON "page_translations"("locale", "slug");
CREATE INDEX "page_translations_slug_idx"   ON "page_translations"("slug");
CREATE INDEX "page_translations_locale_idx" ON "page_translations"("locale");

-- Step 5: Drop old slug unique constraint and translatable columns from pages
ALTER TABLE "pages" DROP CONSTRAINT IF EXISTS "pages_slug_key";
DROP INDEX IF EXISTS "pages_slug_key";
DROP INDEX IF EXISTS "pages_slug_idx";

ALTER TABLE "pages"
    DROP COLUMN "title",
    DROP COLUMN "slug",
    DROP COLUMN "content",
    DROP COLUMN "metaTitle",
    DROP COLUMN "metaDescription",
    DROP COLUMN "ogImage";
