import {describe, expect, it} from "vitest";

import {isSameOriginRequest} from "@/lib/auth/runtime/csrf";

const CONFIGURED = "https://fuspi.uinbanten.ac.id";

describe("M2 auth CSRF adversarial", () => {
  it("rejects a request with no Origin header", () => {
    expect(isSameOriginRequest(new Headers(), CONFIGURED)).toBe(false);
  });

  it("rejects a request with an empty Origin header", () => {
    expect(
      isSameOriginRequest(new Headers({origin: ""}), CONFIGURED),
    ).toBe(false);
  });

  it("rejects a request with a malformed Origin header", () => {
    expect(
      isSameOriginRequest(new Headers({origin: "not-a-url!!"}), CONFIGURED),
    ).toBe(false);
  });

  it("rejects a request from a different origin", () => {
    expect(
      isSameOriginRequest(
        new Headers({origin: "https://attacker.example.test"}),
        CONFIGURED,
      ),
    ).toBe(false);
    expect(
      isSameOriginRequest(
        new Headers({origin: "https://fuspi.example.test"}),
        CONFIGURED,
      ),
    ).toBe(false);
  });

  it("rejects a request from a subdomain of the configured origin", () => {
    expect(
      isSameOriginRequest(
        new Headers({origin: "https://admin.fuspi.uinbanten.ac.id"}),
        CONFIGURED,
      ),
    ).toBe(false);
  });

  it("rejects a request with a different scheme (HTTP vs HTTPS)", () => {
    expect(
      isSameOriginRequest(
        new Headers({origin: "http://fuspi.uinbanten.ac.id"}),
        CONFIGURED,
      ),
    ).toBe(false);
    expect(
      isSameOriginRequest(
        new Headers({origin: "https://fuspi.uinbanten.ac.id"}),
        "http://fuspi.uinbanten.ac.id",
      ),
    ).toBe(false);
  });

  it("rejects a request with a different port", () => {
    expect(
      isSameOriginRequest(
        new Headers({origin: "https://fuspi.uinbanten.ac.id:3000"}),
        CONFIGURED,
      ),
    ).toBe(false);
    expect(
      isSameOriginRequest(
        new Headers({origin: "https://fuspi.uinbanten.ac.id"}),
        "https://fuspi.uinbanten.ac.id:3000",
      ),
    ).toBe(false);
  });

  it("accepts default-port normalization (https://host:443 equals https://host)", () => {
    expect(
      isSameOriginRequest(
        new Headers({origin: "https://fuspi.uinbanten.ac.id:443"}),
        CONFIGURED,
      ),
    ).toBe(true);
    expect(
      isSameOriginRequest(
        new Headers({origin: "https://fuspi.uinbanten.ac.id"}),
        "https://fuspi.uinbanten.ac.id:443",
      ),
    ).toBe(true);
  });

  it("rejects when AUTH_URL is not configured", () => {
    expect(
      isSameOriginRequest(
        new Headers({origin: CONFIGURED}),
        undefined,
      ),
    ).toBe(false);
    expect(
      isSameOriginRequest(
        new Headers({origin: CONFIGURED}),
        "",
      ),
    ).toBe(false);
  });

  it("accepts a request from the exact same origin", () => {
    expect(
      isSameOriginRequest(
        new Headers({origin: CONFIGURED}),
        CONFIGURED,
      ),
    ).toBe(true);
    expect(
      isSameOriginRequest(
        new Headers({origin: CONFIGURED}),
        `${CONFIGURED}/login`,
      ),
    ).toBe(true);
  });

  it("rejects a request with a null Origin header", () => {
    const headers = new Headers();
    (headers as unknown as Record<string, string>).origin = "null";
    expect(isSameOriginRequest(headers, CONFIGURED)).toBe(false);
  });
});
