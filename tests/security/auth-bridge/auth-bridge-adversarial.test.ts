import {describe, expect, it} from "vitest";

import {
  PasswordChangeInputSchema,
  PasswordChangeResultSchema,
  PasswordChangeFailureCodeSchema,
  SafeInternalPathSchema,
} from "@/contracts/auth";
import {
  normalizeAuthRedirect,
  parseAppLocale,
  resolveAuthLocale,
} from "@/lib/auth/runtime/redirect";
import {getSessionCookieName} from "@/lib/auth/runtime/cookie";
import {readSessionToken} from "@/lib/auth/runtime/request-session";

// ---------------------------------------------------------------------------
// Target 1 — locale normalization edge cases beyond platform coverage
// ---------------------------------------------------------------------------
describe("redirect locale normalization adversarial", () => {
  it("rejects double-encoded protocol-relative attack", () => {
    expect(normalizeAuthRedirect("%252f%252fattacker.example.test%252fsteal", "id")).toBe(
      "/id/admin",
    );
    expect(normalizeAuthRedirect("%252F%252Fattacker.test%252Fsteal", "ar")).toBe(
      "/ar/admin",
    );
  });

  it("rejects incomplete percent encodings that produce control chars", () => {
    expect(normalizeAuthRedirect("/id/admin%2", "en")).toBe("/en/admin");
    expect(normalizeAuthRedirect("/id/admin%%41", "en")).toBe("/en/admin");
    expect(normalizeAuthRedirect("/id/admin%GG", "en")).toBe("/en/admin");
  });

  it("falls back for query-only or hash-only destination", () => {
    expect(normalizeAuthRedirect("?q=search", "id")).toBe("/id/admin");
    expect(normalizeAuthRedirect("#section", "id")).toBe("/id/admin");
  });

  it("falls back for consecutive slashes", () => {
    expect(normalizeAuthRedirect("/id//admin", "ar")).toBe("/ar/admin");
  });

  it("falls back for path with no recognisable first segment", () => {
    expect(normalizeAuthRedirect("/_next/static/chunk.js", "en")).toBe("/en/admin");
    expect(normalizeAuthRedirect("/api/internal", "id")).toBe("/id/admin");
  });

  it("preserves query and fragment after locale swap", () => {
    expect(normalizeAuthRedirect("/id/admin/berita?status=draft#row", "ar")).toBe(
      "/ar/admin/berita?status=draft#row",
    );
  });

  it("rejects unicode homoglyph locale prefix", () => {
    expect(normalizeAuthRedirect("/аг/admin", "en")).toBe("/en/admin");
  });

  it.each([null, undefined, true, 42, [], {}])(
    "parseAppLocale defaults for non-string: %s",
    (value) => {
      expect(parseAppLocale(value)).toBe("id");
    },
  );

  it("parseAppLocale rejects very long locale strings", () => {
    expect(parseAppLocale("x".repeat(200))).toBe("id");
  });

  it("resolveAuthLocale uses localeHint over redirect candidate", () => {
    expect(resolveAuthLocale("en", "/id/admin/berita")).toBe("en");
    expect(resolveAuthLocale(null, "/ar/admin")).toBe("ar");
    expect(resolveAuthLocale(undefined, "/ar/admin")).toBe("ar");
    expect(resolveAuthLocale("fr", "/ar/admin/berita")).toBe("id");
  });

  it("resolveAuthLocale defaults when no hint and redirect unsafe", () => {
    expect(resolveAuthLocale(null, "https://evil.test")).toBe("id");
    expect(resolveAuthLocale(undefined, undefined)).toBe("id");
    expect(resolveAuthLocale(undefined, "//evil")).toBe("id");
  });

  it("SafeInternalPathSchema rejects paths that exceed max length", () => {
    expect(SafeInternalPathSchema.safeParse("/" + "a".repeat(2048)).success).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Target 2 — cookie/session edge cases
// ---------------------------------------------------------------------------
describe("cookie name isolation adversarial", () => {
  it("isolates dev and prod cookie names", () => {
    expect(getSessionCookieName(false)).toBe("authjs.session-token");
    expect(getSessionCookieName(true)).toBe("__Secure-authjs.session-token");
    expect(getSessionCookieName(false)).not.toBe(getSessionCookieName(true));
  });

  it("readSessionToken returns undefined for missing cookie", () => {
    expect(readSessionToken({get: () => undefined}, false)).toBeUndefined();
    expect(readSessionToken({get: () => undefined}, true)).toBeUndefined();
  });

  it("readSessionToken reads only the environment cookie variant", () => {
    const store = {
      get(name: string) {
        if (name === "authjs.session-token") return {value: "dev"};
        if (name === "__Secure-authjs.session-token") return {value: "prod"};
        return undefined;
      },
    };
    expect(readSessionToken(store, false)).toBe("dev");
    expect(readSessionToken(store, true)).toBe("prod");
  });

  it("readSessionToken handles empty-string cookie values", () => {
    const store = {get: () => ({value: ""})};
    expect(readSessionToken(store, false)).toBe("");
  });
});

// ---------------------------------------------------------------------------
// Target 3 — password change input validation adversarial
// ---------------------------------------------------------------------------
describe("password change input adversarial", () => {
  it("rejects mismatched confirmation", () => {
    const result = PasswordChangeInputSchema.safeParse({
      currentPassword: "oldPassword12",
      newPassword: "newSecret5678",
      confirmPassword: "differentOne99",
    });
    expect(result.success).toBe(false);
    expect(result.error?.issues.some((i) => i.path.includes("confirmPassword"))).toBe(true);
  });

  it("rejects new password equal to current password", () => {
    const result = PasswordChangeInputSchema.safeParse({
      currentPassword: "SamePassword12",
      newPassword: "SamePassword12",
      confirmPassword: "SamePassword12",
    });
    expect(result.success).toBe(false);
    expect(result.error?.issues.some((i) => i.path.includes("newPassword"))).toBe(true);
  });

  it("rejects passwords shorter than 12 characters", () => {
    const result = PasswordChangeInputSchema.safeParse({
      currentPassword: "short",
      newPassword: "short",
      confirmPassword: "short",
    });
    expect(result.success).toBe(false);
  });

  it("rejects non-object input", () => {
    expect(PasswordChangeInputSchema.safeParse(null).success).toBe(false);
    expect(PasswordChangeInputSchema.safeParse("string").success).toBe(false);
    expect(PasswordChangeInputSchema.safeParse(42).success).toBe(false);
    expect(PasswordChangeInputSchema.safeParse([]).success).toBe(false);
  });

  it("rejects input with extra unknown keys", () => {
    const result = PasswordChangeInputSchema.safeParse({
      currentPassword: "ValidPass1234",
      newPassword: "NewSecret5678",
      confirmPassword: "NewSecret5678",
      injectedRole: "ADMIN",
    });
    expect(result.success).toBe(false);
  });

  it("accepts valid password change input", () => {
    const result = PasswordChangeInputSchema.safeParse({
      currentPassword: "ValidOldPass12",
      newPassword: "ValidNewPass34",
      confirmPassword: "ValidNewPass34",
    });
    expect(result.success).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Target 4 — public result schema enforcement
// ---------------------------------------------------------------------------
describe("public result schema enforcement adversarial", () => {
  it("PasswordChangeResultSchema rejects extra keys on success", () => {
    expect(
      PasswordChangeResultSchema.safeParse({
        ok: true,
        redirectTo: "/id/admin",
        sessionToken: "exposed-secret",
      }).success,
    ).toBe(false);
  });

  it("PasswordChangeResultSchema rejects extra keys on failure", () => {
    expect(
      PasswordChangeResultSchema.safeParse({
        ok: false,
        code: "SESSION_INVALID",
        reason: "token expired",
      }).success,
    ).toBe(false);
  });

  it("PasswordChangeResultSchema rejects unknown failure codes", () => {
    expect(
      PasswordChangeResultSchema.safeParse({
        ok: false,
        code: "INTERNAL_ERROR",
      }).success,
    ).toBe(false);
  });

  it("PasswordChangeFailureCodeSchema defines exactly four codes", () => {
    const codes = PasswordChangeFailureCodeSchema.options;
    expect(codes).toEqual([
      "SESSION_INVALID",
      "INVALID_CREDENTIALS",
      "PASSWORD_POLICY",
      "AUTH_UNAVAILABLE",
    ]);
  });

  it("PasswordChangeResultSchema rejects non-object payloads", () => {
    expect(PasswordChangeResultSchema.safeParse(null).success).toBe(false);
    expect(PasswordChangeResultSchema.safeParse("ok").success).toBe(false);
    expect(PasswordChangeResultSchema.safeParse(undefined).success).toBe(false);
  });

  it("invalid locale hints do not crash resolveAuthLocale", () => {
    expect(() => resolveAuthLocale({}, "/id/admin")).not.toThrow();
    expect(() => resolveAuthLocale([], "/id/admin")).not.toThrow();
    expect(() => resolveAuthLocale(true, "/id/admin")).not.toThrow();
    expect(resolveAuthLocale({}, "/id/admin")).toBe("id");
  });
});
