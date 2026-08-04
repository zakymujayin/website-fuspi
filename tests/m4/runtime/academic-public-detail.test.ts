import {describe, expect, it, vi} from "vitest";

import {
  getPublicAcademicDetail,
  type AcademicPublicDetailDatabase,
} from "@/features/academic/public-detail";

describe("academic public detail runtime boundaries", () => {
  it("rejects hostile or malformed queries before database access", async () => {
    const database = {unit: {findFirst: vi.fn()}} as unknown as AcademicPublicDetailDatabase;
    for (const query of [
      {resource: "UNIT", slug: "unit", locale: "id", where: {phone: {not: null}}},
      {resource: "UNIT", slug: "../unit", locale: "id"},
      {resource: "UNIT", slug: "unit", locale: "fr"},
    ]) expect(await getPublicAcademicDetail(database, query)).toEqual({ok: false, code: "REQUEST_INVALID"});
    expect(database.unit.findFirst).not.toHaveBeenCalled();
  });

  it("returns Indonesian fallback metadata for a valid active Unit", async () => {
    const database = {unit: {findFirst: vi.fn().mockResolvedValue({
      id: "unit-1", slug: "pusat-studi", type: "PUSAT_STUDI", email: "unit@example.test",
      phone: "+62000", externalUrl: "https://unit.example.test/home", isActive: true,
      translations: [{locale: "id", name: "Pusat Studi", description: "<p>Deskripsi.</p>"}],
    })}} as unknown as AcademicPublicDetailDatabase;
    const result = await getPublicAcademicDetail(database, {resource: "UNIT", slug: "pusat-studi", locale: "en"});
    expect(result).toMatchObject({ok: true, data: {resource: "UNIT", translation: {resolvedLocale: "id", isFallback: true}}});
    expect(JSON.stringify(result)).not.toContain("phone");
  });

  it("fails closed when a legacy public URL violates the contract", async () => {
    const database = {unit: {findFirst: vi.fn().mockResolvedValue({
      id: "unit-1", slug: "pusat-studi", type: "PUSAT_STUDI", email: null,
      externalUrl: "https://127.0.0.1/admin", isActive: true,
      translations: [{locale: "id", name: "Pusat Studi", description: null}],
    })}} as unknown as AcademicPublicDetailDatabase;
    expect(await getPublicAcademicDetail(database, {resource: "UNIT", slug: "pusat-studi", locale: "id"}))
      .toEqual({ok: false, code: "NOT_FOUND"});
  });

  it("uses the same NOT_FOUND result for missing or unpublished records", async () => {
    const database = {lecturer: {findFirst: vi.fn().mockResolvedValue(null)}} as unknown as AcademicPublicDetailDatabase;
    const missing = await getPublicAcademicDetail(database, {resource: "LECTURER", slug: "missing", locale: "id"});
    const unpublished = await getPublicAcademicDetail(database, {resource: "LECTURER", slug: "draft", locale: "id"});
    expect(missing).toEqual({ok: false, code: "NOT_FOUND"});
    expect(unpublished).toEqual(missing);
  });

  it("normalizes thrown database details to UNAVAILABLE", async () => {
    const database = {staff: {findFirst: () => Promise.reject(new Error("postgresql://secret@host/db"))}} as unknown as AcademicPublicDetailDatabase;
    const result = await getPublicAcademicDetail(database, {resource: "STAFF", slug: "staff", locale: "id"});
    expect(result).toEqual({ok: false, code: "UNAVAILABLE"});
    expect(JSON.stringify(result)).not.toContain("postgresql");
  });
});
