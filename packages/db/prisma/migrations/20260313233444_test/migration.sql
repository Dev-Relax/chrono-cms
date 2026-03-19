/*
  Warnings:

  - You are about to drop the column `content` on the `posts` table. All the data in the column will be lost.
  - You are about to drop the column `excerpt` on the `posts` table. All the data in the column will be lost.
  - You are about to drop the column `metaDescription` on the `posts` table. All the data in the column will be lost.
  - You are about to drop the column `metaTitle` on the `posts` table. All the data in the column will be lost.
  - You are about to drop the column `ogImage` on the `posts` table. All the data in the column will be lost.
  - You are about to drop the column `slug` on the `posts` table. All the data in the column will be lost.
  - You are about to drop the column `title` on the `posts` table. All the data in the column will be lost.

*/
-- DropIndex
DROP INDEX "posts_slug_idx";

-- DropIndex
DROP INDEX "posts_slug_key";

-- AlterTable
ALTER TABLE "post_revisions" ADD COLUMN     "locale" TEXT NOT NULL DEFAULT 'en';

-- AlterTable
ALTER TABLE "posts" DROP COLUMN "content",
DROP COLUMN "excerpt",
DROP COLUMN "metaDescription",
DROP COLUMN "metaTitle",
DROP COLUMN "ogImage",
DROP COLUMN "slug",
DROP COLUMN "title",
ADD COLUMN     "defaultLocale" TEXT NOT NULL DEFAULT 'en';

-- CreateTable
CREATE TABLE "post_translations" (
    "id" TEXT NOT NULL,
    "postId" TEXT NOT NULL,
    "locale" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "content" JSONB NOT NULL DEFAULT '{}',
    "excerpt" TEXT,
    "metaTitle" TEXT,
    "metaDescription" TEXT,
    "ogImage" TEXT,

    CONSTRAINT "post_translations_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "post_translations_slug_idx" ON "post_translations"("slug");

-- CreateIndex
CREATE INDEX "post_translations_locale_idx" ON "post_translations"("locale");

-- CreateIndex
CREATE UNIQUE INDEX "post_translations_postId_locale_key" ON "post_translations"("postId", "locale");

-- CreateIndex
CREATE UNIQUE INDEX "post_translations_locale_slug_key" ON "post_translations"("locale", "slug");

-- CreateIndex
CREATE INDEX "post_revisions_postId_locale_idx" ON "post_revisions"("postId", "locale");

-- AddForeignKey
-- NOTE: posts_scheduledAt_idx already exists from a prior migration — not recreated.
ALTER TABLE "post_translations" ADD CONSTRAINT "post_translations_postId_fkey" FOREIGN KEY ("postId") REFERENCES "posts"("id") ON DELETE CASCADE ON UPDATE CASCADE;
