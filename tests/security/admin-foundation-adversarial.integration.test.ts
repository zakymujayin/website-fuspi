import {describe, expect, it} from "vitest";

import type {ActiveDatabaseSession} from "@/contracts/auth";
import {executeAdminUserCommand, executeTaxonomyCommand, listAdminUsers, listTaxonomies, type AdminFoundationDatabase} from "@/features/admin/foundation";

const now = new Date("2026-08-04T03:00:00.000Z");
const invalidActors: ActiveDatabaseSession[] = [
  "EDITOR",
  "PETUGAS",
  "STAF_UMUM",
  "DEKAN",
  "WADEK",
  "KABAG",
  "SATGAS_PPKS",
].map((role) => ({userId: `${role.toLowerCase()}-1`, role: role as ActiveDatabaseSession["role"], isActive: true, mustChangePassword: false, expiresAt: new Date("2026-08-04T04:00:00.000Z")}));
const forbiddenDatabase = new Proxy({}, {get() { throw new Error("database access would disclose record existence"); }}) as AdminFoundationDatabase;

describe("ADMIN foundation adversarial boundary", () => {
  it.each(invalidActors)("returns one failure for existing-or-missing User and taxonomy probes", async (actor) => {
    const existingUser = {action: "UPDATE", payload: {userId: "known-user", expectedUpdatedAt: "2026-08-04T01:00:00.000Z", name: "x", email: "x@example.com", role: "EDITOR", isActive: true}};
    const missingUser = {...existingUser, payload: {...existingUser.payload, userId: "missing-user"}};
    expect(await executeAdminUserCommand(forbiddenDatabase, actor, existingUser, now)).toEqual({ok: false, code: "SESSION_INVALID"});
    expect(await executeAdminUserCommand(forbiddenDatabase, actor, missingUser, now)).toEqual({ok: false, code: "SESSION_INVALID"});
    expect(await listAdminUsers(forbiddenDatabase, actor, {}, now)).toEqual({ok: false, code: "SESSION_INVALID"});
    expect(await listTaxonomies(forbiddenDatabase, actor, {}, now)).toEqual({ok: false, code: "SESSION_INVALID"});
    expect(await executeTaxonomyCommand(forbiddenDatabase, actor, {action: "DELETE", payload: {taxonomyId: "known", kind: "CATEGORY"}}, now)).toEqual({ok: false, code: "SESSION_INVALID"});
  });

  it("rejects selector injection and technical failure-code injection before database access", async () => {
    const admin = {userId: "admin-1", role: "ADMIN", isActive: true, mustChangePassword: false, expiresAt: new Date("2026-08-04T04:00:00.000Z")} as const;
    expect(await listAdminUsers(forbiddenDatabase, admin, {page: 1, pageSize: 20, search: "", direction: "ASC", role: "ALL", active: "ALL", select: {passwordHash: true}}, now)).toEqual({ok: false, code: "REQUEST_INVALID"});
    expect(await executeTaxonomyCommand(forbiddenDatabase, admin, {action: "DELETE", payload: {taxonomyId: "known", kind: "CATEGORY", force: true}}, now)).toEqual({ok: false, code: "VALIDATION_FAILED"});
  });
});
