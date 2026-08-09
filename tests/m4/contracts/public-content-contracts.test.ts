import {describe, expect, it} from "vitest";

import {
  AlbumInputSchema,
  CsvSafeCellSchema,
  PartnershipCsvResultSchema,
  PartnershipInputSchema,
  PublicContentAdminCommandSchema,
  PublicContentAdminDetailSchema,
  PublicContentAdminListQuerySchema,
  PublicContentDetailQuerySchema,
  PublicContentDetailResultSchema,
  PublicContentListResultSchema,
  PublicContentResourceSchema,
  ServiceInputSchema,
  TestimonialInputSchema,
} from "@/contracts/public-content";

const translations = <T>(id: T) => ({id});
const serviceInput = {
  slug: "layanan-akademik", category: "AKADEMIK" as const,
  link: {kind: "INTERNAL" as const, href: "/layanan/akademik"}, icon: "book-open",
  isActive: true, order: 0, contentOwnerId: "owner-1", expiresAt: null,
  translations: translations({name: "Layanan Akademik", description: "<p>Informasi.</p>"}),
};
const workflow = {
  locale: "id" as const, status: "PUBLISHED" as const, sourceVersion: 1,
  translatorId: "owner-1", reviewerId: "reviewer-1", reviewedAt: "2026-08-04T03:00:00.000Z",
};
const resolution = {requestedLocale: "en" as const, resolvedLocale: "id" as const, isFallback: true};

