import {describe, expect, it} from "vitest";

import {
  PasswordChangeResultSchema,
  ProtectedRouteDecisionSchema,
  type ActiveDatabaseSession,
} from "@/contracts/auth";
import {
  createPostPasswordLoginRedirect,
  normalizeAuthRedirect,
  parseAppLocale,
  resolveAuthLocale,
} from "@/lib/auth/runtime/redirect";
import {
  decideProtectedRoute,
  readSessionToken,
} from "@/lib/auth/runtime/request-session";

const activeSession = (mustChangePassword = false): ActiveDatabaseSession => ({
  userId: "server-only-user-id",
  role: "ADMIN",
  isActive: true,
  mustChangePassword,
  expiresAt: new Date("2030-01-01T00:00:00.000Z"),
});

describe("M2 auth bridge", () => {
  it("normalizes validated destinations to the active locale", () => {
    expect(normalizeAuthRedirect("/id/admin/berita?status=draft#row", "ar")).toBe(
      "/ar/admin/berita?status=draft#row",
    );
    expect(normalizeAuthRedirect("/admin/berita", "en")).toBe("/en/admin/berita");
    expect(normalizeAuthRedirect(undefined, "ar")).toBe("/ar/admin");
    expect(parseAppLocale("en")).toBe("en");
    expect(parseAppLocale("fr")).toBe("id");
    expect(resolveAuthLocale(null, "/ar/admin")).toBe("ar");
    expect(resolveAuthLocale("en", "/ar/admin")).toBe("en");
    expect(resolveAuthLocale("fr", "/ar/admin")).toBe("id");
  });

  it.each([
    "https://attacker.example.test/steal",
    "//attacker.example.test/steal",
    "/%2f%2fattacker.example.test/steal",
    "/id/admin/%00",
    "/id/login",
    "/ar/change-password",
    "/api/auth/session",
    "/id/admin\\secrets",
  ])("falls back for a hostile or looping redirect: %s", (candidate) => {
    expect(normalizeAuthRedirect(candidate, "en")).toBe("/en/admin");
  });

  it("creates a localized post-change login destination without exposing session data", () => {
    const result = {
      ok: true as const,
      redirectTo: createPostPasswordLoginRedirect("ar", "/id/admin/berita"),
    };
    expect(result.redirectTo).toBe("/ar/login?next=%2Far%2Fadmin%2Fberita");
    expect(PasswordChangeResultSchema.parse(result)).toEqual(result);
    expect(JSON.stringify(result)).not.toContain("server-only-user-id");
  });

  it("reads only the cookie variant authorized by the current environment", () => {
    const store = {
      get(name: string) {
        const values: Record<string, {value: string}> = {
          "authjs.session-token": {value: "development-token"},
          "__Secure-authjs.session-token": {value: "production-token"},
        };
        return values[name];
      },
    };
    expect(readSessionToken(store, false)).toBe("development-token");
    expect(readSessionToken(store, true)).toBe("production-token");
  });

  it("routes invalid and forced-password sessions without serializing actor data", () => {
    const invalid = decideProtectedRoute(
      {ok: false, code: "SESSION_INVALID"},
      "en",
      "/id/admin/berita",
    );
    const forced = decideProtectedRoute(
      {ok: true, session: activeSession(true)},
      "ar",
      "/id/admin/berita",
    );
    const allowed = decideProtectedRoute(
      {ok: true, session: activeSession()},
      "id",
      "/id/admin",
    );

    expect(invalid).toEqual({
      allow: false,
      redirectTo: "/en/login?next=%2Fen%2Fadmin%2Fberita",
    });
    expect(forced).toEqual({
      allow: false,
      redirectTo: "/ar/change-password?next=%2Far%2Fadmin%2Fberita",
    });
    expect(allowed).toEqual({allow: true});
    expect(ProtectedRouteDecisionSchema.parse(invalid)).toEqual(invalid);
    expect(JSON.stringify([invalid, forced, allowed])).not.toContain("server-only-user-id");
  });
});
