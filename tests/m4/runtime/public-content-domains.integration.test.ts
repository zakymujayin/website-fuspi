import {afterAll, beforeAll, describe, expect, it} from "vitest";

import {executePublicContentCommand} from "@/features/public-content/administration";
import {getPublicContentAdminDetail} from "@/features/public-content/admin-detail";
import {exportPartnershipCsv} from "@/features/public-content/export";
import {getPublicContentDetail} from "@/features/public-content/public-query";
import {listPublicContent} from "@/features/public-content/public-list";
import {createPrismaClient} from "@/lib/db/client";

const suite = process.env.RUN_PLATFORM_DB_TESTS === "true" ? describe : describe.skip;

suite("public content domains PostgreSQL runtime", () => {
  const prisma = createPrismaClient();
  const marker = `m4-public-${Date.now()}`;
  const now = new Date("2026-08-04T03:00:00.000Z");
  const ids = new Map<string, string>();
  let adminId = ""; let pdfMediaId = ""; let privateMediaId = "";
  const actor = () => ({userId: adminId, role: "ADMIN" as const, isActive: true as const,
    mustChangePassword: false, expiresAt: new Date("2026-08-04T11:00:00.000Z")});

  beforeAll(async () => {
    await prisma.$connect();
    const admin = await prisma.user.create({data: {name: `${marker} Admin`, email: `${marker}@example.test`, role: "ADMIN", isActive: true}});
    adminId = admin.id;
    const [pdf, privateImage] = await Promise.all([
      prisma.media.create({data: {storageKey: `2026/08/${"a".repeat(64)}.pdf`, storageClass: "PUBLIC",
        checksumSha256: "a".repeat(64), originalName: `${marker}.pdf`, mimeType: "application/pdf", size: 2048, uploaderId: adminId}}),
      prisma.media.create({data: {storageKey: `private/${marker}-image.webp`, storageClass: "PRIVATE",
        checksumSha256: "b".repeat(64), originalName: `${marker}.webp`, mimeType: "image/webp", size: 1024,
        alt: "Private", width: 100, height: 100, uploaderId: adminId}}),
    ]);
    pdfMediaId = pdf.id; privateMediaId = privateImage.id;
  });

  afterAll(async () => {
    const allIds = [...ids.values()];
    await prisma.activityLog.deleteMany({where: {OR: [{actorId: adminId || "missing"}, {resourceId: {in: allIds}}]}});
    await prisma.contentRevision.deleteMany({where: {resourceId: {in: allIds}}});
    await prisma.partnership.deleteMany({where: {id: ids.get("PARTNERSHIP") ?? "missing"}});
    await prisma.scholarship.deleteMany({where: {id: ids.get("SCHOLARSHIP") ?? "missing"}});
    await prisma.studentActivity.deleteMany({where: {id: ids.get("STUDENT_ACTIVITY") ?? "missing"}});
    await prisma.album.deleteMany({where: {id: ids.get("ALBUM") ?? "missing"}});
    await prisma.achievement.deleteMany({where: {id: ids.get("ACHIEVEMENT") ?? "missing"}});
    await prisma.testimonial.deleteMany({where: {id: ids.get("TESTIMONIAL") ?? "missing"}});
    await prisma.service.deleteMany({where: {id: ids.get("SERVICE") ?? "missing"}});
    await prisma.event.deleteMany({where: {id: ids.get("EVENT") ?? "missing"}});
    await prisma.faq.deleteMany({where: {id: ids.get("FAQ") ?? "missing"}});
    await prisma.document.deleteMany({where: {id: ids.get("DOCUMENT") ?? "missing"}});
    await prisma.media.deleteMany({where: {id: {in: [pdfMediaId, privateMediaId].filter(Boolean)}}});
    await prisma.user.deleteMany({where: {id: adminId || "missing"}});
    await prisma.$disconnect();
  });

  it("creates all ten resources atomically with required audit and revision records", async () => {
    const commands = [
      {resource: "SERVICE", payload: {slug: `${marker}-service`, category: "AKADEMIK", link: {kind: "INTERNAL", href: "/layanan"}, icon: "book-open",
        isActive: true, order: 0, contentOwnerId: adminId, expiresAt: null,
        translations: {id: {name: `${marker} Layanan`, description: "<p>Aman<script>hapus</script></p>"}, en: {name: `${marker} Service`, description: null}}}},
      {resource: "PARTNERSHIP", payload: {slug: `${marker}-partnership`, partnerName: `${marker} Mitra`, level: "NASIONAL", country: "Indonesia",
        startDate: "2026-01-01T00:00:00.000Z", endDate: null, documentId: null, legacyDocumentUrl: "https://example.org/mou.pdf",
        websiteUrl: "https://example.org", logoMediaId: null, isActive: true, order: 0,
        translations: {id: {category: "Pendidikan", description: "<p>Kerja sama.</p>"}}}},
      {resource: "SCHOLARSHIP", payload: {slug: `${marker}-scholarship`, startDate: "2026-07-01T00:00:00.000Z",
        endDate: "2026-09-01T00:00:00.000Z", registrationUrl: "https://example.org/register", documentId: null, isActive: true,
        translations: {id: {title: `${marker} Beasiswa`, provider: "Mitra", description: null}}}},
      {resource: "ACHIEVEMENT", payload: {slug: `${marker}-achievement`, studentName: `${marker} Mahasiswa`, level: "NASIONAL",
        achievedAt: "2026-06-01T00:00:00.000Z", imageMediaId: null,
        translations: {id: {title: `${marker} Prestasi`, description: null}}}},
      {resource: "STUDENT_ACTIVITY", payload: {slug: `${marker}-activity`, date: "2026-07-01T00:00:00.000Z", images: [],
        translations: {id: {title: `${marker} Kegiatan`, description: "<p>Kegiatan.</p>"}}}},
      {resource: "DOCUMENT", payload: {slug: `${marker}-document`, publicPdfMediaId: pdfMediaId, isPublished: true,
        contentOwnerId: adminId, expiresAt: null, translations: {id: {title: `${marker} Dokumen`, category: "Pedoman"}}}},
      {resource: "ALBUM", payload: {slug: `${marker}-album`, coverMediaId: null, eventDate: "2026-07-01T00:00:00.000Z",
        isPublished: true, photos: [], translations: {id: {title: `${marker} Album`, description: null}}}},
      {resource: "EVENT", payload: {slug: `${marker}-event`, startAt: "2026-08-06T03:00:00.000Z", endAt: "2026-08-06T05:00:00.000Z",
        registrationUrl: "https://example.org/event", isPublished: true, contentOwnerId: adminId, expiresAt: null,
        translations: {id: {title: `${marker} Agenda`, description: null, location: "Kampus"}}}},
      {resource: "FAQ", payload: {order: 0, isVisible: true, contentOwnerId: adminId, expiresAt: null,
        translations: {id: {category: "Umum", question: `${marker} Pertanyaan?`, answer: "<p>Jawaban.</p>"}}}},
      {resource: "TESTIMONIAL", payload: {name: `${marker} Alumni`, graduationYear: 2025, photoMediaId: null, order: 0, isVisible: true,
        publicationConsentAt: "2026-08-01T03:00:00.000Z", translations: {id: {currentRole: "Peneliti", quote: "Pengalaman baik."}}}},
    ] as const;
    for (const command of commands) {
      const result = await executePublicContentCommand(prisma, actor(), {action: "CREATE", ...command}, now);
      expect(result, command.resource).toMatchObject({ok: true, resource: command.resource});
      if (result.ok) ids.set(command.resource, result.id);
    }
    expect(ids.size).toBe(10);
    expect(await prisma.activityLog.count({where: {actorId: adminId, resourceId: {in: [...ids.values()]}}})).toBe(10);
    expect(await prisma.contentRevision.count({where: {resourceId: {in: [...ids.values()]}}})).toBe(4);
    expect((await prisma.serviceTranslation.findFirstOrThrow({where: {serviceId: ids.get("SERVICE"), locale: "id"}})).description).toBe("<p>Aman</p>");
  });

  it("loads strict admin details and public locale fallback for every resource", async () => {
    const resources = ["SERVICE", "PARTNERSHIP", "SCHOLARSHIP", "ACHIEVEMENT", "STUDENT_ACTIVITY", "DOCUMENT", "ALBUM", "EVENT", "FAQ", "TESTIMONIAL"] as const;
    for (const resource of resources) {
      const id = ids.get(resource)!;
      const admin = await getPublicContentAdminDetail(prisma, actor(), {resource, id}, now);
      expect(admin, resource).toMatchObject({ok: true, data: {id, resource}});
      const slugs = {SERVICE: "service", PARTNERSHIP: "partnership", SCHOLARSHIP: "scholarship",
        ACHIEVEMENT: "achievement", STUDENT_ACTIVITY: "activity", DOCUMENT: "document", ALBUM: "album", EVENT: "event"} as const;
      const query = resource === "FAQ" || resource === "TESTIMONIAL"
        ? {resource, id, locale: "en" as const}
        : {resource, slug: `${marker}-${slugs[resource]}`, locale: "en" as const};
      const detail = await getPublicContentDetail(prisma, query, now);
      expect(detail, resource).toMatchObject({ok: true, data: {id, resource, translation: {resolvedLocale: "id", isFallback: true}}});
      expect(JSON.stringify(detail)).not.toMatch(/contentOwner|storageKey|reviewerId|translatorId/i);
    }
  });

  it("lists every resource with exact marker-scoped pagination and exports partnerships", async () => {
    const resources = ["SERVICE", "PARTNERSHIP", "SCHOLARSHIP", "ACHIEVEMENT", "STUDENT_ACTIVITY", "DOCUMENT", "ALBUM", "EVENT", "FAQ", "TESTIMONIAL"] as const;
    for (const resource of resources) {
      const result = await listPublicContent(prisma, {resource, locale: "id", page: 1, pageSize: 20,
        search: marker, direction: "ASC", category: null, year: null, archive: "ACTIVE"}, now);
      expect(result, resource).toMatchObject({ok: true, page: {total: 1}});
      if (result.ok) expect(result.items).toHaveLength(1);
    }
    const csv = await exportPartnershipCsv(prisma, actor(), {locale: "id", level: "NASIONAL", activeOnly: true}, now);
    expect(csv).toMatchObject({ok: true, rows: [{partnerName: `${marker} Mitra`, evidenceUrl: "https://example.org/mou.pdf"}]});
  });

  it("updates all ten resources through their strict transaction paths", async () => {
    const commands = [
      {resource: "SERVICE", expectedVersion: 1, payload: {slug: `${marker}-service`, category: "UMUM", link: null, icon: null,
        isActive: true, order: 1, contentOwnerId: adminId, expiresAt: null, translations: {id: {name: `${marker} Layanan Ubah`, description: null}}}},
      {resource: "PARTNERSHIP", expectedVersion: null, payload: {slug: `${marker}-partnership`, partnerName: `${marker} Mitra Ubah`, level: "NASIONAL", country: "Indonesia",
        startDate: "2026-01-01T00:00:00.000Z", endDate: null, documentId: null, legacyDocumentUrl: null, websiteUrl: "https://example.org",
        logoMediaId: null, isActive: true, order: 1, translations: {id: {category: "Riset", description: null}}}},
      {resource: "SCHOLARSHIP", expectedVersion: null, payload: {slug: `${marker}-scholarship`, startDate: null, endDate: "2026-10-01T00:00:00.000Z",
        registrationUrl: null, documentId: null, isActive: true, translations: {id: {title: `${marker} Beasiswa Ubah`, provider: null, description: null}}}},
      {resource: "ACHIEVEMENT", expectedVersion: null, payload: {slug: `${marker}-achievement`, studentName: `${marker} Mahasiswa Ubah`, level: "REGIONAL",
        achievedAt: null, imageMediaId: null, translations: {id: {title: `${marker} Prestasi Ubah`, description: null}}}},
      {resource: "STUDENT_ACTIVITY", expectedVersion: null, payload: {slug: `${marker}-activity`, date: null, images: [],
        translations: {id: {title: `${marker} Kegiatan Ubah`, description: null}}}},
      {resource: "DOCUMENT", expectedVersion: 1, payload: {slug: `${marker}-document`, publicPdfMediaId: pdfMediaId, isPublished: true,
        contentOwnerId: adminId, expiresAt: null, translations: {id: {title: `${marker} Dokumen Ubah`, category: null}}}},
      {resource: "ALBUM", expectedVersion: null, payload: {slug: `${marker}-album`, coverMediaId: null, eventDate: null, isPublished: true,
        photos: [], translations: {id: {title: `${marker} Album Ubah`, description: null}}}},
      {resource: "EVENT", expectedVersion: 1, payload: {slug: `${marker}-event`, startAt: "2026-08-07T03:00:00.000Z", endAt: null,
        registrationUrl: null, isPublished: true, contentOwnerId: adminId, expiresAt: null,
        translations: {id: {title: `${marker} Agenda Ubah`, description: null, location: null}}}},
      {resource: "FAQ", expectedVersion: 1, payload: {order: 1, isVisible: true, contentOwnerId: adminId, expiresAt: null,
        translations: {id: {category: null, question: `${marker} Pertanyaan baru?`, answer: "<p>Jawaban baru.</p>"}}}},
      {resource: "TESTIMONIAL", expectedVersion: null, payload: {name: `${marker} Alumni Ubah`, graduationYear: 2024, photoMediaId: null,
        order: 1, isVisible: true, publicationConsentAt: "2026-08-01T03:00:00.000Z",
        translations: {id: {currentRole: null, quote: "Tetap baik."}}}},
    ] as const;
    for (const command of commands) {
      const result = await executePublicContentCommand(prisma, actor(), {action: "UPDATE", resource: command.resource,
        mutation: {id: ids.get(command.resource), expectedVersion: command.expectedVersion}, payload: command.payload}, now);
      expect(result, command.resource).toMatchObject({ok: true, resource: command.resource});
    }
    expect(await prisma.contentRevision.count({where: {resourceId: {in: [...ids.values()]}}})).toBe(8);
    expect((await prisma.partnership.findUniqueOrThrow({where: {id: ids.get("PARTNERSHIP")}})).partnerName).toBe(`${marker} Mitra Ubah`);
  });

  it("enforces optimistic locking and rejects private images without a write", async () => {
    const serviceId = ids.get("SERVICE")!;
    const payload = {slug: `${marker}-service`, category: "UMUM", link: null, icon: null, isActive: true, order: 0,
      contentOwnerId: adminId, expiresAt: null, translations: {id: {name: `${marker} Layanan Baru`, description: null}}};
    expect(await executePublicContentCommand(prisma, actor(), {action: "UPDATE", resource: "SERVICE",
      mutation: {id: serviceId, expectedVersion: 99}, payload}, now)).toEqual({ok: false, code: "VERSION_CONFLICT"});
    expect(await executePublicContentCommand(prisma, actor(), {action: "UPDATE", resource: "SERVICE",
      mutation: {id: serviceId, expectedVersion: 2}, payload}, now)).toEqual({ok: true, id: serviceId, resource: "SERVICE", version: 3});
    const before = await prisma.achievement.count({where: {slug: `${marker}-private-image`}});
    expect(await executePublicContentCommand(prisma, actor(), {action: "CREATE", resource: "ACHIEVEMENT", payload: {
      slug: `${marker}-private-image`, studentName: "Mahasiswa", level: "LOKAL", achievedAt: null, imageMediaId: privateMediaId,
      translations: {id: {title: "Tidak boleh", description: null}},
    }}, now)).toEqual({ok: false, code: "MEDIA_INVALID"});
    expect(await prisma.achievement.count({where: {slug: `${marker}-private-image`}})).toBe(before);
  });

  it("deletes all ten resources with version intent and durable audit metadata", async () => {
    const versions: Record<string, number | null> = {SERVICE: 3, PARTNERSHIP: null, SCHOLARSHIP: null, ACHIEVEMENT: null,
      STUDENT_ACTIVITY: null, DOCUMENT: 2, ALBUM: null, EVENT: 2, FAQ: 2, TESTIMONIAL: null};
    for (const [resource, id] of ids) {
      const result = await executePublicContentCommand(prisma, actor(), {action: "DELETE", resource, id, expectedVersion: versions[resource]}, now);
      expect(result, resource).toMatchObject({ok: true, resource, id, version: versions[resource] === null ? null : (versions[resource] as number) + 1});
    }
    const counts = await Promise.all([prisma.service.count({where: {id: ids.get("SERVICE")}}),
      prisma.partnership.count({where: {id: ids.get("PARTNERSHIP")}}), prisma.scholarship.count({where: {id: ids.get("SCHOLARSHIP")}}),
      prisma.achievement.count({where: {id: ids.get("ACHIEVEMENT")}}), prisma.studentActivity.count({where: {id: ids.get("STUDENT_ACTIVITY")}}),
      prisma.document.count({where: {id: ids.get("DOCUMENT")}}), prisma.album.count({where: {id: ids.get("ALBUM")}}),
      prisma.event.count({where: {id: ids.get("EVENT")}}), prisma.faq.count({where: {id: ids.get("FAQ")}}),
      prisma.testimonial.count({where: {id: ids.get("TESTIMONIAL")}})]);
    expect(counts).toEqual(Array.from({length: 10}, () => 0));
    expect(await prisma.activityLog.count({where: {actorId: adminId, metadata: {path: ["operation"], equals: "DELETE"}}})).toBe(10);
  });
});
