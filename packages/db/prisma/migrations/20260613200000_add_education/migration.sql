-- CreateTable
CREATE TABLE IF NOT EXISTS "education" (
    "id" TEXT NOT NULL,
    "institution" TEXT NOT NULL,
    "field" TEXT,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3),
    "url" TEXT,
    "logoUrl" TEXT,
    "order" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "education_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "education_translations" (
    "id" TEXT NOT NULL,
    "educationId" TEXT NOT NULL,
    "locale" TEXT NOT NULL,
    "degree" TEXT NOT NULL,
    "description" JSONB NOT NULL DEFAULT '{}',

    CONSTRAINT "education_translations_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX IF NOT EXISTS "education_order_idx" ON "education"("order");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "education_translations_educationId_locale_key" ON "education_translations"("educationId", "locale");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "education_translations_locale_idx" ON "education_translations"("locale");

-- AddForeignKey
ALTER TABLE "education_translations" DROP CONSTRAINT IF EXISTS "education_translations_educationId_fkey";
ALTER TABLE "education_translations" ADD CONSTRAINT "education_translations_educationId_fkey"
    FOREIGN KEY ("educationId") REFERENCES "education"("id") ON DELETE CASCADE ON UPDATE CASCADE;
