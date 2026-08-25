import {readFileSync} from "node:fs";
import path from "node:path";

import {describe, expect, it} from "vitest";

describe("locale root layout hydration tolerance", () => {
  const source = readFileSync(
    path.join(process.cwd(), "src/app/[locale]/layout.tsx"),
    "utf8",
  );

  it("suppresses body-level extension attribute mismatches only at the root body", () => {
    expect(source).toContain("<body suppressHydrationWarning>");
    expect(source).not.toContain("<html suppressHydrationWarning");
  });
});
