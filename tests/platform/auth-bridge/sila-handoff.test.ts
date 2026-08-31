import {describe, expect, it} from "vitest";

import {
  createSilaHandoffToken,
  createSilaHandoffUrl,
  getSilaHandoffConfig,
  normalizeSilaNextPath,
  verifySilaHandoffToken,
} from "@/lib/auth/runtime/sila-handoff";

const env = {
  SILA_HANDOFF_ENABLED: "true",
  SILA_HANDOFF_URL: "https://sila.example.test/api/auth/fuspi/callback",
  NEXT_PUBLIC_SILA_URL: "https://sila.example.test/dashboard",
  SILA_HANDOFF_SHARED_SECRET: "synthetic-fuspi-to-sila-shared-secret-32",
  SILA_HANDOFF_ISSUER: "fuspi-web",
  SILA_HANDOFF_AUDIENCE: "sila",
  SILA_HANDOFF_TTL_SECONDS: "60",
};

const activeUser = {
  id: "fuspi-user-1",
  email: "Dosen@Fuspi.Example",
  name: "Dosen FUSPI",
  role: "DOSEN" as const,
  isActive: true,
};

describe("FUSPI to SILA handoff", () => {
  it("is disabled unless the explicit reverse handoff env is configured", () => {
    expect(getSilaHandoffConfig({SILA_HANDOFF_ENABLED: "false"})).toBeNull();
    expect(getSilaHandoffConfig({...env, SILA_HANDOFF_SHARED_SECRET: "short"})).toBeNull();
    expect(getSilaHandoffConfig({...env, SILA_HANDOFF_URL: "http://example.test/callback"})).toBeNull();
    expect(getSilaHandoffConfig(env)).toMatchObject({
      enabled: true,
      endpointUrl: "https://sila.example.test/api/auth/fuspi/callback",
      fallbackUrl: "https://sila.example.test/dashboard",
      ttlSeconds: 60,
    });
  });

  it("creates a short-lived signed token that SILA can verify without a password", () => {
    const config = getSilaHandoffConfig(env)!;
    const token = createSilaHandoffToken(config, activeUser, 1_788_155_538);
    expect(token).toEqual(expect.any(String));

    const payload = verifySilaHandoffToken(token!, config, 1_788_155_539);
    expect(payload).toMatchObject({
      iss: "fuspi-web",
      aud: "sila",
      sub: "fuspi-user-1",
      email: "dosen@fuspi.example",
      name: "Dosen FUSPI",
      role: "DOSEN",
      iat: 1_788_155_538,
      exp: 1_788_155_598,
    });
    expect(JSON.stringify(payload)).not.toContain("password");
  });

  it("rejects tampered, expired, inactive, and disallowed-role handoffs", () => {
    const config = getSilaHandoffConfig(env)!;
    const token = createSilaHandoffToken(config, activeUser, 1_788_155_538)!;
    expect(verifySilaHandoffToken(`${token}x`, config, 1_788_155_539)).toBeNull();
    expect(verifySilaHandoffToken(token, config, 1_788_155_599)).toBeNull();
    expect(createSilaHandoffToken(config, {...activeUser, isActive: false}, 1_788_155_538)).toBeNull();
    expect(createSilaHandoffToken(config, {...activeUser, role: "EDITOR"}, 1_788_155_538)).toBeNull();
  });

  it("builds the SILA callback URL and keeps next as a SILA-internal path", () => {
    const config = getSilaHandoffConfig(env)!;
    const token = createSilaHandoffToken(config, activeUser, 1_788_155_538)!;
    const url = new URL(createSilaHandoffUrl(config, token, "/dashboard?tab=layanan"));
    expect(url.origin).toBe("https://sila.example.test");
    expect(url.pathname).toBe("/api/auth/fuspi/callback");
    expect(url.searchParams.get("token")).toBe(token);
    expect(url.searchParams.get("next")).toBe("/dashboard?tab=layanan");
  });

  it.each([
    "https://attacker.example.test/",
    "//attacker.example.test/",
    "/%2f%2fattacker.example.test/",
    "/api/auth/session",
    "/dashboard\\evil",
    "",
    undefined,
  ])("normalizes hostile SILA next path to dashboard: %s", (candidate) => {
    expect(normalizeSilaNextPath(candidate)).toBe("/dashboard");
  });
});
