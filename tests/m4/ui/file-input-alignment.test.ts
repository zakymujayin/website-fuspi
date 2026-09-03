import {readFileSync} from "node:fs";
import path from "node:path";

import {describe, expect, it} from "vitest";

function source(relativePath: string) {
  return readFileSync(path.join(process.cwd(), relativePath), "utf8");
}

describe("native file-picker alignment", () => {
  it("keeps every visible file input on the shared browse-button geometry", () => {
    for (const relativePath of [
      "src/components/public/ppks/ppks-report-form.tsx",
      "src/components/public/booking/booking-request-form.tsx",
      "src/components/admin/media/media-picker-upload-panel.tsx",
      "src/components/admin/media/media-upload.tsx",
      "src/components/admin/academic/program-certificate-picker.tsx",
      "src/components/admin/lecturer-import/lecturer-import-form.tsx",
    ]) {
      const content = source(relativePath);
      expect(content, relativePath).toContain("file:h-8 file:min-h-8");
      expect(content, relativePath).toContain("file:items-center file:align-middle");
      expect(content, relativePath).toContain("file:leading-5");
    }
  });

  it("keeps the portal upload input hidden behind its custom button", () => {
    expect(source("src/components/portal/profile-form.tsx")).toContain('className="sr-only"');
  });
});
