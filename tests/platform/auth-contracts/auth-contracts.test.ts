import {describe, expect, it} from "vitest";

import {
  ActiveDatabaseSessionSchema,
  LoginCredentialsSchema,
  LoginResultSchema,
  PasswordChangeInputSchema,
  SafeInternalPathSchema,
} from "@/contracts/auth";
import {
  AUTH_ACTIONS,
  AUTH_RESOURCES,
  getPermissionRule,
  PERMISSION_MATRIX,
} from "@/lib/auth/permission-matrix";

const ROLES = ["ADMIN", "EDITOR", "PETUGAS", "SATGAS_PPKS"] as const;

describe("authentication contracts", () => {
  it("normalizes credentials without exposing account state", () => {
    expect(LoginCredentialsSchema.parse({
      email: "  ADMIN@EXAMPLE.INVALID ",
      password: "not-logged-or-returned",
    })).toEqual({
      email: "admin@example.invalid",
      password: "not-logged-or-returned",
    });
    expect(LoginResultSchema.parse({ok: false, code: "INVALID_CREDENTIALS"})).toEqual({
      ok: false,
      code: "INVALID_CREDENTIALS",
    });
    expect(() => LoginResultSchema.parse({ok: false, code: "EMAIL_NOT_FOUND"})).toThrow();
  });

  it("accepts only safe internal post-login paths", () => {
    expect(SafeInternalPathSchema.parse("/id/admin")).toBe("/id/admin");
    for (const unsafe of ["https://evil.invalid", "//evil.invalid", "/\\evil", "/id/admin\n"]) {
      expect(() => SafeInternalPathSchema.parse(unsafe)).toThrow();
    }
  });

  it("enforces password-change shape and confirmation", () => {
    expect(PasswordChangeInputSchema.safeParse({
      currentPassword: "current-password",
      newPassword: "different-password",
      confirmPassword: "different-password",
    }).success).toBe(true);
    expect(PasswordChangeInputSchema.safeParse({
      currentPassword: "same-password",
      newPassword: "same-password",
      confirmPassword: "different-password",
    }).success).toBe(false);
  });

  it("keeps active session metadata minimal and token-free", () => {
    const session = ActiveDatabaseSessionSchema.parse({
      userId: "user-1",
      role: "EDITOR",
      isActive: true,
      mustChangePassword: false,
      expiresAt: new Date("2026-07-13T08:00:00.000Z"),
    });
    expect(Object.keys(session).sort()).toEqual([
      "expiresAt", "isActive", "mustChangePassword", "role", "userId",
    ]);
    expect(() => ActiveDatabaseSessionSchema.parse({...session, sessionToken: "raw"})).toThrow();
  });
});

describe("permission matrix", () => {
  it("has an explicit decision for every role/resource/action combination", () => {
    for (const role of ROLES) {
      expect(Object.keys(PERMISSION_MATRIX[role]).sort()).toEqual([...AUTH_RESOURCES].sort());
      for (const resource of AUTH_RESOURCES) {
        expect(Object.keys(PERMISSION_MATRIX[role][resource]).sort()).toEqual([...AUTH_ACTIONS].sort());
      }
    }
  });

  it("limits editors to their own posts and media", () => {
    expect(getPermissionRule("EDITOR", "PUBLISH", "POST")).toMatchObject({
      allowed: true,
      ownership: "OWN",
    });
    expect(getPermissionRule("EDITOR", "VIEW", "CMS").allowed).toBe(false);
    expect(getPermissionRule("EDITOR", "VIEW", "TICKET").allowed).toBe(false);
  });

  it("allows every active role to change only its own password", () => {
    for (const role of ROLES) {
      expect(getPermissionRule(role, "CHANGE_PASSWORD", "USER")).toMatchObject({
        allowed: true,
        ownership: role === "ADMIN" ? "ANY" : "OWN",
      });
    }
  });

  it("isolates PPKS detail from ADMIN and PETUGAS", () => {
    for (const role of ["ADMIN", "PETUGAS"] as const) {
      for (const action of AUTH_ACTIONS) {
        expect(getPermissionRule(role, action, "PPKS_TICKET").allowed).toBe(false);
        expect(getPermissionRule(role, action, "PPKS_ACCESS_LOG").allowed).toBe(false);
      }
      expect(getPermissionRule(role, "VIEW", "PPKS_AGGREGATE")).toMatchObject({
        allowed: true,
        dataScope: "PPKS_AGGREGATE",
      });
    }
  });

  it("limits SATGAS_PPKS to PPKS resources plus its own password", () => {
    expect(getPermissionRule("SATGAS_PPKS", "VIEW", "PPKS_TICKET")).toMatchObject({
      allowed: true,
      dataScope: "PPKS_DETAIL",
    });
    expect(getPermissionRule("SATGAS_PPKS", "VIEW", "PPKS_ACCESS_LOG").allowed).toBe(true);
    expect(getPermissionRule("SATGAS_PPKS", "CHANGE_PASSWORD", "USER")).toMatchObject({
      allowed: true,
      ownership: "OWN",
    });
    for (const resource of ["CMS", "BOOKING", "TICKET"] as const) {
      for (const action of AUTH_ACTIONS) {
        expect(getPermissionRule("SATGAS_PPKS", action, resource).allowed).toBe(false);
      }
    }
  });
});
