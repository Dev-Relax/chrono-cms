-- AlterTable
ALTER TABLE "site_settings" ADD COLUMN IF NOT EXISTS "navConfig" JSONB NOT NULL DEFAULT '{}';
