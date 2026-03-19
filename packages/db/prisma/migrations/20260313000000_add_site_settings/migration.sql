-- CreateTable
CREATE TABLE "site_settings" (
    "id" TEXT NOT NULL,
    "themeConfig" JSONB NOT NULL DEFAULT '{}',
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "site_settings_pkey" PRIMARY KEY ("id")
);
