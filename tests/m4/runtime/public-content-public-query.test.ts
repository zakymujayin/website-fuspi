import {describe, expect, it, vi} from "vitest";

import {getPublicContentDetail} from "@/features/public-content/public-query";
import type {PublicContentDatabase} from "@/features/public-content/shared";

const now = new Date("2026-08-04T03:00:00.000Z");

describe("public content detail boundary", () => {
  it("rejects hostile queries before database access", async () => {
    const database = {service: {findFirst: vi.fn()}} as unknown as PublicContentDatabase;
    expect(await getPublicContentDetail(database, {
      resource: "SERVICE", slug: "layanan", locale: "id", where: {contentOwnerId: {not: null}},
    }, now)).toEqual({ok: false, code: "REQUEST_INVALID"});
    expect(database.service.findFirst).not.toHaveBeenCalled();
  });

  it("returns a safe Indonesian fallback for an active Service", async () => {
    const database = {service: {findFirst: vi.fn().mockResolvedValue({
      id: "service-1", slug: "layanan", category: "AKADEMIK", url: "/layanan/form",
      icon: "book-open", order: 0, contentOwnerId: "private-owner", expiresAt: null,
      translations: [{locale: "id", status: "PUBLISHED", name: "Layanan", description: "<p>Aman.</p>"}],
    })}} as unknown as PublicContentDatabase;
    const result = await getPublicContentDetail(database, {resource: "SERVICE", slug: "layanan", locale: "en"}, now);
    expect(result).toMatchObject({ok: true, data: {resource: "SERVICE", translation: {resolvedLocale: "id", isFallback: true}}});
    expect(JSON.stringify(result)).not.toMatch(/contentOwner|reviewer|storageKey|phone/i);
  });

  it("fails closed for unsafe legacy links", async () => {
    const database = {service: {findFirst: vi.fn().mockResolvedValue({
      id: "service-1", slug: "layanan", category: "AKADEMIK", url: "https://127.0.0.1/admin",
      icon: null, order: 0, translations: [{locale: "id", status: "PUBLISHED", name: "Layanan", description: null}],
    })}} as unknown as PublicContentDatabase;
    expect(await getPublicContentDetail(database, {resource: "SERVICE", slug: "layanan", locale: "id"}, now))
      .toEqual({ok: false, code: "NOT_FOUND"});
  });

  it("uses the same NOT_FOUND result for absent and non-public testimonials", async () => {
    const database = {testimonial: {findFirst: vi.fn().mockResolvedValue(null)}} as unknown as PublicContentDatabase;
    const missing = await getPublicContentDetail(database, {resource: "TESTIMONIAL", id: "missing", locale: "id"}, now);
    const hidden = await getPublicContentDetail(database, {resource: "TESTIMONIAL", id: "hidden", locale: "id"}, now);
    expect(missing).toEqual({ok: false, code: "NOT_FOUND"});
    expect(hidden).toEqual(missing);
  });

  it("normalizes thrown database details", async () => {
    const database = {event: {findFirst: () => Promise.reject(new Error("postgresql://secret@host/db"))}} as unknown as PublicContentDatabase;
    const result = await getPublicContentDetail(database, {resource: "EVENT", slug: "agenda", locale: "id"}, now);
    expect(result).toEqual({ok: false, code: "UNAVAILABLE"});
    expect(JSON.stringify(result)).not.toContain("postgresql");
  });
});
