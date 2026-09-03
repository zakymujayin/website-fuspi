CREATE TYPE "IntellectualPropertyType" AS ENUM ('PATEN', 'HAK_CIPTA', 'MEREK', 'DESAIN_INDUSTRI', 'LAINNYA');
CREATE TYPE "TeachingTerm" AS ENUM ('GANJIL', 'GENAP');

CREATE TABLE "LecturerIntellectualProperty" (
    "id" TEXT NOT NULL,
    "lecturerId" TEXT NOT NULL,
    "title" VARCHAR(500) NOT NULL,
    "type" "IntellectualPropertyType" NOT NULL DEFAULT 'HAK_CIPTA',
    "registrationNumber" TEXT,
    "year" INTEGER,
    "url" TEXT,
    "order" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "LecturerIntellectualProperty_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "LecturerTeachingAssignment" (
    "id" TEXT NOT NULL,
    "lecturerId" TEXT NOT NULL,
    "courseCode" VARCHAR(50) NOT NULL,
    "courseName" VARCHAR(255) NOT NULL,
    "programCode" VARCHAR(10) NOT NULL,
    "credits" INTEGER NOT NULL,
    "academicYearStart" INTEGER NOT NULL,
    "academicYearEnd" INTEGER NOT NULL,
    "term" "TeachingTerm" NOT NULL,
    "semester" INTEGER NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "LecturerTeachingAssignment_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "LecturerTeachingAssignment_lecturerId_courseCode_academicYearStart_academicYearEnd_term_semester_key"
  ON "LecturerTeachingAssignment"("lecturerId", "courseCode", "academicYearStart", "academicYearEnd", "term", "semester");
CREATE INDEX "LecturerIntellectualProperty_lecturerId_year_idx" ON "LecturerIntellectualProperty"("lecturerId", "year");
CREATE INDEX "LecturerTeachingAssignment_academicYearStart_academicYearEnd_term_semester_idx" ON "LecturerTeachingAssignment"("academicYearStart", "academicYearEnd", "term", "semester");
CREATE INDEX "LecturerTeachingAssignment_lecturerId_academicYearStart_academicYearEnd_idx" ON "LecturerTeachingAssignment"("lecturerId", "academicYearStart", "academicYearEnd");

ALTER TABLE "LecturerIntellectualProperty"
  ADD CONSTRAINT "LecturerIntellectualProperty_lecturerId_fkey"
  FOREIGN KEY ("lecturerId") REFERENCES "Lecturer"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "LecturerTeachingAssignment"
  ADD CONSTRAINT "LecturerTeachingAssignment_lecturerId_fkey"
  FOREIGN KEY ("lecturerId") REFERENCES "Lecturer"("id") ON DELETE CASCADE ON UPDATE CASCADE;
