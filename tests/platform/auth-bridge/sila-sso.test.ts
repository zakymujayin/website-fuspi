import {describe, expect, it, vi} from "vitest";

import {
  createSilaSsoStart,
  finishSilaSsoCallback,
  getSilaSsoConfig,
  openSilaState,
} from "@/lib/auth/runtime/sila-sso";

const secret = "synthetic-sila-state-secret-minimum-32";
const now = Date.parse("2026-08-31T00:00:00.000Z");

const env = {
  SILA_SSO_ENABLED: "true",
  SILA_SSO_AUTHORIZATION_URL: "https://sila.example.test/oauth/authorize",
  SILA_SSO_TOKEN_URL: "https://sila.example.test/oauth/token",
  SILA_SSO_USERINFO_URL: "https://sila.example.test/oauth/userinfo",
  SILA_SSO_CLIENT_ID: "fuspi-website",
  SILA_SSO_CLIENT_SECRET: "client-secret",
  SILA_SSO_SCOPES: "openid profile email",
  SILA_SSO_EMAIL_CLAIM: "email",
  SILA_SSO_IDENTIFIER_CLAIM: "sub",
  SILA_SSO_TIMEOUT_MS: "5000",
};

function responseJson(body: unknown) {
  return Promise.resolve(new Response(JSON.stringify(body), {
    status: 200,
    headers: {"content-type": "application/json"},
  }));
}

