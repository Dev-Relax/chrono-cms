-- Feature: webhooks, API keys, post revisions, activity log

-- ── Webhooks ──────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS "webhooks" (
  "id"        TEXT         NOT NULL,
  "name"      TEXT         NOT NULL,
  "url"        TEXT         NOT NULL,
  "secret"    TEXT,
  "events"    TEXT[]       NOT NULL DEFAULT '{}',
  "active"    BOOLEAN      NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "webhooks_pkey" PRIMARY KEY ("id")
);

-- ── API Keys ──────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS "api_keys" (
  "id"         TEXT         NOT NULL,
  "name"       TEXT         NOT NULL,
  "keyHash"    TEXT         NOT NULL,
  "prefix"     TEXT         NOT NULL,
  "userId"     TEXT         NOT NULL,
  "lastUsedAt" TIMESTAMP(3),
  "createdAt"  TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "api_keys_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "api_keys_keyHash_key" ON "api_keys"("keyHash");
CREATE INDEX        IF NOT EXISTS "api_keys_keyHash_idx" ON "api_keys"("keyHash");

ALTER TABLE "api_keys"
  ADD CONSTRAINT "api_keys_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "users"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

-- ── Post Revisions ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS "post_revisions" (
  "id"        TEXT         NOT NULL,
  "postId"    TEXT         NOT NULL,
  "title"     TEXT         NOT NULL,
  "content"   JSONB        NOT NULL DEFAULT '{}',
  "userId"    TEXT         NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "post_revisions_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "post_revisions_postId_idx" ON "post_revisions"("postId");

ALTER TABLE "post_revisions"
  ADD CONSTRAINT "post_revisions_postId_fkey"
  FOREIGN KEY ("postId") REFERENCES "posts"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "post_revisions"
  ADD CONSTRAINT "post_revisions_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "users"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

-- ── Activity Log ──────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS "activity_logs" (
  "id"          TEXT         NOT NULL,
  "userId"      TEXT         NOT NULL,
  "action"      TEXT         NOT NULL,
  "entityType"  TEXT         NOT NULL,
  "entityId"    TEXT,
  "entityTitle" TEXT,
  "createdAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "activity_logs_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "activity_logs_createdAt_idx" ON "activity_logs"("createdAt" DESC);
CREATE INDEX IF NOT EXISTS "activity_logs_userId_idx"    ON "activity_logs"("userId");

ALTER TABLE "activity_logs"
  ADD CONSTRAINT "activity_logs_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "users"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;
