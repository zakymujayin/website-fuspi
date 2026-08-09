BEGIN;

-- Replace inventory-era complaint categories with the normative FUSPI service channels.
ALTER TYPE "ComplaintCategory" RENAME TO "ComplaintCategory_old";
CREATE TYPE "ComplaintCategory" AS ENUM (
  'AKADEMIK',
  'KEMAHASISWAAN',
  'SARANA',
  'PELECEHAN_SEKSUAL',
  'LAINNYA'
);
ALTER TABLE "Ticket"
  ALTER COLUMN "category" TYPE "ComplaintCategory"
  USING (
    CASE "category"::text
      WHEN 'FASILITAS' THEN 'SARANA'
      WHEN 'LAYANAN' THEN 'LAINNYA'
      WHEN 'KEUANGAN' THEN 'LAINNYA'
      ELSE "category"::text
    END
  )::"ComplaintCategory";
DROP TYPE "ComplaintCategory_old";

-- Renames preserve existing priority values in Ticket and TicketHistory.
ALTER TYPE "TicketPriority" RENAME VALUE 'NORMAL' TO 'SEDANG';
ALTER TYPE "TicketPriority" RENAME VALUE 'DARURAT' TO 'URGENT';
ALTER TABLE "Ticket" ALTER COLUMN "priority" SET DEFAULT 'SEDANG';

-- Preserve closed/rejected legacy rows and add the missing verification state.
ALTER TYPE "TicketStatus" RENAME VALUE 'DITUTUP' TO 'DITOLAK';
ALTER TYPE "TicketStatus" ADD VALUE 'DIVERIFIKASI' BEFORE 'DIPROSES';

COMMIT;
