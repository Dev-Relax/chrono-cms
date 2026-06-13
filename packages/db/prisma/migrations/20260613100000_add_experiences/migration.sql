-- CreateTable
CREATE TABLE IF NOT EXISTS "experiences" (
    "id" TEXT NOT NULL,
    "company" TEXT NOT NULL,
    "location" TEXT,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3),
    "url" TEXT,
    "logoUrl" TEXT,
    "order" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "experiences_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "experience_translations" (
    "id" TEXT NOT NULL,
    "experienceId" TEXT NOT NULL,
    "locale" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "description" JSONB NOT NULL DEFAULT '{}',

    CONSTRAINT "experience_translations_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX IF NOT EXISTS "experiences_order_idx" ON "experiences"("order");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "experience_translations_experienceId_locale_key" ON "experience_translations"("experienceId", "locale");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "experience_translations_locale_idx" ON "experience_translations"("locale");

-- AddForeignKey
ALTER TABLE "experience_translations" DROP CONSTRAINT IF EXISTS "experience_translations_experienceId_fkey";
ALTER TABLE "experience_translations" ADD CONSTRAINT "experience_translations_experienceId_fkey"
    FOREIGN KEY ("experienceId") REFERENCES "experiences"("id") ON DELETE CASCADE ON UPDATE CASCADE;
