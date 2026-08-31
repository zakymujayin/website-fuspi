import {describe, expect, it} from "vitest";

import {
  AdminUserCommandSchema,
  AdminUserListResultSchema,
  AdminUserMutationResultSchema,
  TaxonomyCommandSchema,
  TaxonomyMutationResultSchema,
  TaxonomyTranslationsInputSchema,
  TrustedAdminFoundationActorSchema,
  normalizeAdminUserSearchParams,
  normalizeTaxonomySearchParams,
} from "@/contracts/admin-foundation";
import {AuthRoleSchema} from "@/contracts/auth";

const now = "2026-08-04T03:00:00.000Z";
const workflow = {locale: "id", status: "DRAFT", sourceVersion: 1, translatorId: "admin-1", reviewerId: null, reviewedAt: null} as const;
const taxonomy = {
  id: "taxonomy-1",
  kind: "CATEGORY",
  slug: "berita-fakultas",
  translations: {id: {name: "Berita Fakultas", workflow}, en: null, ar: null},
  usageCount: 0,
} as const;

describe("ADMIN user contracts", () => {
  it("accepts only a current unrestricted ADMIN actor", () => {
    expect(TrustedAdminFoundationActorSchema.safeParse({userId: "admin-1", role: "ADMIN", isActive: true, mustChangePassword: false, expiresAt: new Date(Date.now() + 60_000)}).success).toBe(true);
    expect(TrustedAdminFoundationActorSchema.safeParse({userId: "editor-1", role: "EDITOR", isActive: true, mustChangePassword: false, expiresAt: new Date(Date.now() + 60_000)}).success).toBe(false);
    expect(TrustedAdminFoundationActorSchema.safeParse({userId: "admin-1", role: "ADMIN", isActive: true, mustChangePassword: true, expiresAt: new Date(Date.now() + 60_000)}).success).toBe(false);
  });

  it("normalizes bounded filters while rejecting duplicates and arbitrary selectors", () => {
    expect(normalizeAdminUserSearchParams(new URLSearchParams("page=2&role=EDITOR&active=ACTIVE&direction=DESC"))).toEqual({page: 2, pageSize: 20, search: "", direction: "DESC", role: "EDITOR", active: "ACTIVE"});
    expect(() => normalizeAdminUserSearchParams(new URLSearchParams("role=ADMIN&role=EDITOR"))).toThrow();
    expect(() => normalizeAdminUserSearchParams(new URLSearchParams("orderBy=passwordHash"))).toThrow();
  });

  it("requires normalized strong initial credentials and forced password change", () => {
    const parsed = AdminUserCommandSchema.parse({action: "CREATE", payload: {name: " Admin Baru ", email: "ADMIN.BARU@EXAMPLE.COM", initialPassword: "unique-password-2026", confirmPassword: "unique-password-2026", role: "ADMIN", isActive: true}});
    expect(parsed.payload).toMatchObject({name: "Admin Baru", email: "admin.baru@example.com", mustChangePassword: true});
    expect(AdminUserCommandSchema.safeParse({action: "CREATE", payload: {name: "Admin", email: "admin@example.com", initialPassword: "short", confirmPassword: "short", role: "ADMIN"}}).success).toBe(false);
    expect(AdminUserCommandSchema.safeParse({action: "CREATE", payload: {name: "Admin", email: "admin@example.com", initialPassword: "unique-password-2026", confirmPassword: "different-password", role: "ADMIN"}}).success).toBe(false);
  });

  it("accepts institutional booking roles as application roles", () => {
    expect(AuthRoleSchema.options).toEqual([
      "ADMIN",
      "EDITOR",
      "PETUGAS",
      "STAF_UMUM",
      "DEKAN",
      "WADEK",
      "KABAG",
      "SATGAS_PPKS",
      "DOSEN",
    ]);
    for (const role of ["STAF_UMUM", "DEKAN", "WADEK", "KABAG"] as const) {
      expect(AdminUserCommandSchema.safeParse({
        action: "CREATE",
        payload: {
          name: `User ${role}`,
          email: `${role.toLowerCase()}@example.com`,
          initialPassword: "unique-password-2026",
          confirmPassword: "unique-password-2026",
          role,
          isActive: true,
        },
      }).success).toBe(true);
    }
  });

  it("supports optimistic updatedAt changes and exposes no delete command", () => {
    const update = {action: "UPDATE", payload: {userId: "user-1", expectedUpdatedAt: now, name: "Editor", email: "editor@example.com", role: "EDITOR", isActive: false}};
    expect(AdminUserCommandSchema.safeParse(update).success).toBe(true);
    expect(AdminUserCommandSchema.safeParse({action: "DELETE", payload: {userId: "user-1"}}).success).toBe(false);
    expect(AdminUserCommandSchema.safeParse({...update, actorId: "attacker"}).success).toBe(false);
  });

  it("keeps user list and mutation outputs free of auth secrets and technical failures", () => {
    const user = {id: "user-1", name: "Editor", email: "editor@example.com", role: "EDITOR", isActive: true, mustChangePassword: false, createdAt: now, updatedAt: now};
    const page = {page: 1, pageSize: 20, total: 1, totalPages: 1, hasNextPage: false, hasPreviousPage: false};
    expect(AdminUserListResultSchema.safeParse({items: [user], page}).success).toBe(true);
    expect(AdminUserListResultSchema.safeParse({items: [{...user, passwordHash: "secret"}], page}).success).toBe(false);
    expect(AdminUserMutationResultSchema.safeParse({ok: false, code: "LAST_ADMIN"}).success).toBe(true);
    expect(AdminUserMutationResultSchema.safeParse({ok: false, code: "P2002"}).success).toBe(false);
  });
});

