import {readFileSync} from "node:fs";
import path from "node:path";

import {describe, expect, it} from "vitest";

function source(relativePath: string) {
  return readFileSync(path.join(process.cwd(), relativePath), "utf8");
}

describe("public forms and media surfaces", () => {
  it("gives each public submission form a clear card surface", () => {
    for (const relativePath of [
      "src/components/public/complaint/complaint-submit-form.tsx",
      "src/components/public/ppks/ppks-report-form.tsx",
      "src/components/public/booking/booking-request-form.tsx",
    ]) {
      expect(source(relativePath)).toContain("rounded-2xl border border-slate-200 border-t-4 border-t-royal-500 bg-white");
    }
  });

  it("makes public file selection surfaces visibly browseable", () => {
    expect(source("src/components/public/ppks/ppks-report-form.tsx")).toContain("border-2 border-dashed border-royal-200");
    expect(source("src/components/public/booking/booking-request-form.tsx")).toContain("file:bg-royal-500");
  });

  it("uses the same card language across admin media and homepage media picker", () => {
    expect(source("src/app/[locale]/admin/media/page.tsx")).toContain("border-s-royal-500 bg-white");
    expect(source("src/components/admin/media/media-upload.tsx")).toContain("file:bg-royal-500");
    expect(source("src/components/admin/home-nav/home-media-picker.tsx")).toContain("rounded-2xl border-2 border-royal-100");
  });
});
