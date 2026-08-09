import {describe, expect, it, vi} from "vitest";

import {executePublicContentCommand} from "@/features/public-content/administration";
import type {PublicContentDatabase} from "@/features/public-content/shared";

const now = new Date("2026-08-04T03:00:00.000Z");
const actor = {
  userId: "admin-1", role: "ADMIN" as const, isActive: true as const,
  mustChangePassword: false as const, expiresAt: new Date("2026-08-04T11:00:00.000Z"),
};
const serviceInput = {
  slug: "layanan-akademik", category: "AKADEMIK" as const,
  link: {kind: "INTERNAL" as const, href: "/layanan/akademik"}, icon: "book-open",
  isActive: true, order: 0, contentOwnerId: "admin-1", expiresAt: null,
  translations: {id: {name: "Layanan Akademik", description: "<p>Aman<script>jahat</script></p>"}},
};
const partnershipInput = {
  slug: "mitra-riset", partnerName: "Mitra Riset", level: "NASIONAL" as const, country: "Indonesia",
  startDate: null, endDate: null, documentId: null, legacyDocumentUrl: null, websiteUrl: "https://example.org",
  logoMediaId: null, isActive: true, order: 0,
  translations: {id: {category: "Riset", description: "<p>Kolaborasi.</p>"}},
};

