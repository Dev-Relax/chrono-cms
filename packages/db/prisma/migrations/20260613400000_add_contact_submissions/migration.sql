-- Feature 6: Contact Submissions
-- Idempotent: safe to run multiple times

DO $$ BEGIN
  CREATE TYPE "SubmissionStatus" AS ENUM ('NEW', 'READ', 'ARCHIVED');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS "contact_submissions" (
  "id"        TEXT NOT NULL,
  "name"      TEXT NOT NULL,
  "email"     TEXT NOT NULL,
  "subject"   TEXT,
  "message"   TEXT NOT NULL,
  "status"    "SubmissionStatus" NOT NULL DEFAULT 'NEW',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "contact_submissions_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "contact_submissions_status_idx" ON "contact_submissions"("status");
CREATE INDEX IF NOT EXISTS "contact_submissions_createdAt_idx" ON "contact_submissions"("createdAt" DESC);
