import {describe, expect, it} from "vitest";

import {
  ActiveDatabaseSessionSchema,
  AuthorizationContextSchema,
  LoginCredentialsSchema,
  LoginResultSchema,
  PasswordChangeInputSchema,
  SafeInternalPathSchema,
  SessionInvalidResultSchema,
  TicketDataScopeSchema,
} from "@/contracts/auth";
import {
  AUTH_ACTIONS,
  AUTH_RESOURCES,
  canAccessAdminShell,
  getPermissionRule,
  PERMISSION_MATRIX,
} from "@/lib/auth/permission-matrix";
import {authorize} from "@/lib/auth/runtime/authorization";

const ROLES = ["ADMIN", "EDITOR", "PETUGAS", "SATGAS_PPKS", "DOSEN"] as const;

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
    expect(LoginCredentialsSchema.safeParse({
      email: "admin@example.invalid",
      password: "password",
      rememberMe: true,
    }).success).toBe(false);
  });

  it("accepts successful login results and a generic session-invalid result", () => {
    expect(LoginResultSchema.parse({
      ok: true,
      redirectTo: "/id/admin",
      requiresPasswordChange: false,
    })).toEqual({
      ok: true,
      redirectTo: "/id/admin",
      requiresPasswordChange: false,
    });
    expect(SessionInvalidResultSchema.parse({
      ok: false,
      code: "SESSION_INVALID",
    })).toEqual({ok: false, code: "SESSION_INVALID"});
    expect(SessionInvalidResultSchema.safeParse({
      ok: false,
      code: "SESSION_REVOKED",
      reason: "role changed",
    }).success).toBe(false);
  });

  it("accepts only safe internal post-login paths", () => {
    expect(SafeInternalPathSchema.parse("/id/admin")).toBe("/id/admin");
    for (const unsafe of [
      "https://evil.invalid",
      "//evil.invalid",
      "/\\evil",
      "/id/admin\n",
      "/id/admin\u0085hidden",
    ]) {
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
    expect(PasswordChangeInputSchema.safeParse({
      currentPassword: "current-password",
      newPassword: "different-password",
      confirmPassword: "different-password",
      email: "admin@example.invalid",
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
    expect(ActiveDatabaseSessionSchema.safeParse({...session, isActive: false}).success).toBe(false);
    expect(ActiveDatabaseSessionSchema.safeParse({
      ...session,
      expiresAt: undefined,
    }).success).toBe(false);
    expect(ActiveDatabaseSessionSchema.safeParse({
      ...session,
      mustChangePassword: "false",
    }).success).toBe(false);
  });

  it("validates authorization context and ticket scope strictly", () => {
    const actor = ActiveDatabaseSessionSchema.parse({
      userId: "user-1",
      role: "PETUGAS",
      isActive: true,
      mustChangePassword: false,
      expiresAt: new Date("2026-07-13T08:00:00.000Z"),
    });
    expect(AuthorizationContextSchema.parse({
      actor,
      resourceOwnerId: null,
      ticketScope: "NON_PPKS",
    })).toMatchObject({actor, resourceOwnerId: null, ticketScope: "NON_PPKS"});
    expect(TicketDataScopeSchema.safeParse("ALL").success).toBe(false);
    expect(AuthorizationContextSchema.safeParse({
      resourceOwnerId: null,
      ticketScope: "NON_PPKS",
    }).success).toBe(false);
    expect(AuthorizationContextSchema.safeParse({
      actor,
      ticketScope: "ALL",
    }).success).toBe(false);
    expect(AuthorizationContextSchema.safeParse({
      actor,
      debug: true,
    }).success).toBe(false);
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

  it("limits DOSEN to its own lecturer profile", () => {
    for (const action of ["VIEW", "UPDATE"] as const) {
      expect(getPermissionRule("DOSEN", action, "LECTURER_PROFILE")).toMatchObject({
        allowed: true,
        ownership: "OWN",
      });
    }
    expect(getPermissionRule("DOSEN", "DELETE", "LECTURER_PROFILE").allowed).toBe(false);
  });

  it("denies DOSEN every CMS, user-management, booking and ticket capability", () => {
    for (const resource of ["POST", "CMS", "BOOKING", "TICKET", "PPKS_AGGREGATE", "PPKS_TICKET", "PPKS_ACCESS_LOG", "AUDIT_LOG"] as const) {
      for (const action of AUTH_ACTIONS) {
        expect(getPermissionRule("DOSEN", action, resource).allowed).toBe(false);
      }
    }
    for (const action of AUTH_ACTIONS) {
      if (action === "CHANGE_PASSWORD") continue;
      expect(getPermissionRule("DOSEN", action, "USER").allowed).toBe(false);
    }
  });

  it("stops one DOSEN from editing another lecturer's profile", () => {
    const dosen = {
      userId: "dosen-a",
      role: "DOSEN" as const,
      isActive: true as const,
      mustChangePassword: false,
      expiresAt: new Date("2026-12-31T00:00:00.000Z"),
    };
    expect(
      authorize({actor: dosen, resourceOwnerId: "dosen-a"}, "UPDATE", "LECTURER_PROFILE").allowed,
    ).toBe(true);
    expect(
      authorize({actor: dosen, resourceOwnerId: "dosen-b"}, "UPDATE", "LECTURER_PROFILE").allowed,
    ).toBe(false);
    expect(
      authorize({actor: dosen, resourceOwnerId: null}, "UPDATE", "LECTURER_PROFILE").allowed,
    ).toBe(false);
  });

  it("denies no role except DOSEN the admin shell", () => {
    for (const role of ["ADMIN", "EDITOR", "PETUGAS", "SATGAS_PPKS"] as const) {
      expect(canAccessAdminShell(role)).toBe(true);
    }
    expect(canAccessAdminShell("DOSEN")).toBe(false);
  });

  it("denies role changes to every non-ADMIN role", () => {
    for (const role of ["EDITOR", "PETUGAS", "SATGAS_PPKS", "DOSEN"] as const) {
      expect(getPermissionRule(role, "CHANGE_ROLE", "USER")).toMatchObject({
        allowed: false,
        ownership: "NONE",
        dataScope: "NONE",
      });
    }
    expect(getPermissionRule("ADMIN", "CHANGE_ROLE", "USER")).toMatchObject({
      allowed: true,
      ownership: "ANY",
    });
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
      expect(getPermissionRule(role, "VIEW", "TICKET")).toMatchObject({
        allowed: true,
        dataScope: "NON_PPKS",
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

  it("deep-freezes the exported permission matrix", () => {
    expect(Object.isFrozen(PERMISSION_MATRIX)).toBe(true);
    for (const role of ROLES) {
      expect(Object.isFrozen(PERMISSION_MATRIX[role])).toBe(true);
      for (const resource of AUTH_RESOURCES) {
        expect(Object.isFrozen(PERMISSION_MATRIX[role][resource])).toBe(true);
      }
    }
    expect(() => {
      (PERMISSION_MATRIX as unknown as Record<string, unknown>).EDITOR = {};
    }).toThrow();
    expect(getPermissionRule("EDITOR", "VIEW", "CMS").allowed).toBe(false);
  });
});
