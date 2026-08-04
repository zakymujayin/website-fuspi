import {describe, expect, it} from "vitest";

import type {ActiveDatabaseSession} from "@/contracts/auth";
import {
  adminFoundationHttpStatus,
  executeAdminUserCommand,
  executeTaxonomyCommand,
  listAdminUsers,
  listTaxonomies,
  type AdminFoundationDatabase,
} from "@/features/admin/foundation";

const now = new Date("2026-08-04T03:00:00.000Z");
const admin = {userId: "admin-1", role: "ADMIN", isActive: true, mustChangePassword: false, expiresAt: new Date("2026-08-04T04:00:00.000Z")} as const;
const invalidActors: Array<ActiveDatabaseSession | null> = [
  null,
  {...admin, role: "EDITOR"},
  {...admin, role: "PETUGAS"},
  {...admin, role: "SATGAS_PPKS"},
  {...admin, mustChangePassword: true},
  {...admin, expiresAt: now},
];

function forbiddenDatabase(): AdminFoundationDatabase {
  return new Proxy({}, {get() { throw new Error("database must not be accessed"); }}) as AdminFoundationDatabase;
}

const userCreate = {
  action: "CREATE",
  payload: {
    name: "Editor Baru",
    email: "editor.baru@example.com",
    initialPassword: "unique-password-2026",
    confirmPassword: "unique-password-2026",
    role: "EDITOR",
    isActive: true,
  },
} as const;

describe("ADMIN foundation runtime boundary", () => {
  it.each(invalidActors)("rejects invalid actor before User database access", async (actor) => {
    await expect(listAdminUsers(forbiddenDatabase(), actor, {}, now)).resolves.toEqual({ok: false, code: "SESSION_INVALID"});
    await expect(executeAdminUserCommand(forbiddenDatabase(), actor, userCreate, now)).resolves.toEqual({ok: false, code: "SESSION_INVALID"});
  });

  it("rejects invalid User query and command before database access", async () => {
    await expect(listAdminUsers(forbiddenDatabase(), admin, {pageSize: 100}, now)).resolves.toEqual({ok: false, code: "REQUEST_INVALID"});
    await expect(executeAdminUserCommand(forbiddenDatabase(), admin, {action: "DELETE", payload: {userId: "user-1"}}, now)).resolves.toEqual({ok: false, code: "VALIDATION_FAILED"});
  });

  it("rejects common initial passwords before hashing or database access", async () => {
    const command = {...userCreate, payload: {...userCreate.payload, initialPassword: "password1234", confirmPassword: "password1234"}};
    await expect(executeAdminUserCommand(forbiddenDatabase(), admin, command, now)).resolves.toEqual({ok: false, code: "VALIDATION_FAILED"});
  });

  it("rejects invalid Taxonomy actors, queries, and commands before database access", async () => {
    await expect(listTaxonomies(forbiddenDatabase(), {...admin, role: "EDITOR"}, {}, now)).resolves.toEqual({ok: false, code: "SESSION_INVALID"});
    await expect(listTaxonomies(forbiddenDatabase(), admin, {kind: "PRIVATE"}, now)).resolves.toEqual({ok: false, code: "REQUEST_INVALID"});
    await expect(executeTaxonomyCommand(forbiddenDatabase(), admin, {action: "DELETE", payload: {taxonomyId: "x", kind: "PRIVATE"}}, now)).resolves.toEqual({ok: false, code: "VALIDATION_FAILED"});
  });

  it("maps only deterministic HTTP statuses", () => {
    expect(adminFoundationHttpStatus({ok: true})).toBe(200);
    expect(adminFoundationHttpStatus({ok: false, code: "SESSION_INVALID"})).toBe(401);
    expect(adminFoundationHttpStatus({ok: false, code: "CSRF_INVALID"})).toBe(403);
    expect(adminFoundationHttpStatus({ok: false, code: "NOT_FOUND"})).toBe(404);
    expect(adminFoundationHttpStatus({ok: false, code: "LAST_ADMIN"})).toBe(409);
    expect(adminFoundationHttpStatus({ok: false, code: "UNAVAILABLE"})).toBe(503);
    expect(adminFoundationHttpStatus({ok: false, code: "VALIDATION_FAILED"})).toBe(400);
  });
});
