-- Add the durable v1 fields required by the B2 public-content contracts.
ALTER TABLE "Service"
  ADD COLUMN "icon" TEXT;

ALTER TABLE "Partnership"
  ADD COLUMN "country" TEXT,
  ADD COLUMN "documentId" TEXT,
  ADD COLUMN "order" INTEGER NOT NULL DEFAULT 0;

ALTER TABLE "Scholarship"
  ADD COLUMN "documentId" TEXT;

ALTER TABLE "Achievement"
  ADD COLUMN "imageMediaId" TEXT;

ALTER TABLE "Testimonial"
  ADD COLUMN "graduationYear" INTEGER,
  ADD COLUMN "publicationConsentAt" TIMESTAMP(3),
  ALTER COLUMN "isVisible" SET DEFAULT false;

-- Existing testimonials have no durable consent evidence, so preserve their
-- content while failing closed on public visibility.
UPDATE "Testimonial"
SET "isVisible" = false
WHERE "publicationConsentAt" IS NULL;

ALTER TABLE "Testimonial"
  ADD CONSTRAINT "Testimonial_graduationYear_check"
    CHECK ("graduationYear" IS NULL OR "graduationYear" BETWEEN 1900 AND 2100),
  ADD CONSTRAINT "Testimonial_publication_consent_check"
    CHECK (NOT "isVisible" OR "publicationConsentAt" IS NOT NULL);

CREATE INDEX "Partnership_level_order_idx" ON "Partnership"("level", "order");
CREATE INDEX "Partnership_documentId_idx" ON "Partnership"("documentId");
CREATE INDEX "Scholarship_documentId_idx" ON "Scholarship"("documentId");
CREATE INDEX "Achievement_imageMediaId_idx" ON "Achievement"("imageMediaId");

ALTER TABLE "Partnership"
  ADD CONSTRAINT "Partnership_documentId_fkey"
  FOREIGN KEY ("documentId") REFERENCES "Document"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "Scholarship"
  ADD CONSTRAINT "Scholarship_documentId_fkey"
  FOREIGN KEY ("documentId") REFERENCES "Document"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "Achievement"
  ADD CONSTRAINT "Achievement_imageMediaId_fkey"
  FOREIGN KEY ("imageMediaId") REFERENCES "Media"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;
