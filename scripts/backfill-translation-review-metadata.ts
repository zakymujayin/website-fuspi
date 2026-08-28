/**
 * Backfill review metadata on public-content translations.
 *
 * `CmsTranslationWorkflowSchema` requires every PUBLISHED / REVIEWED translation to carry both
 * `reviewerId` and `reviewedAt` (and forbids `reviewedAt` on a DRAFT). Some content was created
 * without that metadata, which makes `listPublicContentAdmin` reject the whole resource list.
 *
 * This script makes the data consistent with the contract:
 *   - PUBLISHED / REVIEWED rows missing review metadata  -> set reviewerId + reviewedAt
 *   - DRAFT rows that carry review metadata              -> clear it
 *
 * Idempotent. Run:  npx tsx --env-file=.env scripts/backfill-translation-review-metadata.ts
 */
import { getPrismaClient } from "@/lib/db/client";

const TRANSLATION_MODELS = [
  "serviceTranslation", "partnershipTranslation", "scholarshipTranslation",
  "achievementTranslation", "studentActivityTranslation", "documentTranslation",
  "albumTranslation", "eventTranslation", "faqTranslation", "testimonialTranslation",
] as const;

async function main() {
  const prisma = getPrismaClient();
  const dryRun = process.argv.includes("--dry-run");

  const reviewer = await prisma.user.findFirst({
    where: { isActive: true, role: { in: ["ADMIN", "EDITOR"] } },
    orderBy: { createdAt: "asc" },
    select: { id: true, name: true },
  });
  if (!reviewer) throw new Error("No active ADMIN/EDITOR user to attribute the review to.");
  console.log(`Reviewer of record: ${reviewer.name} (${reviewer.id})${dryRun ? "  [DRY RUN]" : ""}\n`);

  let fixedPublished = 0;
  let fixedDraft = 0;

  for (const model of TRANSLATION_MODELS) {
    const delegate = prisma[model] as {
      findMany: (args: unknown) => Promise<Array<{ id: string }>>;
      update: (args: unknown) => Promise<unknown>;
    };

    const needReview = await delegate.findMany({
      where: {
        status: { in: ["PUBLISHED", "REVIEWED"] },
        OR: [{ reviewerId: null }, { reviewedAt: null }],
      },
      select: { id: true },
    });
    const draftWithMeta = await delegate.findMany({
      where: { status: "DRAFT", OR: [{ reviewerId: { not: null } }, { reviewedAt: { not: null } }] },
      select: { id: true },
    });

    if (needReview.length === 0 && draftWithMeta.length === 0) {
      console.log(`  ${model.padEnd(28)} clean`);
      continue;
    }
    console.log(`  ${model.padEnd(28)} +review:${needReview.length}  clear:${draftWithMeta.length}`);

    const reviewedAt = new Date();
    if (!dryRun) {
      for (const row of needReview) {
        await delegate.update({
          where: { id: row.id },
          data: { reviewerId: reviewer.id, reviewedAt },
        });
      }
      for (const row of draftWithMeta) {
        await delegate.update({
          where: { id: row.id },
          data: { reviewerId: null, reviewedAt: null },
        });
      }
    }
    fixedPublished += needReview.length;
    fixedDraft += draftWithMeta.length;
  }

  console.log(`\n${dryRun ? "Would fix" : "Fixed"}: ${fixedPublished} published/reviewed, ${fixedDraft} draft.`);
  await prisma.$disconnect();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
