import {readFileSync} from "node:fs";
import path from "node:path";

import {describe, expect, it} from "vitest";

function source(relativePath: string) {
  return readFileSync(path.join(process.cwd(), relativePath), "utf8");
}

describe("header LCP image loading", () => {
  it("supports an explicit loading mode in the fallback image wrapper", () => {
    const image = source("src/components/public/image-with-fallback.tsx");
    expect(image).toContain('loading?: "eager" | "lazy"');
    expect(image).toContain("loading={loading}");
  });

  it("loads configured header identity logos eagerly", () => {
    const badges = source("src/components/public/identity-badges.tsx");
    expect(badges).toContain('loading="eager"');
    expect(badges).not.toContain("priority = false");
  });
});
