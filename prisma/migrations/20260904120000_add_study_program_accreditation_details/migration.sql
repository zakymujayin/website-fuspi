ALTER TABLE "StudyProgram"
  ADD COLUMN "accreditationAgency" TEXT,
  ADD COLUMN "accreditationDecreeNumber" TEXT,
  ADD COLUMN "accreditationCertificateMediaId" TEXT;

CREATE INDEX "StudyProgram_accreditationCertificateMediaId_idx"
  ON "StudyProgram"("accreditationCertificateMediaId");

ALTER TABLE "StudyProgram"
  ADD CONSTRAINT "StudyProgram_accreditationCertificateMediaId_fkey"
  FOREIGN KEY ("accreditationCertificateMediaId") REFERENCES "Media"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;
