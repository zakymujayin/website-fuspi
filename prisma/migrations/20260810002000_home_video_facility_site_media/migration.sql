-- CreateEnum
CREATE TYPE "FacilityType" AS ENUM ('BANGUNAN', 'LABORATORIUM', 'PERPUSTAKAAN', 'MUSHOLA', 'AULA', 'PARKIR', 'KANTIN', 'LAINNYA');

-- AlterTable
ALTER TABLE "SiteSetting"
  ADD COLUMN "faviconMediaId" TEXT,
  ADD COLUMN "logoMediaId" TEXT;

-- CreateTable
CREATE TABLE "HomeVideo" (
    "id" TEXT NOT NULL,
    "youtubeUrl" TEXT NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,
    "isVisible" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "HomeVideo_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "HomeVideoTranslation" (
    "id" TEXT NOT NULL,
    "homeVideoId" TEXT NOT NULL,
    "locale" "Locale" NOT NULL,
    "title" TEXT NOT NULL,
    "status" "TranslationStatus" NOT NULL DEFAULT 'DRAFT',
    "sourceVersion" INTEGER NOT NULL DEFAULT 1,
    "translatorId" TEXT,
    "reviewerId" TEXT,
    "reviewedAt" TIMESTAMP(3),

    CONSTRAINT "HomeVideoTranslation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Facility" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "type" "FacilityType" NOT NULL DEFAULT 'BANGUNAN',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "order" INTEGER NOT NULL DEFAULT 0,
    "version" INTEGER NOT NULL DEFAULT 1,
    "coverMediaId" TEXT,
    "contentOwnerId" TEXT,
    "governanceStatus" "GovernanceStatus" NOT NULL DEFAULT 'CURRENT',
    "lastReviewedAt" TIMESTAMP(3),
    "lastReviewedById" TEXT,
    "reviewDueAt" TIMESTAMP(3),
    "expiresAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Facility_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FacilityTranslation" (
    "id" TEXT NOT NULL,
    "facilityId" TEXT NOT NULL,
    "locale" "Locale" NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "status" "TranslationStatus" NOT NULL DEFAULT 'DRAFT',
    "sourceVersion" INTEGER NOT NULL DEFAULT 1,
    "translatorId" TEXT,
    "reviewerId" TEXT,
    "reviewedAt" TIMESTAMP(3),

    CONSTRAINT "FacilityTranslation_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "HomeVideoTranslation_locale_idx" ON "HomeVideoTranslation"("locale");

-- CreateIndex
CREATE UNIQUE INDEX "HomeVideoTranslation_homeVideoId_locale_key" ON "HomeVideoTranslation"("homeVideoId", "locale");

-- CreateIndex
CREATE UNIQUE INDEX "Facility_slug_key" ON "Facility"("slug");

-- CreateIndex
CREATE INDEX "Facility_contentOwnerId_reviewDueAt_idx" ON "Facility"("contentOwnerId", "reviewDueAt");

-- CreateIndex
CREATE INDEX "FacilityTranslation_locale_idx" ON "FacilityTranslation"("locale");

-- CreateIndex
CREATE UNIQUE INDEX "FacilityTranslation_facilityId_locale_key" ON "FacilityTranslation"("facilityId", "locale");

-- AddForeignKey
ALTER TABLE "SiteSetting" ADD CONSTRAINT "SiteSetting_logoMediaId_fkey" FOREIGN KEY ("logoMediaId") REFERENCES "Media"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SiteSetting" ADD CONSTRAINT "SiteSetting_faviconMediaId_fkey" FOREIGN KEY ("faviconMediaId") REFERENCES "Media"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HomeVideoTranslation" ADD CONSTRAINT "HomeVideoTranslation_homeVideoId_fkey" FOREIGN KEY ("homeVideoId") REFERENCES "HomeVideo"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Facility" ADD CONSTRAINT "Facility_coverMediaId_fkey" FOREIGN KEY ("coverMediaId") REFERENCES "Media"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FacilityTranslation" ADD CONSTRAINT "FacilityTranslation_facilityId_fkey" FOREIGN KEY ("facilityId") REFERENCES "Facility"("id") ON DELETE CASCADE ON UPDATE CASCADE;
