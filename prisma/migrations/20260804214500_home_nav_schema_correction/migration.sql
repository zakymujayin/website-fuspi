ALTER TYPE "HomeSectionKey" ADD VALUE IF NOT EXISTS 'INTRO' AFTER 'STATS';
ALTER TYPE "HomeSectionKey" ADD VALUE IF NOT EXISTS 'SERVICE' AFTER 'ANNOUNCEMENT';

ALTER TABLE "Statistic" ADD COLUMN "suffix" TEXT;
ALTER TABLE "SiteSetting" ADD COLUMN "videoPosterMediaId" TEXT;

CREATE INDEX "MenuItem_pageId_idx" ON "MenuItem"("pageId");
CREATE INDEX "SiteSetting_videoPosterMediaId_idx" ON "SiteSetting"("videoPosterMediaId");

ALTER TABLE "MenuItem"
  ADD CONSTRAINT "MenuItem_pageId_fkey"
  FOREIGN KEY ("pageId") REFERENCES "Page"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "SiteSetting"
  ADD CONSTRAINT "SiteSetting_videoPosterMediaId_fkey"
  FOREIGN KEY ("videoPosterMediaId") REFERENCES "Media"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
