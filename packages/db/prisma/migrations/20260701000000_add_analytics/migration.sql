-- Analytics: page views and custom events
-- Idempotent: safe to run multiple times

CREATE TABLE IF NOT EXISTS "analytics_page_views" (
  "id"        TEXT NOT NULL,
  "path"      TEXT NOT NULL,
  "referrer"  TEXT,
  "locale"    TEXT,
  "device"    TEXT,
  "sessionId" TEXT NOT NULL,
  "postId"    TEXT,
  "projectId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "analytics_page_views_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "analytics_page_views_path_idx"      ON "analytics_page_views"("path");
CREATE INDEX IF NOT EXISTS "analytics_page_views_createdAt_idx" ON "analytics_page_views"("createdAt" DESC);
CREATE INDEX IF NOT EXISTS "analytics_page_views_sessionId_idx" ON "analytics_page_views"("sessionId");
CREATE INDEX IF NOT EXISTS "analytics_page_views_postId_idx"    ON "analytics_page_views"("postId");
CREATE INDEX IF NOT EXISTS "analytics_page_views_projectId_idx" ON "analytics_page_views"("projectId");

CREATE TABLE IF NOT EXISTS "analytics_events" (
  "id"        TEXT NOT NULL,
  "type"      TEXT NOT NULL,
  "path"      TEXT NOT NULL,
  "target"    TEXT,
  "sessionId" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "analytics_events_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "analytics_events_type_idx"      ON "analytics_events"("type");
CREATE INDEX IF NOT EXISTS "analytics_events_path_idx"      ON "analytics_events"("path");
CREATE INDEX IF NOT EXISTS "analytics_events_createdAt_idx" ON "analytics_events"("createdAt" DESC);
CREATE INDEX IF NOT EXISTS "analytics_events_sessionId_idx" ON "analytics_events"("sessionId");
