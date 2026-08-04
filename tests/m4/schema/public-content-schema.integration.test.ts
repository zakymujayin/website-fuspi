import {createHash} from "node:crypto";

import {afterAll, beforeAll, describe, expect, it} from "vitest";

import {createPrismaClient} from "@/lib/db/client";

const suite = process.env.RUN_PLATFORM_DB_TESTS === "true" ? describe : describe.skip;

suite("B2 public content schema correction on PostgreSQL", () => {
  const prisma = createPrismaClient();
  const marker = `m4-public-content-schema-${Date.now()}`;
  let userId = "";
  let mediaId = "";
  let documentId = "";
  let partnershipId = "";
  let scholarshipId = "";
  let achievementId = "";
  let testimonialId = "";

  beforeAll(async () => {
    await prisma.$connect();
    userId = (await prisma.user.create({data: {
      name: `${marker} User`, email: `${marker}@example.test`, role: "ADMIN", isActive: true,
    }})).id;
    const digest = createHash("sha256").update(marker).digest("hex");
    mediaId = (await prisma.media.create({data: {
      storageKey: `2026/08/${digest}.webp`, storageClass: "PUBLIC", checksumSha256: digest,
      originalName: `${marker}.webp`, mimeType: "image/webp", size: 512, alt: "Achievement",
      isDecorative: false, width: 320, height: 320, uploaderId: userId,
    }})).id;
    documentId = (await prisma.document.create({data: {
      slug: `${marker}-document`, storageKey: `2026/08/${digest}.pdf`, storageClass: "PUBLIC",
      mimeType: "application/pdf", size: 1024,
    }})).id;
  });

  afterAll(async () => {
    await prisma.testimonial.deleteMany({where: {id: testimonialId || "missing"}});
    await prisma.achievement.deleteMany({where: {id: achievementId || "missing"}});
    await prisma.scholarship.deleteMany({where: {id: scholarshipId || "missing"}});
    await prisma.partnership.deleteMany({where: {id: partnershipId || "missing"}});
    await prisma.document.deleteMany({where: {id: documentId || "missing"}});
    await prisma.media.deleteMany({where: {id: mediaId || "missing"}});
    await prisma.user.deleteMany({where: {id: userId || "missing"}});
    await prisma.$disconnect();
  });

  it("persists corrected fields and relations", async () => {
    const partnership = await prisma.partnership.create({data: {
      slug: `${marker}-partnership`, partnerName: `${marker} Partner`, level: "NASIONAL",
      country: "Indonesia", order: 3, documentId,
    }});
    partnershipId = partnership.id;
    scholarshipId = (await prisma.scholarship.create({data: {
      slug: `${marker}-scholarship`, documentId,
    }})).id;
    achievementId = (await prisma.achievement.create({data: {
      slug: `${marker}-achievement`, studentName: `${marker} Student`, level: "NASIONAL", imageMediaId: mediaId,
    }})).id;
    expect(partnership).toMatchObject({country: "Indonesia", order: 3, documentId});
    await expect(prisma.document.delete({where: {id: documentId}})).rejects.toBeDefined();
    await expect(prisma.media.delete({where: {id: mediaId}})).rejects.toBeDefined();
  });

  it("keeps testimonials private unless consent evidence exists", async () => {
    const hidden = await prisma.testimonial.create({data: {name: `${marker} Hidden`}});
    expect(hidden.isVisible).toBe(false);
    await prisma.testimonial.delete({where: {id: hidden.id}});
    await expect(prisma.testimonial.create({data: {
      name: `${marker} Invalid`, isVisible: true,
    }})).rejects.toBeDefined();
    await expect(prisma.testimonial.create({data: {
      name: `${marker} Invalid year`, graduationYear: 1899,
    }})).rejects.toBeDefined();
    testimonialId = (await prisma.testimonial.create({data: {
      name: `${marker} Public`, graduationYear: 2025, isVisible: true,
      publicationConsentAt: new Date("2026-08-04T03:00:00.000Z"),
    }})).id;
    await expect(prisma.testimonial.findUnique({where: {id: testimonialId}})).resolves.toMatchObject({
      graduationYear: 2025, isVisible: true,
    });
  });

  it("installs the consent constraints and corrected defaults in PostgreSQL", async () => {
    const constraints = await prisma.$queryRaw<Array<{conname: string}>>`
      SELECT conname FROM pg_constraint
      WHERE conname IN ('Testimonial_graduationYear_check', 'Testimonial_publication_consent_check')
      ORDER BY conname
    `;
    expect(constraints.map(({conname}) => conname)).toEqual([
      "Testimonial_graduationYear_check", "Testimonial_publication_consent_check",
    ]);
    const defaults = await prisma.$queryRaw<Array<{column_default: string | null}>>`
      SELECT column_default FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'Testimonial' AND column_name = 'isVisible'
    `;
    expect(defaults).toEqual([{column_default: "false"}]);
  });
});
