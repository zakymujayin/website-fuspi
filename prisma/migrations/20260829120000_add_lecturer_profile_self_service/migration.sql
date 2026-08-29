-- Lecturer self-service profile: account link, education history, publications.

ALTER TYPE "Role" ADD VALUE IF NOT EXISTS 'DOSEN';

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'PublicationType') THEN
    CREATE TYPE "PublicationType" AS ENUM ('JURNAL', 'BUKU', 'BAB_BUKU', 'PROSIDING', 'ARTIKEL', 'LAINNYA');
  END IF;
END
$$;

ALTER TABLE "Lecturer"
  ADD COLUMN IF NOT EXISTS "scopusUrl" TEXT,
  ADD COLUMN IF NOT EXISTS "linkedinUrl" TEXT,
  ADD COLUMN IF NOT EXISTS "instagramUrl" TEXT,
  ADD COLUMN IF NOT EXISTS "twitterUrl" TEXT,
  ADD COLUMN IF NOT EXISTS "cvMediaId" TEXT,
  ADD COLUMN IF NOT EXISTS "userId" TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS "Lecturer_userId_key" ON "Lecturer"("userId");

ALTER TABLE "Lecturer"
  ADD CONSTRAINT "Lecturer_cvMediaId_fkey" FOREIGN KEY ("cvMediaId")
  REFERENCES "Media"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "Lecturer"
  ADD CONSTRAINT "Lecturer_userId_fkey" FOREIGN KEY ("userId")
  REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "LecturerTranslation"
  ADD COLUMN IF NOT EXISTS "quote" TEXT,
  ADD COLUMN IF NOT EXISTS "officeLocation" TEXT;

CREATE TABLE IF NOT EXISTS "LecturerEducation" (
  "id" TEXT NOT NULL,
  "lecturerId" TEXT NOT NULL,
  "degree" TEXT NOT NULL,
  "field" TEXT,
  "institution" TEXT NOT NULL,
  "city" TEXT,
  "year" INTEGER,
  "order" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "LecturerEducation_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "LecturerEducation_lecturerId_order_idx"
  ON "LecturerEducation"("lecturerId", "order");

ALTER TABLE "LecturerEducation"
  ADD CONSTRAINT "LecturerEducation_lecturerId_fkey" FOREIGN KEY ("lecturerId")
  REFERENCES "Lecturer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE IF NOT EXISTS "LecturerPublication" (
  "id" TEXT NOT NULL,
  "lecturerId" TEXT NOT NULL,
  "title" VARCHAR(500) NOT NULL,
  "type" "PublicationType" NOT NULL DEFAULT 'JURNAL',
  "year" INTEGER,
  "publisher" TEXT,
  "url" TEXT,
  "doi" TEXT,
  "order" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "LecturerPublication_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "LecturerPublication_lecturerId_year_idx"
  ON "LecturerPublication"("lecturerId", "year");

ALTER TABLE "LecturerPublication"
  ADD CONSTRAINT "LecturerPublication_lecturerId_fkey" FOREIGN KEY ("lecturerId")
  REFERENCES "Lecturer"("id") ON DELETE CASCADE ON UPDATE CASCADE;