describe("public content ADMIN command boundary", () => {
  it("rejects invalid actors and commands before opening a transaction", async () => {
    const database = {$transaction: vi.fn()} as unknown as PublicContentDatabase;
    expect(await executePublicContentCommand(database, {...actor, role: "EDITOR"}, {
      action: "CREATE", resource: "SERVICE", payload: serviceInput,
    }, now)).toEqual({ok: false, code: "SESSION_INVALID"});
    expect(await executePublicContentCommand(database, actor, {
      action: "DELETE", resource: "SERVICE", id: "service-1", expectedVersion: 1,
      where: {id: {not: "service-1"}},
    }, now)).toEqual({ok: false, code: "VALIDATION_FAILED"});
    expect(database.$transaction).not.toHaveBeenCalled();
  });

  it("creates a sanitized Service with revision and audit in one transaction", async () => {
    const tx = {
      service: {create: vi.fn().mockResolvedValue({id: "service-1", version: 1})},
      contentRevision: {create: vi.fn().mockResolvedValue({id: "revision-1"})},
      activityLog: {create: vi.fn().mockResolvedValue({id: "audit-1"})},
    };
    const database = {$transaction: vi.fn(async (callback: (value: typeof tx) => unknown) => callback(tx))} as unknown as PublicContentDatabase;
    expect(await executePublicContentCommand(database, actor, {
      action: "CREATE", resource: "SERVICE", payload: serviceInput,
    }, now)).toEqual({ok: true, id: "service-1", resource: "SERVICE", version: 1});
    const create = tx.service.create.mock.calls[0]![0];
    expect(create.data.translations.create[0].description).toBe("<p>Aman</p>");
    expect(tx.contentRevision.create).toHaveBeenCalledOnce();
    expect(tx.activityLog.create).toHaveBeenCalledOnce();
  });

  it("returns VERSION_CONFLICT when a versioned update loses its claim", async () => {
    const tx = {
      service: {findUnique: vi.fn().mockResolvedValue({id: "service-1"}), updateMany: vi.fn().mockResolvedValue({count: 0})},
    };
    const database = {$transaction: vi.fn(async (callback: (value: typeof tx) => unknown) => callback(tx))} as unknown as PublicContentDatabase;
    expect(await executePublicContentCommand(database, actor, {
      action: "UPDATE", resource: "SERVICE", mutation: {id: "service-1", expectedVersion: 3}, payload: serviceInput,
    }, now)).toEqual({ok: false, code: "VERSION_CONFLICT"});
  });

  it("returns VERSION_CONFLICT when a partnership update loses its version claim", async () => {
    const tx = {
      partnership: {
        findUnique: vi.fn().mockResolvedValue({id: "partnership-1"}),
        updateMany: vi.fn().mockResolvedValue({count: 0}),
      },
    };
    const database = {$transaction: vi.fn(async (callback: (value: typeof tx) => unknown) => callback(tx))} as unknown as PublicContentDatabase;
    expect(await executePublicContentCommand(database, actor, {
      action: "UPDATE", resource: "PARTNERSHIP", mutation: {id: "partnership-1", expectedVersion: 2}, payload: partnershipInput,
    }, now)).toEqual({ok: false, code: "VERSION_CONFLICT"});
  });

  it("rejects mismatched version intent and future consent before writes", async () => {
    const tx = {};
    const database = {$transaction: vi.fn(async (callback: (value: typeof tx) => unknown) => callback(tx))} as unknown as PublicContentDatabase;
    expect(await executePublicContentCommand(database, actor, {
      action: "DELETE", resource: "SERVICE", id: "service-1", expectedVersion: null,
    }, now)).toEqual({ok: false, code: "VALIDATION_FAILED"});
    expect(await executePublicContentCommand(database, actor, {
      action: "CREATE", resource: "TESTIMONIAL", payload: {
        name: "Alumni", graduationYear: 2025, photoMediaId: null, order: 0, isVisible: true,
        publicationConsentAt: "2026-08-05T03:00:00.000Z",
        translations: {id: {currentRole: "Peneliti", quote: "Bermanfaat."}},
      },
    }, now)).toEqual({ok: false, code: "VALIDATION_FAILED"});
  });

  it("normalizes technical database errors", async () => {
    const database = {$transaction: vi.fn().mockRejectedValue(new Error("postgresql://secret@host/db"))} as unknown as PublicContentDatabase;
    const result = await executePublicContentCommand(database, actor, {
      action: "CREATE", resource: "SERVICE", payload: serviceInput,
    }, now);
    expect(result).toEqual({ok: false, code: "UNAVAILABLE"});
    expect(JSON.stringify(result)).not.toContain("postgresql");
  });

  it("reports only actual slug uniqueness errors as SLUG_CONFLICT", async () => {
    const command = {action: "CREATE", resource: "SERVICE", payload: serviceInput};
    const slugDatabase = {$transaction: vi.fn().mockRejectedValue({code: "P2002", meta: {target: ["slug"]}})} as unknown as PublicContentDatabase;
    const translationDatabase = {$transaction: vi.fn().mockRejectedValue({code: "P2002", meta: {target: ["serviceId", "locale"]}})} as unknown as PublicContentDatabase;
    expect(await executePublicContentCommand(slugDatabase, actor, command, now)).toEqual({ok: false, code: "SLUG_CONFLICT"});
    expect(await executePublicContentCommand(translationDatabase, actor, command, now)).toEqual({ok: false, code: "UNAVAILABLE"});
  });

  it("preflights every reorder ID before changing any row", async () => {
    const tx = {service: {
      count: vi.fn().mockResolvedValue(1), update: vi.fn(),
    }};
    const database = {$transaction: vi.fn(async (callback: (value: typeof tx) => unknown) => callback(tx))} as unknown as PublicContentDatabase;
    expect(await executePublicContentCommand(database, actor, {
      action: "REORDER", resource: "SERVICE", payload: {items: [
        {id: "service-1", position: 0}, {id: "service-missing", position: 1},
      ]},
    }, now)).toEqual({ok: false, code: "NOT_FOUND"});
    expect(tx.service.update).not.toHaveBeenCalled();
  });

  it("increments versions and records revisions before completing a versioned reorder", async () => {
    const tx = {service: {
      count: vi.fn().mockResolvedValue(1), update: vi.fn().mockResolvedValue({version: 2}),
    }, contentRevision: {create: vi.fn().mockResolvedValue({id: "revision-1"})},
    activityLog: {create: vi.fn().mockResolvedValue({id: "audit-1"})}};
    const database = {$transaction: vi.fn(async (callback: (value: typeof tx) => unknown) => callback(tx))} as unknown as PublicContentDatabase;
    expect(await executePublicContentCommand(database, actor, {
      action: "REORDER", resource: "SERVICE", payload: {items: [{id: "service-1", position: 0}]},
    }, now)).toEqual({ok: true, id: "service-1", resource: "SERVICE", version: 2});
    expect(tx.service.update).toHaveBeenCalledWith({where: {id: "service-1"},
      data: {order: 0, version: {increment: 1}}, select: {version: true}});
    expect(tx.contentRevision.create).toHaveBeenCalledOnce();
    expect(tx.activityLog.create).toHaveBeenCalledWith({data: expect.objectContaining({metadata: {operation: "REORDER", version: 2}})});
  });

  it("increments partnership reorder versions and records revisions", async () => {
    const tx = {partnership: {
      count: vi.fn().mockResolvedValue(1), update: vi.fn().mockResolvedValue({version: 2}),
    }, contentRevision: {create: vi.fn().mockResolvedValue({id: "revision-1"})},
    activityLog: {create: vi.fn().mockResolvedValue({id: "audit-1"})}};
    const database = {$transaction: vi.fn(async (callback: (value: typeof tx) => unknown) => callback(tx))} as unknown as PublicContentDatabase;
    expect(await executePublicContentCommand(database, actor, {
      action: "REORDER", resource: "PARTNERSHIP", payload: {items: [{id: "partnership-1", position: 0}]},
    }, now)).toEqual({ok: true, id: "partnership-1", resource: "PARTNERSHIP", version: 2});
    expect(tx.partnership.update).toHaveBeenCalledWith({where: {id: "partnership-1"},
      data: {order: 0, version: {increment: 1}}, select: {version: true}});
    expect(tx.contentRevision.create).toHaveBeenCalledOnce();
    expect(tx.activityLog.create).toHaveBeenCalledWith({data: expect.objectContaining({resourceType: "Partnership", metadata: {operation: "REORDER", version: 2}})});
  });
});