describe("B2 public content contracts", () => {
  it("freezes exactly the ten v1 public content resources", () => {
    expect(PublicContentResourceSchema.options).toEqual([
      "SERVICE", "PARTNERSHIP", "SCHOLARSHIP", "ACHIEVEMENT", "STUDENT_ACTIVITY",
      "DOCUMENT", "ALBUM", "EVENT", "FAQ", "TESTIMONIAL",
    ]);
  });

  it("accepts a strict Service command and editor detail", () => {
    expect(ServiceInputSchema.parse(serviceInput).link).toEqual({kind: "INTERNAL", href: "/layanan/akademik"});
    expect(PublicContentAdminCommandSchema.safeParse({
      action: "CREATE", resource: "SERVICE", payload: serviceInput,
    }).success).toBe(true);
    expect(PublicContentAdminDetailSchema.safeParse({
      id: "service-1", resource: "SERVICE", version: 1, input: serviceInput,
      translationWorkflow: [workflow], governance: {
        status: "CURRENT", contentOwnerId: "owner-1", lastReviewedAt: null, reviewDueAt: null, expiresAt: null,
      }, assets: [],
    }).success).toBe(true);
  });

  it("rejects arbitrary selectors, duplicate parameters, and unsafe links", () => {
    expect(PublicContentAdminCommandSchema.safeParse({
      action: "DELETE", resource: "SERVICE", id: "service-1", expectedVersion: 2,
      where: {id: {not: "service-1"}},
    }).success).toBe(false);
    expect(PublicContentAdminListQuerySchema.safeParse({resource: "SERVICE", where: {isActive: true}}).success).toBe(false);
    expect(ServiceInputSchema.safeParse({...serviceInput, link: {kind: "EXTERNAL", href: "https://127.0.0.1/admin"}}).success).toBe(false);
    expect(PublicContentDetailQuerySchema.safeParse({resource: "SERVICE", slug: "../secret", locale: "id"}).success).toBe(false);
  });

  it("requires an explicit optimistic-version intent on every delete", () => {
    expect(PublicContentAdminCommandSchema.safeParse({
      action: "DELETE", resource: "SERVICE", id: "service-1", expectedVersion: 2,
    }).success).toBe(true);
    expect(PublicContentAdminCommandSchema.safeParse({
      action: "DELETE", resource: "PARTNERSHIP", id: "partnership-1", expectedVersion: null,
    }).success).toBe(true);
    expect(PublicContentAdminCommandSchema.safeParse({
      action: "DELETE", resource: "SERVICE", id: "service-1",
    }).success).toBe(false);
  });

  it("enforces chronology, one evidence source, and contiguous media order", () => {
    const partnership = {
      slug: "mitra-satu", partnerName: "Mitra Satu", level: "NASIONAL" as const, country: "Indonesia",
      startDate: "2026-08-05T00:00:00.000Z", endDate: "2026-08-04T00:00:00.000Z",
      documentId: "document-1", legacyDocumentUrl: "https://docs.example.test/evidence.pdf",
      websiteUrl: null, logoMediaId: null, isActive: true, order: 0,
      translations: translations({category: "Pendidikan", description: null}),
    };
    expect(PartnershipInputSchema.safeParse(partnership).success).toBe(false);
    expect(PartnershipInputSchema.safeParse({...partnership, endDate: null, legacyDocumentUrl: null}).success).toBe(true);
    expect(AlbumInputSchema.safeParse({
      slug: "album-satu", coverMediaId: null, eventDate: null, isPublished: true,
      photos: [{mediaId: "media-1", caption: null, order: 1}],
      translations: translations({title: "Album Satu", description: null}),
    }).success).toBe(false);
  });

  it("requires durable consent before a testimonial can be visible", () => {
    const input = {
      name: "Alumni FUSPI", graduationYear: 2025, photoMediaId: null, order: 0,
      isVisible: true, publicationConsentAt: null,
      translations: translations({currentRole: "Peneliti", quote: "Pengalaman yang bermakna."}),
    };
    expect(TestimonialInputSchema.safeParse(input).success).toBe(false);
    expect(TestimonialInputSchema.safeParse({...input, publicationConsentAt: "2026-08-04T03:00:00.000Z"}).success).toBe(true);
  });

  it("allows safe Indonesian fallback but rejects inconsistent locale metadata", () => {
    const detail = {
      ok: true as const,
      data: {
        id: "service-1", resource: "SERVICE" as const, slug: "layanan-akademik", category: "AKADEMIK" as const,
        link: null, icon: null, order: 0,
        translation: {...resolution, name: "Layanan Akademik", description: null},
      },
    };
    expect(PublicContentDetailResultSchema.safeParse(detail).success).toBe(true);
    expect(PublicContentDetailResultSchema.safeParse({
      ...detail, data: {...detail.data, translation: {...detail.data.translation, resolvedLocale: "ar"}},
    }).success).toBe(false);
  });

  it("structurally excludes private and workflow fields from public detail", () => {
    const result = {
      ok: true, data: {
        id: "testimonial-1", resource: "TESTIMONIAL", name: "Alumni FUSPI", graduationYear: 2025,
        photo: null, order: 0, translation: {...resolution, currentRole: "Peneliti", quote: "Bermanfaat."},
        publicationConsentAt: "2026-08-04T03:00:00.000Z", phone: "+62000", storageKey: "private/key",
      },
    };
    expect(PublicContentDetailResultSchema.safeParse(result).success).toBe(false);
    expect(PublicContentDetailResultSchema.safeParse({ok: false, code: "postgresql://secret"}).success).toBe(false);
  });

  it("validates list metadata and bounded public cards", () => {
    const result = {
      ok: true, items: [{
        id: "event-1", resource: "EVENT", slug: "agenda-satu", title: "Agenda Satu", summary: null,
        badge: null, startsAt: "2026-08-04T03:00:00.000Z", endsAt: null, media: null, link: null,
        translation: {requestedLocale: "id", resolvedLocale: "id", isFallback: false},
      }], page: {page: 1, pageSize: 20, total: 1, totalPages: 1, hasNextPage: false, hasPreviousPage: false},
    };
    expect(PublicContentListResultSchema.safeParse(result).success).toBe(true);
    expect(PublicContentListResultSchema.safeParse({...result, page: {...result.page, totalPages: 2}}).success).toBe(false);
  });

  it("requires spreadsheet-safe partnership export cells", () => {
    expect(CsvSafeCellSchema.safeParse("'=HYPERLINK(\"https://evil.test\")").success).toBe(true);
    expect(CsvSafeCellSchema.safeParse("=HYPERLINK(\"https://evil.test\")").success).toBe(false);
    const row = {partnerName: "Mitra", level: "NASIONAL", country: "Indonesia", category: "Pendidikan", startDate: "", endDate: "", websiteUrl: "", evidenceUrl: ""};
    expect(PartnershipCsvResultSchema.safeParse({ok: true, filename: "fuspi-partnerships-2026-08-04.csv", rows: [row]}).success).toBe(true);
    expect(PartnershipCsvResultSchema.safeParse({ok: true, filename: "../../data.csv", rows: [row]}).success).toBe(false);
  });
});
