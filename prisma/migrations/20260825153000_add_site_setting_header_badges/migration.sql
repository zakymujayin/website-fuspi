ALTER TABLE "SiteSetting"
  ADD COLUMN "accreditationLogoMediaId" TEXT,
  ADD COLUMN "bluLogoMediaId" TEXT;

ALTER TABLE "SiteSetting"
  ADD CONSTRAINT "SiteSetting_accreditationLogoMediaId_fkey"
  FOREIGN KEY ("accreditationLogoMediaId") REFERENCES "Media"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "SiteSetting"
  ADD CONSTRAINT "SiteSetting_bluLogoMediaId_fkey"
  FOREIGN KEY ("bluLogoMediaId") REFERENCES "Media"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE INDEX "SiteSetting_accreditationLogoMediaId_idx"
  ON "SiteSetting"("accreditationLogoMediaId");

CREATE INDEX "SiteSetting_bluLogoMediaId_idx"
  ON "SiteSetting"("bluLogoMediaId");
