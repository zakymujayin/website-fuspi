import {describe, expect, it} from "vitest";

import type {ActiveDatabaseSession} from "@/contracts/auth";
import {authorize} from "@/lib/auth/runtime/authorization";
import {
  createSessionCookieDefinition,
  getSessionCookieName,
} from "@/lib/auth/runtime/cookie";
import {DUMMY_BCRYPT_HASH} from "@/lib/auth/runtime/config";
import {selectCredentialComparison} from "@/lib/auth/runtime/credentials";
import {isSameOriginRequest} from "@/lib/auth/runtime/csrf";
import {
  createLoginRateLimitKey,
  getLoginWindowStart,
  getPublicFailureCodeForAttempt,
} from "@/lib/auth/runtime/rate-limit";
import {createHmacDigest} from "@/lib/security/hmac";

const actor = (role: ActiveDatabaseSession["role"]): ActiveDatabaseSession => ({
  userId: "actor-1",
  role,
  isActive: true,
  mustChangePassword: false,
  expiresAt: new Date("2030-01-01T00:00:00.000Z"),
});

describe("M2 auth runtime primitives", () => {
  it("derives stable HMAC keys without retaining raw email or IP", () => {
    const email = "synthetic-admin@example.test";
    const ip = "192.0.2.10";
    const emailSecret = "e".repeat(32);
    const ipSecret = "i".repeat(32);
    const key = createLoginRateLimitKey(email, ip, emailSecret, ipSecret);

    expect(key.keyHash).toBe(
      `${createHmacDigest(email, emailSecret)}.${createHmacDigest(ip, ipSecret)}`,
    );
    expect(key.keyHash).not.toContain(email);
    expect(key.keyHash).not.toContain(ip);
    expect(() => createHmacDigest(email, "short")).toThrow();
  });

  it("uses a fixed window and the exact fifth/sixth failure boundary", () => {
    const now = new Date("2026-07-14T03:17:31.000Z");
    expect(getLoginWindowStart(now).toISOString()).toBe("2026-07-14T03:15:00.000Z");
    expect([1, 2, 3, 4, 5].map(getPublicFailureCodeForAttempt)).toEqual(
      Array(5).fill("INVALID_CREDENTIALS"),
    );
    expect(getPublicFailureCodeForAttempt(6)).toBe("TRY_AGAIN_LATER");
  });

  it("selects exactly one real or dummy comparison target without exposing eligibility", () => {
    expect(selectCredentialComparison(null)).toEqual({
      hash: DUMMY_BCRYPT_HASH,
      eligible: false,
    });
    expect(
      selectCredentialComparison({
        id: "inactive",
        passwordHash: "real-hash",
        isActive: false,
        mustChangePassword: false,
      }),
    ).toEqual({hash: "real-hash", eligible: false});
    expect(
      selectCredentialComparison({
        id: "active",
        passwordHash: "real-hash",
        isActive: true,
        mustChangePassword: false,
      }),
    ).toEqual({hash: "real-hash", eligible: true});
  });

  it("freezes an opaque eight-hour cookie contract for dev and production", () => {
    const expires = new Date("2026-07-14T11:00:00.000Z");
    const production = createSessionCookieDefinition("opaque-value", expires, true);
    expect(production).toMatchObject({
      name: "__Secure-authjs.session-token",
      options: {
        httpOnly: true,
        secure: true,
        sameSite: "lax",
        path: "/",
        maxAge: 28_800,
      },
    });
    expect(getSessionCookieName(false)).toBe("authjs.session-token");
  });

  it("rejects missing, malformed, and cross-origin mutation requests", () => {
    expect(isSameOriginRequest(new Headers(), "https://fuspi.example.test")).toBe(false);
    expect(
      isSameOriginRequest(
        new Headers({origin: "https://attacker.example.test"}),
        "https://fuspi.example.test",
      ),
    ).toBe(false);
    expect(
      isSameOriginRequest(
        new Headers({origin: "https://fuspi.example.test"}),
        "https://fuspi.example.test/login",
      ),
    ).toBe(true);
  });

  it("enforces ownership, ticket scopes, PPKS isolation, and default deny", () => {
    expect(
      authorize(
        {actor: actor("EDITOR"), resourceOwnerId: "actor-1"},
        "UPDATE",
        "POST",
      ),
    ).toEqual({allowed: true, dataScope: "ALL"});
    expect(
      authorize(
        {actor: actor("EDITOR"), resourceOwnerId: "someone-else"},
        "UPDATE",
        "POST",
      ).allowed,
    ).toBe(false);
    expect(
      authorize(
        {actor: actor("ADMIN"), ticketScope: "NON_PPKS"},
        "VIEW",
        "TICKET",
      ),
    ).toEqual({allowed: true, dataScope: "NON_PPKS"});
    expect(authorize({actor: actor("ADMIN")}, "VIEW", "TICKET").allowed).toBe(false);
    expect(
      authorize(
        {actor: actor("SATGAS_PPKS"), ticketScope: "PPKS_DETAIL"},
        "VIEW",
        "PPKS_TICKET",
      ),
    ).toEqual({allowed: true, dataScope: "PPKS_DETAIL"});
    expect(
      authorize(
        {actor: actor("ADMIN"), ticketScope: "PPKS_DETAIL"},
        "VIEW",
        "PPKS_TICKET",
      ).allowed,
    ).toBe(false);
    expect(authorize({}, "VIEW", "POST").allowed).toBe(false);
  });
});
