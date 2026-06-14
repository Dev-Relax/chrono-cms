-- Feature 8: Certifications
-- Idempotent: safe to run multiple times

CREATE TABLE IF NOT EXISTS "certifications" (
  "id"            TEXT NOT NULL,
  "title"         TEXT NOT NULL,
  "issuer"        TEXT NOT NULL,
  "issuedAt"      TIMESTAMP(3) NOT NULL,
  "expiresAt"     TIMESTAMP(3),
  "credentialUrl" TEXT,
  "logoUrl"       TEXT,
  "order"         INTEGER NOT NULL DEFAULT 0,
  "createdAt"     TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"     TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "certifications_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "certifications_order_idx" ON "certifications"("order");
