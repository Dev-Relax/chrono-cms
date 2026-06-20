-- Feature: Certification translations (i18n)
-- Adds per-locale title and rich-text description to certifications.

CREATE TABLE IF NOT EXISTS "certification_translations" (
  "id"              TEXT NOT NULL,
  "certificationId" TEXT NOT NULL,
  "locale"          TEXT NOT NULL,
  "title"           TEXT NOT NULL,
  "description"     JSONB NOT NULL DEFAULT '{}',
  CONSTRAINT "certification_translations_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "certification_translations_certificationId_fkey"
    FOREIGN KEY ("certificationId")
    REFERENCES "certifications"("id")
    ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS "certification_translations_certificationId_locale_key"
  ON "certification_translations"("certificationId", "locale");

CREATE INDEX IF NOT EXISTS "certification_translations_locale_idx"
  ON "certification_translations"("locale");
