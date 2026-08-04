import {describe, expect, it, vi} from "vitest";

import {getPublicContentAdminDetail} from "@/features/public-content/admin-detail";
import {listPublicContentAdmin} from "@/features/public-content/admin-query";
import {exportPartnershipCsv} from "@/features/public-content/export";
import {listPublicContent} from "@/features/public-content/public-list";
import type {PublicContentDatabase} from "@/features/public-content/shared";

const now = new Date("2026-08-04T17:30:00.000Z");
const actor = {
  userId: "admin-1", role: "ADMIN" as const, isActive: true as const,
  mustChangePassword: false as const, expiresAt: new Date("2026-08-05T03:00:00.000Z"),
};
const workflow = {locale: "id" as const, status: "PUBLISHED" as const, sourceVersion: 1,
  translatorId: "admin-1", reviewerId: "admin-1", reviewedAt: now};

describe("public content admin loaders", () => {
  it("rejects hostile detail and list inputs before database access", async () => {
    const database = {service: {findUnique: vi.fn(), findMany: vi.fn()}} as unknown as PublicContentDatabase;
    expect(await getPublicContentAdminDetail(database, actor, {resource: "SERVICE", id: "service-1", include: {owner: true}}, now))
      .toEqual({ok: false, code: "REQUEST_INVALID"});
    expect(await listPublicContentAdmin(database, {...actor, role: "EDITOR"}, {
      resource: "SERVICE", page: 1, pageSize: 20, search: null, direction: "ASC",
      visibility: "ALL", translationStatus: null, category: null, year: null,
    }, now)).toEqual({ok: false, code: "SESSION_INVALID"});
    expect(database.service.findUnique).not.toHaveBeenCalled();
    expect(database.service.findMany).not.toHaveBeenCalled();
  });

  it("reconstructs a strict Service editor input without leaking technical fields", async () => {
    const database = {service: {findUnique: vi.fn().mockResolvedValue({
      id: "service-1", slug: "layanan", category: "AKADEMIK", url: "/layanan", icon: "book-open",
      isActive: true, order: 0, version: 2, contentOwnerId: "admin-1", governanceStatus: "CURRENT",
      lastReviewedAt: null, reviewDueAt: null, expiresAt: null,
      translations: [{...workflow, name: "Layanan", description: "<p>Aman.</p>", storageKey: "must-not-leak"}],
    })}} as unknown as PublicContentDatabase;
    const result = await getPublicContentAdminDetail(database, actor, {resource: "SERVICE", id: "service-1"}, now);
    expect(result).toMatchObject({ok: true, data: {resource: "SERVICE", version: 2,
      input: {slug: "layanan", translations: {id: {name: "Layanan"}}}}});
    expect(JSON.stringify(result)).not.toContain("storageKey");
  });
});

describe("public content list and export", () => {
  it("returns deterministic locale fallback metadata and exact pagination", async () => {
    const row = {id: "service-1", slug: "layanan", category: "AKADEMIK", url: "/layanan", icon: null,
      order: 0, expiresAt: null, translations: [{...workflow, name: "Layanan", description: null}]};
    const database = {
      service: {findMany: vi.fn().mockResolvedValue([row]), count: vi.fn().mockResolvedValue(1)},
      $transaction: vi.fn(async (operations: Array<Promise<unknown>>) => Promise.all(operations)),
    } as unknown as PublicContentDatabase;
    const result = await listPublicContent(database, {
      resource: "SERVICE", locale: "en", page: 1, pageSize: 20, search: "",
      direction: "ASC", category: null, year: null, archive: "ACTIVE",
    }, now);
    expect(result).toMatchObject({ok: true, items: [{title: "Layanan", translation: {
      requestedLocale: "en", resolvedLocale: "id", isFallback: true,
    }}], page: {total: 1, hasNextPage: false}});
  });

  it("escapes every formula-capable CSV cell and uses the Jakarta calendar date", async () => {
    const database = {partnership: {findMany: vi.fn().mockResolvedValue([{
      id: "partnership-1", order: 0, partnerName: "=cmd|' /C calc'!A0", level: "NASIONAL",
      country: "+62", startDate: new Date("2026-01-01T00:00:00.000Z"), endDate: null,
      websiteUrl: "https://example.org", documentUrl: "https://example.org/evidence.pdf", document: null,
      translations: [{...workflow, category: "@Kategori", description: null}],
    }])}} as unknown as PublicContentDatabase;
    const result = await exportPartnershipCsv(database, actor, {locale: "id", level: null, activeOnly: true}, now);
    expect(result).toEqual({ok: true, filename: "fuspi-partnerships-2026-08-05.csv", rows: [{
      partnerName: "'=cmd|' /C calc'!A0", level: "NASIONAL", country: "'+62", category: "'@Kategori",
      startDate: "2026-01-01", endDate: "", websiteUrl: "https://example.org",
      evidenceUrl: "https://example.org/evidence.pdf",
    }]});
  });

  it("does not query CSV data for a non-ADMIN actor", async () => {
    const database = {partnership: {findMany: vi.fn()}} as unknown as PublicContentDatabase;
    expect(await exportPartnershipCsv(database, {...actor, role: "PETUGAS"}, {locale: "id", level: null, activeOnly: false}, now))
      .toEqual({ok: false, code: "SESSION_INVALID"});
    expect(database.partnership.findMany).not.toHaveBeenCalled();
  });
});