describe("SILA SSO bridge", () => {
  it("stays disabled unless the explicit OIDC contract is configured", () => {
    expect(getSilaSsoConfig({SILA_SSO_ENABLED: "false"})).toBeNull();
    expect(getSilaSsoConfig({...env, SILA_SSO_AUTHORIZATION_URL: "http://example.test/auth"})).toBeNull();
    expect(getSilaSsoConfig(env)).toMatchObject({
      enabled: true,
      clientId: "fuspi-website",
      emailClaim: "email",
      identifierClaim: "sub",
    });
  });

  it("creates a signed PKCE authorization request with a bounded internal destination", async () => {
    const config = getSilaSsoConfig(env);
    expect(config).not.toBeNull();
    const start = await createSilaSsoStart(config!, {
      authUrl: "https://fuspi.example.test",
      locale: "ar",
      redirectTo: "/id/admin/peminjaman?status=DIAJUKAN",
      secret,
      production: true,
      now,
    });

    expect(start).not.toBeNull();
    const url = new URL(start!.authorizationUrl);
    expect(url.origin).toBe("https://sila.example.test");
    expect(url.searchParams.get("response_type")).toBe("code");
    expect(url.searchParams.get("client_id")).toBe("fuspi-website");
    expect(url.searchParams.get("redirect_uri")).toBe("https://fuspi.example.test/api/auth/sila/callback");
    expect(url.searchParams.get("code_challenge_method")).toBe("S256");
    expect(url.searchParams.get("state")).toHaveLength(43);
    expect(start!.cookie.name).toBe("__Host-fuspi.sila-sso");
    expect(start!.cookie.options.httpOnly).toBe(true);
    expect(start!.cookie.options.sameSite).toBe("lax");
    expect(start!.cookie.options.maxAge).toBe(600);

    const opened = openSilaState(start!.cookie.value, secret, now + 60_000);
    expect(opened).toMatchObject({
      locale: "ar",
      redirectTo: "/ar/admin/peminjaman?status=DIAJUKAN",
    });
    expect(openSilaState(`${start!.cookie.value}x`, secret)).toBeNull();
  });

  it("rejects callback attempts with provider errors or invalid state before any token exchange", async () => {
    const config = getSilaSsoConfig(env)!;
    const prisma = {
      user: {findUnique: vi.fn()},
      session: {create: vi.fn()},
    };
    const fetcher = vi.fn();

    await expect(finishSilaSsoCallback(config, {
      prisma: prisma as never,
      url: new URL("https://fuspi.example.test/api/auth/sila/callback?error=access_denied"),
      stateCookie: null,
      authUrl: "https://fuspi.example.test",
      secret,
      fetcher,
      now: now + 60_000,
    })).resolves.toEqual({
      ok: false,
      code: "PROVIDER_REJECTED",
      redirectTo: "/id/login?sso=PROVIDER_REJECTED&next=%2Fid%2Fadmin",
    });

    await expect(finishSilaSsoCallback(config, {
      prisma: prisma as never,
      url: new URL("https://fuspi.example.test/api/auth/sila/callback?code=abc&state=fake"),
      stateCookie: "fake",
      authUrl: "https://fuspi.example.test",
      secret,
      fetcher,
    })).resolves.toMatchObject({ok: false, code: "STATE_INVALID"});
    expect(fetcher).not.toHaveBeenCalled();
    expect(prisma.user.findUnique).not.toHaveBeenCalled();
    expect(prisma.session.create).not.toHaveBeenCalled();
  });

  it("issues a FUSPI database session only for an already-provisioned active account", async () => {
    const config = getSilaSsoConfig(env)!;
    const start = await createSilaSsoStart(config, {
      authUrl: "https://fuspi.example.test",
      locale: "id",
      redirectTo: "/id/admin",
      secret,
      production: false,
      now,
    });
    const state = openSilaState(start!.cookie.value, secret, now + 60_000)!;
    const fetcher = vi.fn()
      .mockImplementationOnce(() => responseJson({access_token: "provider-access-token"}))
      .mockImplementationOnce(() => responseJson({sub: "sila-user-1", email: "Admin@Fuspi.Example"}));
    const prisma = {
      user: {
        findUnique: vi.fn().mockResolvedValue({
          id: "fuspi-user-1",
          role: "STAF_UMUM",
          isActive: true,
          mustChangePassword: false,
        }),
      },
      session: {create: vi.fn().mockResolvedValue({})},
    };

    const result = await finishSilaSsoCallback(config, {
      prisma: prisma as never,
      url: new URL(`https://fuspi.example.test/api/auth/sila/callback?code=abc&state=${state.state}`),
      stateCookie: start!.cookie.value,
      authUrl: "https://fuspi.example.test",
      secret,
      production: false,
      fetcher,
      now: now + 60_000,
    });

    expect(result).toMatchObject({
      ok: true,
      redirectTo: "/id/admin/peminjaman",
    });
    expect(prisma.user.findUnique).toHaveBeenCalledWith({
      where: {email: "admin@fuspi.example"},
      select: {id: true, role: true, isActive: true, mustChangePassword: true},
    });
    expect(prisma.session.create).toHaveBeenCalledWith({
      data: expect.objectContaining({userId: "fuspi-user-1"}),
    });
    expect(JSON.stringify(result)).not.toContain("provider-access-token");
  });

  it("does not auto-provision an unrecognized SILA identity", async () => {
    const config = getSilaSsoConfig(env)!;
    const start = await createSilaSsoStart(config, {
      authUrl: "https://fuspi.example.test",
      locale: "en",
      redirectTo: "/id/admin",
      secret,
      now,
    });
    const state = openSilaState(start!.cookie.value, secret, now + 60_000)!;
    const fetcher = vi.fn()
      .mockImplementationOnce(() => responseJson({access_token: "provider-access-token"}))
      .mockImplementationOnce(() => responseJson({sub: "sila-user-2", email: "unknown@example.test"}));
    const prisma = {
      user: {findUnique: vi.fn().mockResolvedValue(null)},
      session: {create: vi.fn()},
    };

    await expect(finishSilaSsoCallback(config, {
      prisma: prisma as never,
      url: new URL(`https://fuspi.example.test/api/auth/sila/callback?code=abc&state=${state.state}`),
      stateCookie: start!.cookie.value,
      authUrl: "https://fuspi.example.test",
      secret,
      fetcher,
      now: now + 60_000,
    })).resolves.toEqual({
      ok: false,
      code: "UNPROVISIONED",
      redirectTo: "/en/login?sso=UNPROVISIONED&next=%2Fen%2Fadmin",
    });
    expect(prisma.session.create).not.toHaveBeenCalled();
  });
});