describe("Category and Tag contracts", () => {
  it("requires Indonesian and rejects empty, duplicate-shaped, or unknown translations", () => {
    expect(TaxonomyTranslationsInputSchema.safeParse({id: {name: "Berita"}, en: {name: "News"}, ar: {name: "أخبار"}}).success).toBe(true);
    expect(TaxonomyTranslationsInputSchema.safeParse({en: {name: "News"}}).success).toBe(false);
    expect(TaxonomyTranslationsInputSchema.safeParse({id: {name: " "}}).success).toBe(false);
    expect(TaxonomyTranslationsInputSchema.safeParse({id: {name: "Berita", locale: "id"}}).success).toBe(false);
  });

  it("normalizes taxonomy filters and rejects duplicate or Prisma-shaped query input", () => {
    expect(normalizeTaxonomySearchParams(new URLSearchParams("kind=TAG&search=filsafat"))).toEqual({page: 1, pageSize: 10, search: "filsafat", direction: "ASC", kind: "TAG"});
    expect(() => normalizeTaxonomySearchParams(new URLSearchParams("kind=TAG&kind=CATEGORY"))).toThrow();
    expect(() => normalizeTaxonomySearchParams(new URLSearchParams("select=posts"))).toThrow();
  });

  it("strictly validates create, update, and delete commands", () => {
    expect(TaxonomyCommandSchema.safeParse({action: "CREATE", payload: {kind: "CATEGORY", slug: "berita-fakultas", translations: {id: {name: "Berita Fakultas"}}}}).success).toBe(true);
    expect(TaxonomyCommandSchema.safeParse({action: "UPDATE", payload: {taxonomyId: "category-1", kind: "CATEGORY", slug: "Berita Fakultas", translations: {id: {name: "Berita"}}}}).success).toBe(false);
    expect(TaxonomyCommandSchema.safeParse({action: "DELETE", payload: {taxonomyId: "tag-1", kind: "TAG", force: true}}).success).toBe(false);
  });

  it("returns bounded usage counts and deterministic in-use failures", () => {
    expect(TaxonomyMutationResultSchema.safeParse({ok: true, taxonomy}).success).toBe(true);
    expect(TaxonomyMutationResultSchema.safeParse({ok: false, code: "IN_USE"}).success).toBe(true);
    expect(TaxonomyMutationResultSchema.safeParse({ok: true, taxonomy: {...taxonomy, usageCount: -1}}).success).toBe(false);
    expect(TaxonomyMutationResultSchema.safeParse({ok: false, code: "database unavailable", error: "secret"}).success).toBe(false);
  });
});
