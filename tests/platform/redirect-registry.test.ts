import {describe, expect, it} from "vitest";

import {
  RedirectDestinationPathSchema,
  RedirectSourcePathSchema,
} from "@/contracts/operations";
import {validateRedirectGraph} from "@/lib/redirect/registry";

describe("redirect registry safety contract", () => {
  it.each([
    "https://attacker.example/path",
    "//attacker.example/path",
    "legacy/no-leading-slash",
    "/legacy?next=/id",
    "/legacy#fragment",
    "/legacy\\path",
    "/legacy//path",
    "/legacy/../admin",
    "/legacy/%2e%2e/admin",
    "/legacy/%2Fadmin",
    "/legacy/%5cadmin",
    "/api/private",
    "/_next/static/chunk.js",
  ])("rejects unsafe source path %s", (path) => {
    expect(RedirectSourcePathSchema.safeParse(path).success).toBe(false);
  });

  it.each([
    "/berita/final",
    "/fr/final",
    "https://fuspi.example/id/final",
    "/id/final?source=legacy",
    "/id/../admin",
  ])("rejects a non-final destination %s", (path) => {
    expect(RedirectDestinationPathSchema.safeParse(path).success).toBe(false);
  });

  it("accepts local legacy sources and ID/EN/AR final destinations", () => {
    expect(RedirectSourcePathSchema.parse("/2020/berita-lama/")).toBe("/2020/berita-lama/");
    expect(RedirectDestinationPathSchema.parse("/id/berita/berita-baru"))
      .toBe("/id/berita/berita-baru");
    expect(RedirectDestinationPathSchema.parse("/ar")).toBe("/ar");
  });

  it("distinguishes direct equality, loops, and chains", () => {
    expect(validateRedirectGraph([{sourcePath: "/id/a", destinationPath: "/id/a"}]))
      .toEqual({ok: false, code: "SOURCE_EQUALS_DESTINATION"});
    expect(validateRedirectGraph([
      {sourcePath: "/id/a", destinationPath: "/id/b"},
      {sourcePath: "/id/b", destinationPath: "/id/a"},
    ])).toEqual({ok: false, code: "REDIRECT_LOOP"});
    expect(validateRedirectGraph([
      {sourcePath: "/old", destinationPath: "/id/intermediate"},
      {sourcePath: "/id/intermediate", destinationPath: "/id/final"},
    ])).toEqual({ok: false, code: "REDIRECT_CHAIN"});
    expect(validateRedirectGraph([
      {sourcePath: "/old-a", destinationPath: "/id/final-a"},
      {sourcePath: "/old-b", destinationPath: "/id/final-b"},
    ])).toEqual({ok: true});
  });
});
