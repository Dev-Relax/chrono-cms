-- AlterTable pages
ALTER TABLE "pages" ADD COLUMN IF NOT EXISTS "pageConfig" JSONB NOT NULL DEFAULT '{}';
-- AlterTable page_translations
ALTER TABLE "page_translations" ADD COLUMN IF NOT EXISTS "heroContent" JSONB;
