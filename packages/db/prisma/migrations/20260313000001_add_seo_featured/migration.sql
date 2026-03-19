-- AlterTable: add SEO fields and featured flag to posts
ALTER TABLE "posts"
  ADD COLUMN "featured"         BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "metaTitle"        TEXT,
  ADD COLUMN "metaDescription"  TEXT,
  ADD COLUMN "ogImage"          TEXT;

-- Index for featured posts feed ordering
CREATE INDEX "posts_featured_idx" ON "posts"("featured");
